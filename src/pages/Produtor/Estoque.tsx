import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listCultivos, type Cultivo } from "@/services/api/cultivos";
import { listEstoque, createEntradaEstoque, type EstoqueItem, type EstoqueResumo } from "@/services/api/estoque";

function parseDate(d?: string | null) {
  if (!d) return null;
  const t = Date.parse(d);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function isColhido(c: Cultivo) {
  const dt = parseDate(c.data_prevista_colheita || null);
  if (!dt) return false;
  const now = new Date();
  const y = dt.getFullYear();
  const m = dt.getMonth();
  const day = dt.getDate();
  const ref = new Date(y, m, day, 23, 59, 59, 999);
  return ref.getTime() <= now.getTime();
}

export default function Estoque() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: estoqueData, isLoading: loadingEstoque } = useQuery<EstoqueResumo>({
    queryKey: ["estoque"],
    queryFn: () => listEstoque(),
    refetchOnWindowFocus: false,
  });
  const { data: cultivos } = useQuery<Cultivo[]>({
    queryKey: ["cultivos"],
    queryFn: () => listCultivos(),
    refetchOnWindowFocus: false,
  });

  const [open, setOpen] = useState(false);
  const [cultivoId, setCultivoId] = useState<number | null>(null);
  const [quantidade, setQuantidade] = useState<string>("");
  const [tipo, setTipo] = useState<"colheita" | "ajuste">("colheita");
  const [observacao, setObservacao] = useState("");

  const cultivoSel = useMemo(() => {
    if (!cultivos || cultivoId == null) return null;
    return cultivos.find((c) => c.id === cultivoId) || null;
  }, [cultivos, cultivoId]);

  const saldoPorCultivo = useMemo(() => {
    const map = new Map<number, number>();
    const entradas = estoqueData?.entradas || [];
    for (const e of entradas) {
      const id = Number(e.cultivo_id || 0);
      if (!id) continue;
      const prev = map.get(id) || 0;
      map.set(id, prev + Number(e.quantidade_kg || 0));
    }
    return map;
  }, [estoqueData]);

  const mutEntrada = useMutation({
    mutationFn: (payload: { cultivo_id: number; quantidade_kg: number; tipo: "colheita" | "ajuste"; observacao?: string }) =>
      createEntradaEstoque(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque"] });
      toast({ title: "Entrada registrada" });
      setOpen(false);
      setCultivoId(null);
      setQuantidade("");
      setObservacao("");
      setTipo("colheita");
    },
    onError: (e: any) => {
      const msg = String(e?.message || "Erro ao registrar entrada");
      toast({ title: "Erro", description: msg });
    },
  });

  function submitEntrada() {
    if (!cultivoId) {
      toast({ title: "Selecione o cultivo" });
      return;
    }
    const q = Number(quantidade);
    if (!Number.isFinite(q) || q <= 0) {
      toast({ title: "Informe quantidade válida" });
      return;
    }
    const cult = cultivoSel;
    if (tipo === "colheita") {
      if (!cult || !isColhido(cult)) {
        toast({ title: "Cultivo não colhido" });
        return;
      }
    }
    mutEntrada.mutate({ cultivo_id: cultivoId, quantidade_kg: q, tipo, observacao });
  }

  const saldo = estoqueData?.saldo_total_kg ?? 0;
  const entradas = estoqueData?.entradas ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Estoque</h1>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Saldo atual</p>
            <p className="text-3xl font-semibold">{saldo.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setTipo("colheita"); setOpen(true); }}>Adicionar entrada</Button>
            <Button variant="outline" onClick={() => { setTipo("ajuste"); setOpen(true); }}>Ajustar estoque</Button>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Entradas</h2>
          <span className="text-sm text-muted-foreground">{loadingEstoque ? "Carregando" : `${entradas.length} registros`}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cultivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entradas.map((e: EstoqueItem) => (
              <TableRow key={e.id}>
                <TableCell>{e.criado_em ? new Date(e.criado_em).toLocaleString() : ""}</TableCell>
                <TableCell>{e.cultivo}</TableCell>
                <TableCell className="capitalize">{e.tipo}</TableCell>
                <TableCell className="text-right">{Number(e.quantidade_kg).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
              </TableRow>
            ))}
            {entradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma entrada cadastrada</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tipo === "colheita" ? "Adicionar entrada de estoque" : "Ajustar estoque"}</DialogTitle>
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
              {tipo === "colheita" && cultivoSel && (
                <div className="space-y-1">
                  <p className={isColhido(cultivoSel) ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                    {isColhido(cultivoSel) ? "Cultivo colhido" : "Cultivo não colhido"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const kg = saldoPorCultivo.get(cultivoSel.id) || 0;
                      const kgPorSaca = Number(cultivoSel.kg_por_saca || 60);
                      const sacas = kgPorSaca > 0 ? kg / kgPorSaca : 0;
                      return `Disponível: ${kg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg (${sacas.toLocaleString(undefined, { maximumFractionDigits: 2 })} sacas)`;
                    })()}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantidade (kg)</Label>
              <Input type="number" min={0} step={0.01} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observação</Label>
              <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submitEntrada} disabled={mutEntrada.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

