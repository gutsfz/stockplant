from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date, timedelta
from accounts.models import UserRole
from farm.models import Fazenda, Cultivo, Cultivar

class Command(BaseCommand):
    help = 'Cria dados de teste para fazendas e cultivos'

    def handle(self, *args, **kwargs):
        produtor, created = User.objects.get_or_create(username='produtor_test', defaults={'email': 'produtor@test.com'})
        if created:
            produtor.set_password('Test123!')
            produtor.save()
        UserRole.objects.update_or_create(user=produtor, defaults={'role': 'PRODUTOR'})

        fazenda1, _ = Fazenda.objects.get_or_create(
            produtor=produtor,
            nome='Fazenda Primavera',
            defaults={
                'cep': '13000-000',
                'cidade': 'Campinas',
                'estado': 'SP',
                'areatotal': Decimal('100.00'),
                'areacultivada': Decimal('60.00'),
                'latitude': Decimal('-22.9056'),
                'longitude': Decimal('-47.0608'),
            }
        )
        fazenda2, _ = Fazenda.objects.get_or_create(
            produtor=produtor,
            nome='Fazenda Verão',
            defaults={
                'cep': '80000-000',
                'cidade': 'Curitiba',
                'estado': 'PR',
                'areatotal': Decimal('150.00'),
                'areacultivada': Decimal('90.00'),
                'latitude': Decimal('-25.4284'),
                'longitude': Decimal('-49.2733'),
            }
        )

        Cultivo.objects.update_or_create(
            fazenda=fazenda1,
            cultura='soja',
            variedade='BRS 1001',
            data_plantio=date(2024, 1, 15),
            defaults={
                'area_ha': Decimal('50.00'),
                'data_prevista_colheita': date(2024, 6, 15),
                'safra': '2023/2024',
                'sacas_por_ha': Decimal('60.00'),
                'kg_por_saca': Decimal('60.00'),
            }
        )

        Cultivo.objects.update_or_create(
            fazenda=fazenda2,
            cultura='milho',
            variedade='AG 1051',
            data_plantio=date(2024, 2, 20),
            defaults={
                'area_ha': Decimal('75.00'),
                'data_prevista_colheita': date(2024, 7, 20),
                'safra': '2023/2024',
                'sacas_por_ha': Decimal('80.00'),
                'kg_por_saca': Decimal('60.00'),
            }
        )

        # Limpa cultivos do produtor e recria histórico
        Cultivo.objects.filter(fazenda__produtor=produtor).delete()

        # Safras desejadas
        safras = ['22/22', '22/23', '23/23', '23/24', '24/24', '24/25', '25/25', '25/26']

        def max_area_faz(f: Fazenda) -> Decimal:
            return (f.areacultivada or f.areatotal or Decimal('0'))

        # Inicializa orçamento de área por fazenda e safra
        budgets = {
            fazenda1.id: {s: max_area_faz(fazenda1) for s in safras},
            fazenda2.id: {s: max_area_faz(fazenda2) for s in safras},
        }

        # Funções auxiliares para criar datas a partir das safras
        def parse_safra_ano_inicial(s: str) -> int:
            try:
                a, b = s.split('/')
                return 2000 + int(a)
            except Exception:
                return date.today().year

        meses_verao = [11, 12, 1]
        meses_inverno = [6, 7, 8]

        def pick_variedade(cultura_nome: str, idx: int) -> str:
            qs = Cultivar.objects.filter(cultura__iexact=cultura_nome).order_by('id')
            if qs.exists():
                v = qs[idx % qs.count()].variedade
                return v
            return f"{cultura_nome}"

        def create_cultivo_controlado(faz: Fazenda, safra: str, cultura: str, variedade_prefix: str, idx: int, is_verao: bool):
            remaining = budgets[faz.id][safra]
            if remaining <= Decimal('0'):
                return False
            area = Decimal(str(1 + (idx % 4)))  # 1 a 4 ha
            if area > remaining:
                area = remaining
            ano_base = parse_safra_ano_inicial(safra)
            meses = meses_verao if is_verao else meses_inverno
            m = meses[idx % len(meses)]
            ano_plantio = ano_base if m >= 7 else (ano_base + 1)
            dia = (idx % 28) + 1
            dp = date(ano_plantio, m, dia)
            dc = dp + timedelta(days=120 if is_verao else 135)
            Cultivo.objects.create(
                fazenda=faz,
                cultura=cultura,
                variedade=pick_variedade(cultura, idx),
                area_ha=area,
                data_plantio=dp,
                data_prevista_colheita=dc,
                safra=safra,
                sacas_por_ha=Decimal(str(50 + (idx % 20))),
                kg_por_saca=Decimal('60.00'),
            )
            budgets[faz.id][safra] -= area
            return True

        # Para cada safra, decide culturas conforme regra e cria registros
        for si, s in enumerate(safras):
            a, b = s.split('/')
            is_igual = a == b
            if is_igual:
                culturas = ['Cevada', 'Trigo']
                is_verao = False
            else:
                culturas = ['Soja', 'Milho']
                is_verao = True
            idx = 0
            for faz in (fazenda1, fazenda2):
                for cultura in culturas:
                    # cria 2 registros por cultura/fazenda/safra, respeitando orçamento
                    for k in range(2):
                        created = create_cultivo_controlado(faz, s, cultura, 'SAF', idx, is_verao)
                        idx += 1
                        if not created:
                            break

        total_verao = Cultivo.objects.filter(fazenda__produtor=produtor, cultura__in=['Soja','Milho']).count()
        total_inverno = Cultivo.objects.filter(fazenda__produtor=produtor, cultura__in=['Trigo','Cevada']).count()

        self.stdout.write(self.style.SUCCESS(f'Verão (soja/milho): {total_verao}'))
        self.stdout.write(self.style.SUCCESS(f'Inverno (trigo/cevada/centeio): {total_inverno}'))
        self.stdout.write(self.style.SUCCESS('Seeds de fazendas e cultivos criados com sucesso'))

        lista_cultivares = [
            ('Milho','NEX 5566PW'),('Milho','BX710'),('Milho','L14141G'),('Milho','S356'),('Milho','FS670PWU'),('Milho','C8EB20'),('Milho','D9EB47'),('Milho','MTTTE184'),('Milho','MTTTG254'),('Milho','MTYYF558'),('Milho','MTYYF638'),
            ('Soja','5855RSF IPRO'),('Soja','L60177 IPRO'),('Soja','6970RSF IPRO'),('Soja','9086RSF IPRO'),('Soja','53I54RSF IPRO'),('Soja','SBK247027'),('Soja','SBQ247005'),('Soja','C2775E'),
            ('Trigo','BRS 254'),('Trigo','BRS 264'),('Trigo','ORS LAMPIÃO'),
            ('Cevada','Erecta'),('Cevada','Iapar 39 (Acumaí)'),
        ]
        for cultura, variedade in lista_cultivares:
            Cultivar.objects.get_or_create(cultura=cultura, variedade=variedade)
        self.stdout.write(self.style.SUCCESS('Cultivares padrão populados'))