import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { listPublicOfertas, type OfertaPublica } from "@/services/api/marketplace";

type Oferta = OfertaPublica;

export default function OfertasLanding() {
  const [busca, setBusca] = useState("");
  const [cultura, setCultura] = useState<string>("");
  const [ordenar, setOrdenar] = useState<"preco" | "quantidade">("preco");

  const { data: ofertasApi, isLoading } = useQuery<Oferta[]>({
    queryKey: ["public_ofertas", cultura, busca, ordenar],
    queryFn: () => listPublicOfertas({ cultura: cultura || undefined, q: busca || undefined, ordenar }),
    refetchOnWindowFocus: false,
  });
  const culturas = useMemo(() => Array.from(new Set((ofertasApi || []).map((o) => o.cultura))), [ofertasApi]);
  const ofertas = useMemo(() => {
    let rows = (ofertasApi || []).filter((o) => {
      const okCultura = cultura ? o.cultura.toLowerCase() === cultura.toLowerCase() : true;
      const txt = `${o.cultura} ${o.variedade ?? ""} ${o.origem ?? ""}`.toLowerCase();
      const okBusca = busca ? txt.includes(busca.toLowerCase()) : true;
      return okCultura && okBusca;
    });
    rows = [...rows].sort((a, b) => {
      if (ordenar === "preco") return a.preco_kg - b.preco_kg;
      return b.quantidade_kg - a.quantidade_kg;
    });
    return rows;
  }, [ofertasApi, busca, cultura, ordenar]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ofertas</h1>
        <div className="hidden sm:block text-sm text-muted-foreground">Consulte e filtre ofertas disponíveis</div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Buscar</Label>
            <Input className="mt-2" placeholder="cultura, variedade, origem" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div>
            <Label>Cultura</Label>
            <Select value={cultura || "__all__"} onValueChange={(v) => setCultura(v === "__all__" ? "" : v)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {culturas.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ordenar por</Label>
            <Select value={ordenar} onValueChange={(v) => setOrdenar(v as any)}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preco">Menor preço</SelectItem>
                <SelectItem value="quantidade">Maior quantidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <Card className="p-4"><div className="text-muted-foreground">Carregando ofertas...</div></Card>
        )}
        {ofertas.map((o) => (
          <Card key={o.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{o.cultura}{o.variedade ? ` • ${o.variedade}` : ""}</div>
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
            <div className="flex gap-2">
              <Button className="flex-1">Ver detalhes</Button>
              <Button variant="outline">Contato</Button>
            </div>
          </Card>
        ))}
        {ofertas.length === 0 && (
          <Card className="p-4">
            <div className="text-muted-foreground">Nenhuma oferta encontrada com os filtros atuais.</div>
          </Card>
        )}
      </div>
    </div>
  );
}