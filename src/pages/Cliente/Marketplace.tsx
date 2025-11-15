import { useState } from "react";
import { ShoppingCart, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listPublicOfertas, type OfertaPublica } from "@/services/api/marketplace";

 

export default function Marketplace() {
  const navigate = useNavigate();
  const { items, add } = useCart();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: ofertas = [], isLoading } = useQuery<OfertaPublica[]>({
    queryKey: ["public_ofertas", searchTerm],
    queryFn: () => listPublicOfertas(searchTerm ? { q: searchTerm } : undefined),
    refetchOnWindowFocus: false,
  });

  const itemCount = items.reduce((acc, it) => acc + it.quantidade, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">StockPlant</h1>
              <p className="text-sm text-muted-foreground">Marketplace Agrícola</p>
            </div>
            <Button onClick={() => navigate("/cliente/carrinho")} variant="outline" className="relative">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Carrinho
              {itemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground">{itemCount}</Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar ofertas (cultura, origem...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading && (
          <Card className="p-4"><div className="text-muted-foreground">Carregando ofertas...</div></Card>
        )}

        {!isLoading && ofertas.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma oferta encontrada</h3>
            <p className="text-muted-foreground">Ajuste sua busca para encontrar ofertas</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ofertas.map((o) => (
            <Card key={o.id} className="p-4">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {o.cultura}{o.variedade ? ` • ${o.variedade}` : ""}
                  </div>
                  <div className="text-sm text-muted-foreground">{o.origem ?? ""}</div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Preço</div>
                    <div className="text-xl font-semibold">R$ {o.preco_kg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Disponível</div>
                    <div className="text-xl font-semibold">{o.quantidade_kg.toLocaleString()} kg</div>
                  </div>
                </div>
                <Button onClick={() => add({ ofertaId: o.id, nome: o.cultura, quantidade: 1, preco: o.preco_kg })} className="w-full">
                  Adicionar ao carrinho
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

