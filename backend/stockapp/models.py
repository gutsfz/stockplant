from django.db import models
from farm.models import Cultivo


class StockEntry(models.Model):
    cultivo = models.ForeignKey(Cultivo, on_delete=models.CASCADE, related_name="stock_entries")
    quantidade_kg = models.DecimalField(max_digits=14, decimal_places=2)
    tipo = models.CharField(max_length=20)
    observacao = models.CharField(max_length=255, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em", "-id"]

    def __str__(self):
        return f"{self.cultivo_id} {self.tipo} {self.quantidade_kg}kg"

# Create your models here.
