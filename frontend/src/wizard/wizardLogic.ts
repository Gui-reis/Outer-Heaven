/** Fluxo [4]: chave única para persistir o estado completo do wizard no localStorage. */
export const STORAGE_KEY = "oh_wizard_deal_v1";

/**
 * Fluxo [5]: limita um número entre mínimo e máximo.
 * - Usado por navegação de etapas e quantidade de milestones.
 * - Quem chama: CreateDealPage (goToStep, onNext/onBack, applyMilestoneCount).
 */
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/**
 * Fluxo [6]: normaliza texto para validações (trim + lowercase).
 * - Quem chama: quase todas as heurísticas de validação abaixo.
 */
export function normalize(s: unknown): string {
  return (s ?? "").toString().trim().toLowerCase();
}

/**
 * Fluxo [7]: converte textarea (1 item por linha) em array limpo.
 * - Quem chama: handlers de update das etapas 1, 3, 4 e 5.
 */
export function linesToList(text: string): string[] {
  return (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/* Heurísticas simples */
/** Fluxo [6.1]: vocabulário de termos subjetivos usados nas validações anti-ambiguidade. */
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

/** Fluxo [6.2]: nomes genéricos proibidos para o campo de projeto. */
export const GENERIC_PROJECT_NAMES = ["projeto", "serviço", "trabalho"];

/** Fluxo [6.3]: unidades/indicadores que tornam critérios mensuráveis nas regras. */
export const UNIT_HINTS = ["s", "ms", "%", "mm", "cm", "m", "km", "hora", "horas", "h", "dia", "dias", "página", "páginas", "kb", "mb", "gb", "dpi", "px", "fps", "r$", "usd", "brl", "min", "mins", "minuto", "minutos"];

/** Fluxo [8]: detecta termos subjetivos/ambíguos em descrições. */
export function containsFuzzy(text: string): boolean {
  const t = normalize(text);
  return FUZZY_WORDS.some((w) => t.includes(w));
}

/** Fluxo [9]: detecta presença de número/unidade para tornar critérios verificáveis. */
export function containsSomeUnitOrNumber(text: string): boolean {
  const t = normalize(text);
  const hasDigit = /\d/.test(t);
  const hasUnit = UNIT_HINTS.some((u) => t.includes(u));
  return hasDigit || hasUnit;
}

/** Fluxo [10]: bloqueia nomes de projeto genéricos demais na etapa 0. */
export function isTooGenericProjectName(name: string): boolean {
  const t = normalize(name);
  if (t.length === 0) return false;
  if (GENERIC_PROJECT_NAMES.includes(t)) return true;
  if (GENERIC_PROJECT_NAMES.some((g) => t === g)) return true;
  return false;
}

/**
 * Fluxo [11]: heurística para detectar problema sem contexto suficiente.
 * - Quem chama: validateStep na etapa 1.
 */
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

/** Fluxo [12]: valida se um bullet é verificável (não só "fuzzy"). */
export function validateVerifiableBullet(item: string): boolean {
  if (containsFuzzy(item) && !containsSomeUnitOrNumber(item)) return false;
  return true;
}

/** Fluxo [13]: impede termos amplos demais no escopo (ex.: "tudo", "completo"). */
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

/**
 * Fluxo [14]: fábrica de estado inicial do wizard.
 * - Quem chama: loadState(), resetAll() e merge inicial da página CreateDealPage.
 */
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

/**
 * Fluxo [15]: cria um entregável vazio com ID único para React e vínculo com milestones.
 * - Quem chama: init do estado, botão "Adicionar", duplicação e reset do wizard.
 */
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

/**
 * Fluxo [16]: gera o JSON final pronto para exportar/salvar.
 * - Enriquece com índices e referências legíveis de entregáveis por milestone.
 * - Quem chama: preview da etapa 6, botão copiar e botão baixar JSON.
 */
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
/** Fluxo [17]: helper legado para listas de opções (mantido por compatibilidade). */
export function optionListValues(values: string[]) {
  return values;
}

/** Fluxo [18]: escape defensivo de HTML (helper legado da versão anterior). */
export function escapeHtml(str: unknown) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Fluxo [19]: escape para atributos HTML (helper legado da versão anterior). */
export function escapeAttr(str: unknown) {
  return escapeHtml(str).replaceAll("\n", " ");
}
