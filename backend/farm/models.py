from django.db import models
from django.contrib.auth.models import User

class Fazenda(models.Model):
    produtor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fazendas")
    nome = models.CharField(max_length=255)
    cep = models.CharField(max_length=20, blank=True)
    cidade = models.CharField(max_length=255, blank=True)
    estado = models.CharField(max_length=10, blank=True)
    areatotal = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    areacultivada = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

class Cultivo(models.Model):
    fazenda = models.ForeignKey(Fazenda, on_delete=models.CASCADE, related_name="cultivos")
    cultura = models.CharField(max_length=100)
    variedade = models.CharField(max_length=100, blank=True)
    area_ha = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    data_plantio = models.DateField(null=True, blank=True)
    data_prevista_colheita = models.DateField(null=True, blank=True)
    safra = models.CharField(max_length=20, blank=True)
    sacas_por_ha = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    kg_por_saca = models.DecimalField(max_digits=6, decimal_places=2, default=60)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.cultura} - {self.variedade}"

class Cultivar(models.Model):
    cultura = models.CharField(max_length=100)
    variedade = models.CharField(max_length=100)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("cultura", "variedade")

    def __str__(self):
        return f"{self.cultura} - {self.variedade}"
