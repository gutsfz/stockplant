from rest_framework import serializers
from decimal import Decimal
from django.db.models import Sum
from .models import Fazenda, Cultivo, Cultivar

class FazendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fazenda
        fields = [
            'id','nome','cep','cidade','estado','areatotal','areacultivada','latitude','longitude','criado_em'
        ]

class CultivoSerializer(serializers.ModelSerializer):
    def validate(self, data):
        fazenda = data.get('fazenda') or getattr(self.instance, 'fazenda', None)
        area = data.get('area_ha') if 'area_ha' in data else getattr(self.instance, 'area_ha', None)
        safra = data.get('safra') if 'safra' in data else getattr(self.instance, 'safra', None)
        if not fazenda or area is None:
            return data
        max_area = fazenda.areacultivada or fazenda.areatotal
        if max_area is not None:
            if area > max_area:
                raise serializers.ValidationError('Área do cultivo não pode exceder a área da fazenda')
            qs = Cultivo.objects.filter(fazenda=fazenda)
            if safra:
                qs = qs.filter(safra=safra)
            if self.instance and getattr(self.instance, 'pk', None):
                qs = qs.exclude(pk=self.instance.pk)
            total = qs.aggregate(s=Sum('area_ha'))['s'] or Decimal('0')
            if area + total > max_area:
                raise serializers.ValidationError('Área plantada na safra não pode exceder a área disponível da fazenda')
        return data

    class Meta:
        model = Cultivo
        fields = [
            'id','fazenda','cultura','variedade','area_ha','data_plantio','data_prevista_colheita','safra','sacas_por_ha','kg_por_saca','criado_em'
        ]

class CultivarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cultivar
        fields = ['id','cultura','variedade','criado_em']

