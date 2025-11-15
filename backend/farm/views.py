from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import models
from .models import Fazenda, Cultivo, Cultivar
from .serializers import FazendaSerializer, CultivoSerializer, CultivarSerializer
from .permissions import IsProdutor, IsOwnerOrReadOnly
from datetime import date, timedelta

class FazendaViewSet(ModelViewSet):
    queryset = Fazenda.objects.all()
    serializer_class = FazendaSerializer
    permission_classes = [IsAuthenticated, IsProdutor, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Fazenda.objects.filter(produtor=self.request.user).order_by('-criado_em')

    def perform_create(self, serializer):
        serializer.save(produtor=self.request.user)

class CultivoViewSet(ModelViewSet):
    queryset = Cultivo.objects.all()
    serializer_class = CultivoSerializer
    permission_classes = [IsAuthenticated, IsProdutor]

    def get_queryset(self):
        return Cultivo.objects.filter(fazenda__produtor=self.request.user).order_by('-criado_em')

class ProdutorDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsProdutor]

    def get(self, request):
        user = request.user
        fazendas_qs = Fazenda.objects.filter(produtor=user)
        cultivos_qs = Cultivo.objects.filter(fazenda__produtor=user)

        hoje = date.today()
        d30 = hoje + timedelta(days=30)
        d60 = hoje + timedelta(days=60)
        d90 = hoje + timedelta(days=90)

        ativos_qs = cultivos_qs.filter(models.Q(data_prevista_colheita__isnull=True) | models.Q(data_prevista_colheita__gte=hoje))
        prev_30 = cultivos_qs.filter(data_prevista_colheita__gte=hoje, data_prevista_colheita__lte=d30).count()
        prev_60 = cultivos_qs.filter(data_prevista_colheita__gt=d30, data_prevista_colheita__lte=d60).count()
        prev_90 = cultivos_qs.filter(data_prevista_colheita__gt=d60, data_prevista_colheita__lte=d90).count()

        area_por_cultura = (
            cultivos_qs.values('cultura')
            .order_by()
            .annotate(total_area=models.Sum('area_ha'))
        )
        labels_area = [row['cultura'] or '' for row in area_por_cultura]
        values_area = [float(row['total_area'] or 0) for row in area_por_cultura]

        meses = {}
        for c in cultivos_qs.exclude(data_prevista_colheita__isnull=True):
            dt = c.data_prevista_colheita
            key = f"{dt.year}-{dt.month:02d}"
            meses[key] = meses.get(key, 0) + 1
        evolucao_x = sorted(meses.keys())
        evolucao_y = [meses[k] for k in evolucao_x]

        estoque_por_cultivo_labels = []
        estoque_por_cultivo_values = []

        data = {
            'fazendas_total': fazendas_qs.count(),
            'cultivos_total': cultivos_qs.count(),
            'cultivos_ativos': ativos_qs.count(),
            'estoque_total_kg': 0,
            'ofertas_publicadas': 0,
            'previsao_colheita': {
                'dias_30': prev_30,
                'dias_60': prev_60,
                'dias_90': prev_90,
            },
            'charts': {
                'evolucao_producao_mensal': { 'x': evolucao_x, 'y': evolucao_y },
                'area_por_cultura': { 'labels': labels_area, 'values': values_area },
                'estoque_por_cultivo': { 'x': estoque_por_cultivo_labels, 'y': estoque_por_cultivo_values },
            }
        }
        return Response(data, status=status.HTTP_200_OK)

class CultivarViewSet(ModelViewSet):
    queryset = Cultivar.objects.all()
    serializer_class = CultivarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Cultivar.objects.all().order_by('cultura','variedade')
        cultura = self.request.query_params.get('cultura')
        if cultura:
            qs = qs.filter(cultura__iexact=cultura)
        return qs
