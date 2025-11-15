from rest_framework import serializers
from .models import StockEntry


class StockEntrySerializer(serializers.ModelSerializer):
    cultivo_id = serializers.IntegerField(source='cultivo.id', read_only=True)
    cultivo_nome = serializers.SerializerMethodField()

    def get_cultivo_nome(self, obj):
        return f"{obj.cultivo.cultura} {obj.cultivo.variedade}".strip()

    class Meta:
        model = StockEntry
        fields = ['id','cultivo_id','cultivo_nome','quantidade_kg','tipo','observacao','criado_em']