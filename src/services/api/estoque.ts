import { apiFetch } from "./client";

export type EstoqueItem = {
  id: number;
  cultivo_id: number;
  cultivo: string;
  quantidade_kg: number;
  tipo: string;
  criado_em?: string;
};

export type EstoqueResumo = {
  saldo_total_kg: number;
  entradas: EstoqueItem[];
};

export async function listEstoque(): Promise<EstoqueResumo> {
  const r = await apiFetch("/api/estoque/");
  const entradas: EstoqueItem[] = Array.isArray(r?.entradas)
    ? (r.entradas as any[]).map((e) => ({
        id: Number(e.id),
        cultivo_id: Number(e.cultivo_id ?? e.cultivo ?? 0),
        cultivo: String(e.cultivo_nome ?? e.cultivo ?? ""),
        quantidade_kg: Number(e.quantidade_kg ?? e.quantidade ?? 0),
        tipo: String(e.tipo ?? ""),
        criado_em: e.criado_em,
      }))
    : [];
  const saldo = Number(r?.saldo_total_kg ?? r?.saldo ?? 0);
  return { saldo_total_kg: saldo, entradas };
}

export async function createEntradaEstoque(payload: {
  cultivo_id: number;
  quantidade_kg: number;
  tipo: "colheita" | "ajuste";
  observacao?: string;
}): Promise<EstoqueItem> {
  const body = {
    cultivo_id: payload.cultivo_id,
    quantidade_kg: payload.quantidade_kg,
    tipo: payload.tipo,
    observacao: payload.observacao ?? "",
  };
  const r = await apiFetch("/api/estoque/entrada/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    id: Number(r.id),
    cultivo_id: Number(r.cultivo_id ?? r.cultivo ?? payload.cultivo_id),
    cultivo: String(r.cultivo_nome ?? r.cultivo ?? ""),
    quantidade_kg: Number(r.quantidade_kg ?? payload.quantidade_kg),
    tipo: String(r.tipo ?? payload.tipo),
    criado_em: r.criado_em,
  } as EstoqueItem;
}