from rest_framework.routers import DefaultRouter
from .views import FazendaViewSet, CultivoViewSet, CultivarViewSet

router = DefaultRouter()
router.register(r'fazendas', FazendaViewSet, basename='fazenda')
router.register(r'cultivos', CultivoViewSet, basename='cultivo')
router.register(r'cultivares', CultivarViewSet, basename='cultivar')

urlpatterns = router.urls

