export const STORAGE_KEY = "oh_wizard_deal_v1";

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function normalize(s: unknown): string {
  return (s ?? "").toString().trim().toLowerCase();
}

export function linesToList(text: string): string[] {
  return (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/* Heurísticas simples */
export const FUZZY_WORDS = [
  "bonito",
  "profissional",
  "intuitivo",
  "moderno",
  "melhor",
  "ótimo",
  "top",
  "perfeito",
  "rápido",
  "eficiente",
  "completo",
  "total",
  "tudo",
  "bem feito",
  "de qualidade",
  "user friendly",
  "robusto",
  "simples",
  "fácil",
  "agradável",
  "clean",
  "polido",
];

export const GENERIC_PROJECT_NAMES = ["projeto", "serviço", "trabalho"];

export const UNIT_HINTS = ["s", "ms", "%", "mm", "cm", "m", "km", "hora", "horas", "h", "dia", "dias", "página", "páginas", "kb", "mb", "gb", "dpi", "px", "fps", "r$", "usd", "brl", "min", "mins", "minuto", "minutos"];

export function containsFuzzy(text: string): boolean {
  const t = normalize(text);
  return FUZZY_WORDS.some((w) => t.includes(w));
}

export function containsSomeUnitOrNumber(text: string): boolean {
  const t = normalize(text);
  const hasDigit = /\d/.test(t);
  const hasUnit = UNIT_HINTS.some((u) => t.includes(u));
  return hasDigit || hasUnit;
}

export function isTooGenericProjectName(name: string): boolean {
  const t = normalize(name);
  if (t.length === 0) return false;
  if (GENERIC_PROJECT_NAMES.includes(t)) return true;
  if (GENERIC_PROJECT_NAMES.some((g) => t === g)) return true;
  return false;
}

export function looksLikeNoContextProblem(text: string): boolean {
  const t = normalize(text);
  if (!t) return true;
  const hasNeed = t.includes("preciso de") || t.includes("quero ") || t.includes("precisamos de");
  const hasContextMarkers = ["hoje", "atualmente", "no momento", "isso causa", "porque", "pois", "devido", "como consequência", "impacta", "resulta"].some((k) => t.includes(k));
  if (hasNeed && !hasContextMarkers) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 7) return true;
  return false;
}

export function validateVerifiableBullet(item: string): boolean {
  if (containsFuzzy(item) && !containsSomeUnitOrNumber(item)) return false;
  return true;
}

export function validateNoScopeBroadWords(item: string): boolean {
  const t = normalize(item);
  const bad = ["completo", "total", "tudo", "toda", "inteiro", "100%", "full"].some((w) => t.includes(w));
  return !bad;
}

export type Deliverable = {
  id: string;
  name: string;
  type: string;
  description: string;
  formatMode: "Sem formato específico" | "Formatos" | "Norma/padrão";
  formats: string;
  standard: string;
  acceptance: {
    mode: "" | "Checklist" | "Métrica" | "Evidência";
    checklist: string[];
    metric: { value: string; unit: string };
    evidenceType: "" | "foto" | "vídeo" | "log" | "relatório" | "arquivo";
  };
};

export type Milestone = {
  name: string;
  deliverableIds: string[];
  acceptChecklist: string[];
  evidenceMin: string;
  valuePct: string;
  etaMinDays: string;
  etaMaxDays: string;
};

export type WizardState = {
  meta: { createdAt: string; updatedAt: string; version: number };
  step0: { projectName: string; category: string; executionMode: string; city: string; district: string };
  step1: { problem: string; successBullets: string[] };
  step2: { requesterName: string; requesterContact: string; approverName: string; approverRole: string; others: Array<{ name: string; role: string; canBlock: boolean }> };
  step3: { inScope: string[]; outScope: string[]; assumptions: string[] };
  step4: { deliverables: Deliverable[] };
  step5: { milestones: Milestone[] };
};

export function defaultState(): WizardState {
  return {
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 },
    step0: { projectName: "", category: "", executionMode: "", city: "", district: "" },
    step1: { problem: "", successBullets: [] },
    step2: { requesterName: "", requesterContact: "", approverName: "", approverRole: "", others: [] },
    step3: { inScope: [], outScope: [], assumptions: [] },
    step4: { deliverables: [] },
    step5: { milestones: [] },
  };
}

export function newDeliverable(): Deliverable {
  const id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Math.random()).slice(2);
  return {
    id,
    name: "",
    type: "",
    description: "",
    formatMode: "Sem formato específico",
    formats: "",
    standard: "",
    acceptance: {
      mode: "",
      checklist: [],
      metric: { value: "", unit: "" },
      evidenceType: "",
    },
  };
}

export function buildExport(state: WizardState) {
  const exportObj: WizardState & any = JSON.parse(JSON.stringify(state));

  exportObj.step0.projectName = exportObj.step0.projectName.trim();
  exportObj.step2.others = exportObj.step2.others.filter((o: any) => o.name.trim() || o.role.trim());

  exportObj.step4.deliverables = exportObj.step4.deliverables.map((d: any, i: number) => ({
    ...d,
    index: i + 1,
  }));

  const byId = new Map<string, any>(exportObj.step4.deliverables.map((d: any) => [d.id, d]));

  exportObj.step5.milestones = exportObj.step5.milestones.map((m: any, i: number) => ({
    ...m,
    index: i + 1,
    deliverablesRefs: (m.deliverableIds || []).map((id: string) => ({
      id,
      name: byId.get(id)?.name ?? "Entregável",
    })),
  }));

  return exportObj;
}


/* helpers usados no HTML antigo */
export function optionListValues(values: string[]) {
  return values;
}

export function escapeHtml(str: unknown) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(str: unknown) {
  return escapeHtml(str).replaceAll("\n", " ");
}
