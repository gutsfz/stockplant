import { apiFetch } from "./client";

export type Cultivo = {
  id: number;
  fazenda_id: number;
  cultura: string;
  variedade?: string | null;
  area?: number | null;
  data_plantio: string;
  data_prevista_colheita?: string | null;
  safra?: string | null;
  sacas_por_ha?: number | null;
  kg_por_saca?: number | null;
  criado_em?: string;
};

export async function listCultivos(): Promise<Cultivo[]> {
  const rows = await apiFetch("/api/farm/cultivos/");
  return (rows as any[]).map((r) => ({
    id: Number(r.id),
    fazenda_id: Number(r.fazenda),
    cultura: String(r.cultura || ""),
    variedade: r.variedade ?? null,
    area: r.area_ha != null ? Number(r.area_ha) : null,
    data_plantio: String(r.data_plantio || ""),
    data_prevista_colheita: r.data_prevista_colheita ?? null,
    safra: r.safra ?? null,
    sacas_por_ha: r.sacas_por_ha != null ? Number(r.sacas_por_ha) : null,
    kg_por_saca: r.kg_por_saca != null ? Number(r.kg_por_saca) : null,
    criado_em: r.criado_em,
  }));
}

export async function createCultivo(payload: Omit<Cultivo, "id" | "criado_em">): Promise<Cultivo> {
  const body = {
    fazenda: payload.fazenda_id,
    cultura: payload.cultura,
    variedade: payload.variedade ?? "",
    area_ha: payload.area ?? null,
    data_plantio: payload.data_plantio,
    data_prevista_colheita: payload.data_prevista_colheita ?? null,
    safra: payload.safra ?? "",
    sacas_por_ha: payload.sacas_por_ha ?? null,
    kg_por_saca: payload.kg_por_saca ?? null,
  };
  const r = await apiFetch("/api/farm/cultivos/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    id: Number(r.id),
    fazenda_id: Number(r.fazenda),
    cultura: String(r.cultura || ""),
    variedade: r.variedade ?? null,
    area: r.area_ha != null ? Number(r.area_ha) : null,
    data_plantio: String(r.data_plantio || ""),
    data_prevista_colheita: r.data_prevista_colheita ?? null,
    safra: r.safra ?? null,
    sacas_por_ha: r.sacas_por_ha != null ? Number(r.sacas_por_ha) : null,
    kg_por_saca: r.kg_por_saca != null ? Number(r.kg_por_saca) : null,
    criado_em: r.criado_em,
  } as Cultivo;
}