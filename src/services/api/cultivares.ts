import { apiFetch } from "./client";

export type Cultivar = {
  id: number;
  cultura: string;
  variedade: string;
  criado_em?: string;
};

export async function listCultivares(cultura?: string): Promise<Cultivar[]> {
  const path = cultura ? `/api/farm/cultivares/?cultura=${encodeURIComponent(cultura)}` : "/api/farm/cultivares/";
  const rows = await apiFetch(path);
  return (rows as any[]).map((r) => ({ id: Number(r.id), cultura: String(r.cultura || ""), variedade: String(r.variedade || ""), criado_em: r.criado_em }));
}