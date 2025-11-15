import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function Carrinho() {
  const navigate = useNavigate();
  const { items, remove, updateQty, clear } = useCart();

  const total = items.reduce((acc, it) => acc + it.quantidade * it.preco, 0);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar a compra.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pedido realizado com sucesso!",
      description: "Você receberá um email com os detalhes da compra.",
    });
    clear();
    navigate("/cliente/marketplace");
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    if (confirm("Deseja realmente limpar todo o carrinho?")) {
      clear();
      toast({ title: "Carrinho limpo", description: "Todos os itens foram removidos." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/cliente/marketplace")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Carrinho de Compras</h1>
                <p className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? "item" : "itens"}
                </p>
              </div>
            </div>
            {items.length > 0 && (
              <Button variant="destructive" onClick={handleClearCart}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Carrinho
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mb-6">Adicione produtos ao carrinho para continuar</p>
            <Button onClick={() => navigate("/cliente/marketplace")}>Ir para o Marketplace</Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.ofertaId}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{item.nome}</h3>
                          <Button variant="ghost" size="icon" onClick={() => remove(item.ofertaId)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" onClick={() => updateQty(item.ofertaId, Math.max(1, item.quantidade - 1))} disabled={item.quantidade <= 1}>
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-medium w-12 text-center">{item.quantidade}</span>
                            <Button variant="outline" size="icon" onClick={() => updateQty(item.ofertaId, item.quantidade + 1)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Preço unitário</p>
                            <p className="text-sm">R$ {item.preco.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-xl font-bold text-primary">R$ {(item.quantidade * item.preco).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>Cliente Exemplo</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span>Rua Exemplo, 123 - São Paulo, SP</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.ofertaId} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.nome} ({item.quantidade}x)</span>
                        <span>R$ {(item.quantidade * item.preco).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="font-bold text-2xl text-primary">R$ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleCheckout} className="w-full" size="lg">Finalizar Compra</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

