from datetime import date
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from farm.permissions import IsProdutor
from farm.models import Cultivo
from .models import StockEntry
from .serializers import StockEntrySerializer


class EstoqueResumoView(APIView):
    permission_classes = [IsAuthenticated, IsProdutor]

    def get(self, request):
        user = request.user
        qs = StockEntry.objects.filter(cultivo__fazenda__produtor=user).select_related('cultivo')
        entradas = StockEntrySerializer(qs, many=True).data
        saldo = Decimal('0')
        for e in qs:
            try:
                saldo += Decimal(e.quantidade_kg or 0)
            except Exception:
                pass
        return Response({
            'saldo_total_kg': float(saldo),
            'entradas': entradas,
        }, status=status.HTTP_200_OK)


class EntradaEstoqueView(APIView):
    permission_classes = [IsAuthenticated, IsProdutor]

    def post(self, request):
        try:
            cultivo_id = int(request.data.get('cultivo_id'))
            quantidade_kg = Decimal(str(request.data.get('quantidade_kg')))
            tipo = (request.data.get('tipo') or '').strip().lower()
            observacao = (request.data.get('observacao') or '').strip()
        except Exception:
            return Response({'detail': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)

        if quantidade_kg <= 0:
            return Response({'detail': 'Quantidade deve ser positiva'}, status=status.HTTP_400_BAD_REQUEST)
        if tipo not in ('colheita','ajuste'):
            return Response({'detail': 'Tipo inválido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cultivo = Cultivo.objects.select_related('fazenda').get(pk=cultivo_id, fazenda__produtor=request.user)
        except Cultivo.DoesNotExist:
            return Response({'detail': 'Cultivo não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if tipo == 'colheita':
            dt = cultivo.data_prevista_colheita
            if not dt or dt > date.today():
                return Response({'detail': 'Cultivo não está colhido'}, status=status.HTTP_400_BAD_REQUEST)

        entry = StockEntry.objects.create(
            cultivo=cultivo,
            quantidade_kg=quantidade_kg,
            tipo=tipo,
            observacao=observacao,
        )
        data = StockEntrySerializer(entry).data
        return Response(data, status=status.HTTP_201_CREATED)
