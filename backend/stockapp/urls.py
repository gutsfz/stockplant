from django.urls import path
from .views import EstoqueResumoView, EntradaEstoqueView

urlpatterns = [
    path('estoque/', EstoqueResumoView.as_view()),
    path('estoque/entrada/', EntradaEstoqueView.as_view()),
]