import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listCultivos, type Cultivo } from "@/services/api/cultivos";
import { listEstoque } from "@/services/api/estoque";

export default function Ofertas() {
  const { toast } = useToast();
  const { data: estoque } = useQuery({ queryKey: ["estoque"], queryFn: () => listEstoque(), refetchOnWindowFocus: false });
  const { data: cultivos } = useQuery<Cultivo[]>({ queryKey: ["cultivos"], queryFn: () => listCultivos(), refetchOnWindowFocus: false });

  const saldo = estoque?.saldo_total_kg ?? 0;
  const saldoPorCultivo = useMemo(() => {
    const map = new Map<number, number>();
    const entradas = estoque?.entradas || [];
    for (const e of entradas) {
      const id = Number(e.cultivo_id || 0);
      if (!id) continue;
      const prev = map.get(id) || 0;
      map.set(id, prev + Number(e.quantidade_kg || 0));
    }
    return map;
  }, [estoque]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cultivoId, setCultivoId] = useState<number | null>(null);
  const [quantidade, setQuantidade] = useState<string>("");
  const [preco, setPreco] = useState<string>("");

  const quantidadeNum = (() => {
    const n = Number(quantidade);
    return Number.isFinite(n) ? n : 0;
  })();
  const saldoCultivoSel = cultivoId ? (saldoPorCultivo.get(cultivoId) || 0) : 0;
  const excedeSaldo = quantidadeNum > (cultivoId ? saldoCultivoSel : saldo);
  const cultivoSel = useMemo(() => {
    if (!cultivos || cultivoId == null) return null;
    return cultivos.find((c) => c.id === cultivoId) || null;
  }, [cultivos, cultivoId]);
  const kgPorSacaSel = Number(cultivoSel?.kg_por_saca || 60);
  const sacasCultivoSel = kgPorSacaSel > 0 ? (saldoCultivoSel / kgPorSacaSel) : 0;

  const startCreate = () => {
    setEditingId(null);
    setCultivoId(null);
    setQuantidade("");
    setPreco("");
    setOpen(true);
  };

  const startEdit = (id: number) => {
    setEditingId(id);
    setOpen(true);
  };

  const submit = () => {
    if (!cultivoId) {
      toast({ title: "Selecione o cultivo" });
      return;
    }
    if (quantidadeNum <= 0) {
      toast({ title: "Informe quantidade válida" });
      return;
    }
    if (excedeSaldo) {
      const s = cultivoId ? saldoCultivoSel : saldo;
      toast({ title: "Quantidade excede estoque disponível", description: `Saldo: ${s.toLocaleString()} kg` });
      return;
    }
    toast({ title: editingId ? "Oferta atualizada" : "Oferta criada" });
    setOpen(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Ofertas</h1>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Estoque disponível</p>
            <p className="text-2xl font-semibold">{saldo.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={startCreate}>Nova oferta</Button>
            <Button variant="outline" onClick={() => startEdit(1)}>Editar oferta</Button>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar oferta" : "Nova oferta"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cultivo</Label>
              <Select value={cultivoId != null ? String(cultivoId) : ""} onValueChange={(v) => setCultivoId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(cultivos || []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.cultura} {c.variedade ? `- ${c.variedade}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cultivoId && (
                <p className="text-sm text-muted-foreground">
                  {`Disponível (cultivo): ${saldoCultivoSel.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg (${sacasCultivoSel.toLocaleString(undefined, { maximumFractionDigits: 2 })} sacas)`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantidade (kg)</Label>
              <Input type="number" min={0} step={0.01} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              <p className={excedeSaldo ? "text-red-600 text-sm" : "text-muted-foreground text-sm"}>
                {excedeSaldo
                  ? "Quantidade excede o estoque disponível"
                  : (
                    cultivoId
                      ? `Disponível (cultivo): ${saldoCultivoSel.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg (${sacasCultivoSel.toLocaleString(undefined, { maximumFractionDigits: 2 })} sacas)`
                      : `Disponível (total): ${saldo.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`
                  )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preço (R$ por kg)</Label>
              <Input type="number" min={0} step={0.01} value={preco} onChange={(e) => setPreco(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={excedeSaldo || quantidadeNum <= 0 || !cultivoId}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

