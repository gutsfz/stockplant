import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFazendas, type Fazenda } from "@/services/api/farm";
import { listCultivos, createCultivo, type Cultivo } from "@/services/api/cultivos";
import { listEstoque, createEntradaEstoque } from "@/services/api/estoque";
import { listCultivares, type Cultivar } from "@/services/api/cultivares";
import { useToast } from "@/hooks/use-toast";
import LineChart from "@/components/Charts/LineChart";
import AreaChart from "@/components/Charts/AreaChart";
import BarChart from "@/components/Charts/BarChart";
import { Link } from "react-router-dom";

const Cultivos = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: fazendas = [], isLoading: loadingFaz } = useQuery({ queryKey: ["fazendas"], queryFn: listFazendas });
  const { data: cultivos = [], isLoading: loadingCult } = useQuery({ queryKey: ["cultivos"], queryFn: listCultivos });
  const { data: estoque } = useQuery({ queryKey: ["estoque"], queryFn: () => listEstoque(), refetchOnWindowFocus: false });

  const [selectedFazendaId, setSelectedFazendaId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  type Form = { fazenda_id: string; cultura: string; variedade: string; area: string; data_plantio: string; data_prevista_colheita: string; safra: string; sacas_por_ha: string; kg_por_saca: string };
  const [form, setForm] = useState<Form>({ fazenda_id: "", cultura: "", variedade: "", area: "", data_plantio: "", data_prevista_colheita: "", safra: "", sacas_por_ha: "", kg_por_saca: "60" });
  const [weather, setWeather] = useState<{ temp?: number; precip?: number; wind?: number } | null>(null);
  const [rainHistoryAnnual, setRainHistoryAnnual] = useState<{ x: string[]; y: number[] } | null>(null);
  const [rainHistoryStandard, setRainHistoryStandard] = useState<{ x: string[]; y: number[] } | null>(null);
  const [rainPeriod, setRainPeriod] = useState<"7" | "30" | "60" | "90" | "custom">("30");
  const [rainStart, setRainStart] = useState<string>("");
  const [rainEnd, setRainEnd] = useState<string>("");
  const [rainAgg, setRainAgg] = useState<"daily" | "weekly" | "monthly">("daily");
  const [cultivares, setCultivares] = useState<Cultivar[]>([]);
  const [rainMode, setRainMode] = useState<"annual" | "standard">("standard");
  useEffect(() => {
    let mounted = true;
    listCultivares().then((rows) => { if (mounted) setCultivares(rows); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  const culturasList = useMemo(() => Array.from(new Set((cultivares || []).map((x) => x.cultura))), [cultivares]);
  const variedadesList = useMemo(() => (form.cultura ? (cultivares || []).filter((x) => x.cultura.toLowerCase() === form.cultura.toLowerCase()).map((x) => x.variedade) : []), [cultivares, form.cultura]);

  useEffect(() => {
    if (selectedFazendaId === null) return;
    const f = fazendas.find((x) => x.id === selectedFazendaId);
    const lat = f?.latitude ?? null;
    const lon = f?.longitude ?? null;
    if (lat == null || lon == null) { setWeather(null); setRainHistoryAnnual(null); setRainHistoryStandard(null); return; }
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m`;
        const res = await fetch(url);
        const data = await res.json();
        const c = data?.current;
        setWeather({ temp: c?.temperature_2m, precip: c?.precipitation, wind: c?.wind_speed_10m });
      } catch (e: any) {
        setWeather(null);
      }
    };
    const fetchRain = async () => {
      try {
        const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        let startIso = "";
        let endIso = "";
        let lastPlantio: Date | null = null;
        let lastColheita: Date | null = null;
        const withDates = (filtered || []).filter((c) => !!c.data_plantio && !!c.data_prevista_colheita);
        if (withDates.length > 0) {
          const sorted = [...withDates].sort((a, b) => {
            const da = new Date(a.data_prevista_colheita as string).getTime();
            const db = new Date(b.data_prevista_colheita as string).getTime();
            return db - da;
          });
          const last = sorted[0];
          const end = new Date(last.data_prevista_colheita as string);
          const start = new Date(end);
          start.setFullYear(end.getFullYear() - 7);
          startIso = toIso(start);
          endIso = toIso(end);
          lastPlantio = new Date(last.data_plantio as string);
          lastColheita = new Date(last.data_prevista_colheita as string);
        } else if (rainPeriod === "custom" && rainStart && rainEnd) {
          startIso = rainStart;
          endIso = rainEnd;
        } else {
          const today = new Date();
          const days = Number(rainPeriod);
          const start = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
          startIso = toIso(start);
          endIso = toIso(today);
        }
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startIso}&end_date=${endIso}&daily=precipitation_sum&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        const xRaw = (data?.daily?.time || []) as string[];
        const yRaw = (data?.daily?.precipitation_sum || []) as number[];
        if (!(xRaw.length && yRaw.length && xRaw.length === yRaw.length)) { setRainHistoryAnnual(null); setRainHistoryStandard(null); return; }
        if (lastPlantio && lastColheita) {
          const pm = lastPlantio.getMonth() + 1;
          const pd = lastPlantio.getDate();
          const cm = lastColheita.getMonth() + 1;
          const cd = lastColheita.getDate();
          const crosses = (cm < pm) || (cm === pm && cd < pd);
          const acc: Record<number, number> = {};
          for (let i = 0; i < xRaw.length; i++) {
            const d = new Date(xRaw[i] + "T00:00:00");
            const m = d.getMonth() + 1;
            const day = d.getDate();
            let inWindow = false;
            if (crosses) {
              inWindow = (m > pm || (m === pm && day >= pd)) || (m < cm || (m === cm && day <= cd));
            } else {
              inWindow = ((m > pm || (m === pm && day >= pd)) && (m < cm || (m === cm && day <= cd)));
            }
            if (!inWindow) continue;
            let year = d.getFullYear();
            if (crosses && (m < pm || (m === pm && day < pd))) year = year - 1;
            acc[year] = (acc[year] || 0) + (yRaw[i] || 0);
          }
          const years = Object.keys(acc).map((k) => Number(k)).sort((a, b) => a - b);
          const x = years.map((y) => String(y));
          const y = years.map((y) => acc[y]);
          setRainHistoryAnnual({ x, y });
          const accMonth: Record<string, number> = {};
          for (let i = 0; i < xRaw.length; i++) {
            const d = new Date(xRaw[i] + "T00:00:00");
            const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
            accMonth[key] = (accMonth[key] || 0) + (yRaw[i] || 0);
          }
          const keys = Object.keys(accMonth);
          keys.sort((a, b) => {
            const [ma, ya] = a.split("/").map((s) => Number(s));
            const [mb, yb] = b.split("/").map((s) => Number(s));
            if (ya !== yb) return ya - yb;
            return ma - mb;
          });
          const xStd = keys;
          const yStd = keys.map((k) => accMonth[k]);
          setRainHistoryStandard({ x: xStd, y: yStd });
          return;
        }
        if (rainAgg === "daily") {
          const x = xRaw.map((s) => {
            const d = new Date(s + "T00:00:00");
            return d.toLocaleDateString("pt-BR");
          });
          setRainHistoryStandard({ x, y: yRaw });
          return;
        }
        if (rainAgg === "weekly") {
          const acc: Record<string, number> = {};
          for (let i = 0; i < xRaw.length; i++) {
            const d = new Date(xRaw[i] + "T00:00:00");
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1;
            const monday = new Date(d);
            monday.setDate(d.getDate() - diff);
            const key = toIso(monday);
            acc[key] = (acc[key] || 0) + (yRaw[i] || 0);
          }
          const keys = Object.keys(acc).sort();
          const x = keys.map((k) => {
            const d = new Date(k + "T00:00:00");
            return `semana de ${d.toLocaleDateString("pt-BR")}`;
          });
          const y = keys.map((k) => acc[k]);
          setRainHistoryStandard({ x, y });
          return;
        }
        if (rainAgg === "monthly") {
          const acc: Record<string, number> = {};
          for (let i = 0; i < xRaw.length; i++) {
            const d = new Date(xRaw[i] + "T00:00:00");
            const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
            acc[key] = (acc[key] || 0) + (yRaw[i] || 0);
          }
          const keys = Object.keys(acc);
          keys.sort((a, b) => {
            const [ma, ya] = a.split("/").map((s) => Number(s));
            const [mb, yb] = b.split("/").map((s) => Number(s));
            if (ya !== yb) return ya - yb;
            return ma - mb;
          });
          const x = keys;
          const y = keys.map((k) => acc[k]);
          setRainHistoryStandard({ x, y });
          return;
        }
      } catch {
        setRainHistoryAnnual(null);
        setRainHistoryStandard(null);
      }
    };
    fetchWeather();
    fetchRain();
  }, [selectedFazendaId, fazendas, rainPeriod, rainStart, rainEnd, rainAgg]);

  const parseDecimalInput = (value: string) => {
    const t = value.trim();
    if (t === "") return null;
    if (t.includes(",")) {
      const s = t.replace(/\./g, "").replace(",", ".");
      const n = Number(s);
      return Number.isNaN(n) ? null : n;
    }
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  };

  const KG_DEFAULTS: Record<string, number> = {
    soja: 60,
    milho: 60,
    trigo: 60,
    cafe: 60,
  };

  const onChange = (k: keyof Form, v: string) => {
    if (k === "cultura") {
      const key = v.trim().toLowerCase();
      const def = KG_DEFAULTS[key];
      if (def != null) {
        setForm({ ...form, cultura: v, kg_por_saca: String(def) });
        return;
      }
    }
    setForm({ ...form, [k]: v });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        fazenda_id: Number(form.fazenda_id),
        cultura: form.cultura,
        variedade: form.variedade || null,
        area: parseDecimalInput(form.area),
        data_plantio: form.data_plantio,
        data_prevista_colheita: form.data_prevista_colheita || null,
        safra: form.safra || null,
        sacas_por_ha: parseDecimalInput(form.sacas_por_ha),
        kg_por_saca: parseDecimalInput(form.kg_por_saca),
      } as Omit<Cultivo, "id" | "criado_em">;
      return createCultivo(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cultivos"] });
      setOpen(false);
      setForm({ fazenda_id: "", cultura: "", variedade: "", area: "", data_plantio: "", data_prevista_colheita: "", safra: "", sacas_por_ha: "", kg_por_saca: "60" });
      toast({ title: "Cultivo criado" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!selectedFazendaId) return cultivos;
    return (cultivos || []).filter((c) => c.fazenda_id === selectedFazendaId);
  }, [cultivos, selectedFazendaId]);

  const rainAnnualAvailable = useMemo(() => (filtered || []).some((c) => !!c.data_plantio && !!c.data_prevista_colheita), [filtered]);

  useEffect(() => {
    if (rainAnnualAvailable) {
      setRainMode("annual");
    } else {
      setRainMode("standard");
    }
  }, [selectedFazendaId, rainAnnualAvailable]);

  const status = (c: Cultivo) => {
    const today = new Date();
    const plantio = new Date(c.data_plantio);
    const colheita = c.data_prevista_colheita ? new Date(c.data_prevista_colheita) : null;
    if (colheita && today > colheita) return "Colhido";
    if (today < plantio) return "Planejado";
    return colheita ? "Em desenvolvimento" : "Plantado";
  };

  const kgEstimado = (c: Cultivo) => {
    const area = c.area ?? null;
    const sacas_ha = c.sacas_por_ha ?? null;
    const kg_saca = c.kg_por_saca ?? 60;
    if (area == null || sacas_ha == null) return null;
    return (area || 0) * (sacas_ha || 0) * (kg_saca || 60);
  };

  const entradasMap = useMemo(() => {
    const m = new Map<number, { total: number; temColheita: boolean }>();
    const entradas = estoque?.entradas || [];
    for (const e of entradas) {
      const id = Number(e.cultivo_id || 0);
      if (!id) continue;
      const prev = m.get(id) || { total: 0, temColheita: false };
      prev.total += Number(e.quantidade_kg || 0);
      if ((e.tipo || "").toLowerCase() === "colheita") prev.temColheita = true;
      m.set(id, prev);
    }
    return m;
  }, [estoque]);

  const registrarMut = useMutation({
    mutationFn: async (c: Cultivo) => {
      const kg = kgEstimado(c);
      if (kg == null || kg <= 0) throw new Error("Informe área e sacas/ha para estimar kg");
      return createEntradaEstoque({ cultivo_id: c.id, quantidade_kg: kg, tipo: "colheita" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque"] });
      toast({ title: "Colheita registrada no estoque" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao registrar colheita", description: String(e?.message || "") });
    },
  });

  useEffect(() => {
    const all = cultivos || [];
    if (!all.length) return;
    try {
      const key = "stock_auto_colheita_lancados";
      const raw = localStorage.getItem(key);
      const done: Record<number, boolean> = raw ? JSON.parse(raw) : {};
      const toAuto = all.filter((c) => {
        const st = status(c);
        const m = entradasMap.get(c.id);
        return st === "Colhido" && !(m?.temColheita) && !done[c.id];
      });
      if (toAuto.length) {
        const first = toAuto[0];
        registrarMut.mutate(first, {
          onSuccess: () => {
            done[first.id] = true;
            localStorage.setItem(key, JSON.stringify(done));
          },
        });
      }
    } catch {}
  }, [cultivos, entradasMap]);

  const chartPlantios = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const c of filtered || []) {
      const d = new Date(c.data_plantio);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[k] = (byMonth[k] || 0) + 1;
    }
    const keys = Object.keys(byMonth).sort();
    return { x: keys, y: keys.map((k) => byMonth[k]) };
  }, [filtered]);

  const chartColheitaArea = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const c of filtered || []) {
      if (!c.data_prevista_colheita || c.area == null) continue;
      const d = new Date(c.data_prevista_colheita);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[k] = (byMonth[k] || 0) + (c.area || 0);
    }
    const keys = Object.keys(byMonth).sort();
    return { x: keys, y: keys.map((k) => byMonth[k]) };
  }, [filtered]);

  const chartColheitaSacas = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const c of filtered || []) {
      if (!c.data_prevista_colheita || c.area == null || c.sacas_por_ha == null) continue;
      const d = new Date(c.data_prevista_colheita);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const sacas = (c.area || 0) * (c.sacas_por_ha || 0);
      byMonth[k] = (byMonth[k] || 0) + sacas;
    }
    const keys = Object.keys(byMonth).sort();
    return { x: keys, y: keys.map((k) => byMonth[k]) };
  }, [filtered]);

  const chartColheitaKg = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const c of filtered || []) {
      if (!c.data_prevista_colheita || c.area == null || c.sacas_por_ha == null) continue;
      const d = new Date(c.data_prevista_colheita);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const sacas = (c.area || 0) * (c.sacas_por_ha || 0);
      const kg = sacas * (c.kg_por_saca || 60);
      byMonth[k] = (byMonth[k] || 0) + kg;
    }
    const keys = Object.keys(byMonth).sort();
    return { x: keys, y: keys.map((k) => byMonth[k]) };
  }, [filtered]);

  const chartSacasPorCultura = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const c of filtered || []) {
      if (c.area == null || c.sacas_por_ha == null) continue;
      const key = (c.cultura || "").toString().trim() || "(sem cultura)";
      const sacas = (c.area || 0) * (c.sacas_por_ha || 0);
      acc[key] = (acc[key] || 0) + sacas;
    }
    const labels = Object.keys(acc).sort();
    const values = labels.map((k) => acc[k]);
    return { labels, values };
  }, [filtered]);

  const chartKgPorCultura = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const c of filtered || []) {
      if (c.area == null || c.sacas_por_ha == null) continue;
      const key = (c.cultura || "").toString().trim() || "(sem cultura)";
      const sacas = (c.area || 0) * (c.sacas_por_ha || 0);
      const kg = sacas * (c.kg_por_saca || 60);
      acc[key] = (acc[key] || 0) + kg;
    }
    const labels = Object.keys(acc).sort();
    const values = labels.map((k) => acc[k]);
    return { labels, values };
  }, [filtered]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cultivos</h1>
        <div className="flex gap-2">
          <Link to="/produtor/dashboard"><Button variant="outline">Voltar</Button></Link>
          <Button onClick={() => setOpen(true)}>Novo Cultivo</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Fazenda</Label>
            <select className="mt-2 w-full border rounded h-9 px-2" value={selectedFazendaId ?? ""} onChange={(e) => setSelectedFazendaId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Todas</option>
              {(fazendas || []).map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Clima atual</Label>
            <div className="mt-2 text-sm text-muted-foreground">
              {selectedFazendaId === null ? (
                <span>Selecione uma fazenda</span>
              ) : weather ? (
                <span>{weather.temp ?? "-"}°C, chuva {weather.precip ?? "-"} mm, vento {weather.wind ?? "-"} km/h</span>
              ) : (
                <span>Sem dados de clima</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 h-[380px]">
        <div className="mb-2 font-semibold">Chuva histórica</div>
        <div className="grid gap-2 sm:grid-cols-3 mb-3">
          {rainAnnualAvailable ? (
            <div>
              <Label>Modo</Label>
              <div className="mt-2 flex gap-2">
                <Button variant={rainMode === "annual" ? "default" : "outline"} onClick={() => setRainMode("annual")}>Barras anuais</Button>
                <Button variant={rainMode === "standard" ? "default" : "outline"} onClick={() => setRainMode("standard")}>Linhas mensais</Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label>Período</Label>
                <select className="mt-2 w-full border rounded h-9 px-2" value={rainPeriod} onChange={(e) => setRainPeriod(e.target.value as any)}>
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="60">Últimos 60 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              <div>
                <Label>Agregação</Label>
                <select className="mt-2 w-full border rounded h-9 px-2" value={rainAgg} onChange={(e) => setRainAgg(e.target.value as any)}>
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
              {rainPeriod === "custom" && (
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <Label>Início</Label>
                    <Input type="date" className="mt-2" value={rainStart} onChange={(e) => setRainStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input type="date" className="mt-2" value={rainEnd} onChange={(e) => setRainEnd(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="h-[260px]">
          {rainAnnualAvailable ? (
            rainMode === "annual" ? (
              rainHistoryAnnual ? (
                <BarChart title="Precipitação por janela de safra (7 anos)" x={rainHistoryAnnual.x} y={rainHistoryAnnual.y} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados históricos</div>
              )
            ) : (
              rainHistoryStandard ? (
                <LineChart title="Precipitação (mm por mês)" x={rainHistoryStandard.x} y={rainHistoryStandard.y} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados históricos</div>
              )
            )
          ) : (
            rainHistoryStandard ? (
              <AreaChart title="Precipitação (mm)" x={rainHistoryStandard.x} y={rainHistoryStandard.y} />
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados históricos</div>
            )
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loadingCult ? (
          <div className="p-4">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fazenda</TableHead>
                <TableHead>Cultura</TableHead>
                <TableHead>Variedade</TableHead>
                <TableHead>Área (ha)</TableHead>
                <TableHead>Plantio</TableHead>
                <TableHead>Prev. Colheita</TableHead>
                <TableHead>Safra</TableHead>
                <TableHead>Est. Sacas</TableHead>
                <TableHead>Est. Kg</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const f = fazendas.find((x) => x.id === c.fazenda_id) as Fazenda | undefined;
                return (
                  <TableRow key={c.id}>
                    <TableCell>{f?.nome || c.fazenda_id}</TableCell>
                    <TableCell>{c.cultura}</TableCell>
                    <TableCell>{c.variedade || ""}</TableCell>
                    <TableCell>{c.area ?? ""}</TableCell>
                    <TableCell>{c.data_plantio}</TableCell>
                    <TableCell>{c.data_prevista_colheita || ""}</TableCell>
                    <TableCell>{c.safra || ""}</TableCell>
                    <TableCell>{c.area != null && c.sacas_por_ha != null ? ((c.area || 0) * (c.sacas_por_ha || 0)).toLocaleString("pt-BR") : ""}</TableCell>
                    <TableCell>{c.area != null && c.sacas_por_ha != null ? (((c.area || 0) * (c.sacas_por_ha || 0)) * (c.kg_por_saca || 60)).toLocaleString("pt-BR") : ""}</TableCell>
                    <TableCell>{status(c)}</TableCell>
                    <TableCell>
                      {status(c) === "Colhido" ? (
                        entradasMap.get(c.id)?.temColheita ? (
                          <span className="text-sm text-muted-foreground">Já lançado</span>
                        ) : (
                          <Button size="sm" onClick={() => registrarMut.mutate(c)} disabled={registrarMut.isPending}>Lançar no estoque</Button>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 h-[320px]">
          <div className="mb-2 font-semibold">Plantios por mês</div>
          <div className="h-[260px]">
            <LineChart title="Plantios" x={chartPlantios.x} y={chartPlantios.y} />
          </div>
        </Card>
        <Card className="p-4 h-[320px]">
          <div className="mb-2 font-semibold">Previsão de colheita (área)</div>
          <div className="h-[260px]">
            <AreaChart title="Colheita prevista" x={chartColheitaArea.x} y={chartColheitaArea.y} />
          </div>
        </Card>
        <Card className="p-4 h-[320px]">
          <div className="mb-2 font-semibold">Estimativa de colheita (sacas)</div>
          <div className="h-[260px]">
            <AreaChart title="Sacas estimadas" x={chartColheitaSacas.x} y={chartColheitaSacas.y} />
          </div>
        </Card>
        <Card className="p-4 h-[320px]">
          <div className="mb-2 font-semibold">Estimativa de colheita (kg)</div>
          <div className="h-[260px]">
            <AreaChart title="Kg estimados" x={chartColheitaKg.x} y={chartColheitaKg.y} />
          </div>
        </Card>
        <Card className="p-4 h-[320px]">
          <div className="mb-2 font-semibold">Sacas por cultura</div>
          <div className="h-[260px]">
            <BarChart title="Sacas por cultura" x={chartSacasPorCultura.labels} y={chartSacasPorCultura.values} />
          </div>
        </Card>
        <Card className="p-4 h-[320px]">
          <div className="mb-2 font-semibold">Kg por cultura</div>
          <div className="h-[260px]">
            <BarChart title="Kg por cultura" x={chartKgPorCultura.labels} y={chartKgPorCultura.values} />
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cultivo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fazenda</Label>
              <select className="w-full border rounded h-9 px-2" value={form.fazenda_id} onChange={(e) => onChange("fazenda_id", e.target.value)}>
                <option value="">Selecione</option>
                {(fazendas || []).map((f) => (
                  <option key={f.id} value={String(f.id)}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cultura</Label>
              <select className="w-full border rounded h-9 px-2" value={form.cultura} onChange={(e) => onChange("cultura", e.target.value)}>
                <option value="">Selecione</option>
                {culturasList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Variedade</Label>
              <select className="w-full border rounded h-9 px-2" value={form.variedade} onChange={(e) => onChange("variedade", e.target.value)} disabled={!form.cultura}>
                <option value="">Selecione</option>
                {variedadesList.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Área (ha)</Label>
              <Input inputMode="decimal" value={form.area} onChange={(e) => onChange("area", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de plantio</Label>
              <Input type="date" value={form.data_plantio} onChange={(e) => onChange("data_plantio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data prevista colheita</Label>
              <Input type="date" value={form.data_prevista_colheita} onChange={(e) => onChange("data_prevista_colheita", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Safra</Label>
              <Input placeholder="ex.: 2024/2025" value={form.safra} onChange={(e) => onChange("safra", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Produtividade (sacas/ha)</Label>
              <Input inputMode="decimal" value={form.sacas_por_ha} onChange={(e) => onChange("sacas_por_ha", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Peso da saca (kg)</Label>
              <Input inputMode="decimal" value={form.kg_por_saca} onChange={(e) => onChange("kg_por_saca", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>{createMut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cultivos;

