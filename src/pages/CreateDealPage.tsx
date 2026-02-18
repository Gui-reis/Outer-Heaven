import { useEffect, useMemo, useState } from "react";
import "../styles/wizard.css";
import {
  STORAGE_KEY,
  buildExport,
  clamp,
  containsFuzzy,
  containsSomeUnitOrNumber,
  defaultState,
  GENERIC_PROJECT_NAMES,
  isTooGenericProjectName,
  linesToList,
  looksLikeNoContextProblem,
  newDeliverable,
  optionListValues,
  validateNoScopeBroadWords,
  validateVerifiableBullet,
  type WizardState,
} from "../wizard/wizardLogic";

type Errors = string[];

/**
 * Fluxo [20]: carrega estado persistido do wizard.
 * - Tenta ler do localStorage e faz merge com defaults para manter compatibilidade.
 * - Em erro de parse, faz fallback seguro para estado inicial.
 * - Quem chama: inicialização lazy do useState em CreateDealPage.
 */

function loadState(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

/**
 * Fluxo [21]: página principal do wizard de criação de deal.
 * - Controla estado, validações, navegação entre etapas e exportação do resumo final.
 * - Quem chama: App quando a rota ativa é "/create".
 */
export default function CreateDealPage() {
  /**
   * Fluxo [21.1]: estado-fonte único do wizard inteiro.
   * - Inicializa com dados persistidos (loadState) e garante 1 entregável/1 milestone mínimos.
   */
  const [state, setState] = useState<WizardState>(() => {
    const s = loadState();
    // defaults úteis, igual ao init() do seu JS
    if (!s.step4.deliverables || s.step4.deliverables.length === 0) {
      s.step4.deliverables = [newDeliverable()];
    }
    if (!s.step5.milestones || s.step5.milestones.length === 0) {
      s.step5.milestones = [
        {
          name: "",
          deliverableIds: [],
          acceptChecklist: [],
          evidenceMin: "",
          valuePct: "",
          etaMinDays: "",
          etaMaxDays: "",
        },
      ];
    }
    return s;
  });

  /** Fluxo [21.2]: controla qual etapa (0..6) está visível no painel. */
  const [currentStep, setCurrentStep] = useState<number>(0);
  /** Fluxo [21.3]: armazena erros de validação da etapa atual para feedback visual. */
  const [errors, setErrors] = useState<Errors>([]);

  // ✅ Buffer local do textarea de checklist do milestone (pra não “brigar” com linesToList)
  const [milestoneChecklistText, setMilestoneChecklistText] = useState<string[]>(
    () => (state.step5.milestones || []).map((m) => (m.acceptChecklist || []).join("\n"))
  );

  // mantém o buffer alinhado quando aumenta/diminui quantidade de milestones
  /**
   * Fluxo [21.4]: sincroniza o buffer textual quando quantidade de milestones muda.
   * - Evita sobrescrever o texto digitado enquanto usuário edita checklist.
   */
  useEffect(() => {
    setMilestoneChecklistText((prev) => {
      const ms = state.step5.milestones || [];
      const next = ms.map((m, i) => prev[i] ?? (m.acceptChecklist || []).join("\n"));
      return next;
    });
    // IMPORTANT: só depende do length pra não sobrescrever o que você está digitando
  }, [state.step5.milestones.length]);

  /**
   * Fluxo [21.5]: persistência automática no localStorage a cada alteração de estado.
   * - Mantém updatedAt atualizado para rastrear última edição.
   */
  useEffect(() => {
    const next = {
      ...state,
      meta: { ...state.meta, updatedAt: new Date().toISOString() },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [state]);

  /** Fluxo [21.6]: percentual da barra de progresso lateral. */
  const pct = useMemo(() => Math.round((currentStep / 6) * 100), [currentStep]);

  /** Fluxo [21.7]: dicas contextuais exibidas no rodapé conforme etapa ativa. */
  const stepHints = useMemo(
    () => [
      "Defina o serviço (o mínimo pra não virar ‘qualquer coisa’).",
      "Contexto e critérios de sucesso verificáveis.",
      "Defina quem decide e quem pode bloquear.",
      "Escopo: o que entra e o que não entra.",
      "Entregáveis: o núcleo do contrato.",
      "Milestones: entregáveis, aceite e % total 100%.",
      "Confira o resumo final (JSON).",
    ],
    []
  );

  /** Fluxo [22]: limpa mensagens de erro antes de nova validação/navegação. */
  function clearErrors() {
    setErrors([]);
  }

  /**
   * Fluxo [23]: registra erros de validação e leva o usuário ao topo do painel.
   * - Quem chama: goToStep, onNext e qualquer fluxo que bloqueia avanço por validação.
   */
  function showErrors(errs: Errors) {
    setErrors(errs);
    // scroll pro topo do painel como seu JS
    requestAnimationFrame(() => {
      document.getElementById("errors")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /**
   * Fluxo [24]: navegação lateral entre etapas com validação da etapa atual.
   * - Quem chama: clique nos botões da sidebar.
   */
  function goToStep(target: number) {
    const t = clamp(target, 0, 6);
    // valida etapa atual antes de sair (igual seu clique na sidebar)
    const errs = validateStep(currentStep, state);
    if (errs.length) {
      showErrors(errs);
      return;
    }
    clearErrors();
    setCurrentStep(t);
  }

  /** Fluxo [25]: avança uma etapa após validar a etapa corrente. */
  function onNext() {
    const errs = validateStep(currentStep, state);
    if (errs.length) {
      showErrors(errs);
      return;
    }
    clearErrors();
    setCurrentStep((s) => clamp(s + 1, 0, 6));
  }

  /** Fluxo [26]: volta uma etapa sem validar conteúdo. */
  function onBack() {
    clearErrors();
    setCurrentStep((s) => clamp(s - 1, 0, 6));
  }

  /**
   * Fluxo [27]: reinicia o wizard do zero (estado + localStorage).
   * - Quem chama: botão "Reset" no topo da tela.
   */
  function resetAll() {
    if (!confirm("Tem certeza que deseja limpar os dados do wizard?")) return;
    localStorage.removeItem(STORAGE_KEY);
    const s = defaultState();
    s.step4.deliverables = [newDeliverable()];
    s.step5.milestones = [
      {
        name: "",
        deliverableIds: [],
        acceptChecklist: [],
        evidenceMin: "",
        valuePct: "",
        etaMinDays: "",
        etaMaxDays: "",
      },
    ];
    setState(s);
    setMilestoneChecklistText((s.step5.milestones || []).map((m) => (m.acceptChecklist || []).join("\n")));
    setCurrentStep(0);
    clearErrors();
  }

  /** Fluxo [28]: copia para clipboard o JSON final da etapa de resumo. */
  async function copyJson() {
    const json = JSON.stringify(buildExport(state), null, 2);
    await navigator.clipboard.writeText(json);
    alert("JSON copiado!");
  }

  /** Fluxo [29]: faz download local do JSON final. */
  function downloadJson() {
    const json = JSON.stringify(buildExport(state), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outerheaven_deal.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // helpers de update de estado (imutável)
  /**
   * Fluxo [30]: coleção central de handlers de formulário por etapa.
   * - Cada callback é chamado por onChange/onClick dos campos e atualiza apenas o trecho necessário do estado.
   */
  const update = {
    step0: {
      setProjectName: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, projectName: v } })),
      setCategory: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, category: v } })),
      setExecutionMode: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, executionMode: v } })),
      setCity: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, city: v } })),
      setDistrict: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, district: v } })),
    },
    step1: {
      setProblem: (v: string) => setState((s) => ({ ...s, step1: { ...s.step1, problem: v } })),
      setSuccessBulletsText: (v: string) =>
        setState((s) => ({ ...s, step1: { ...s.step1, successBullets: linesToList(v) } })),
    },
    step2: {
      setRequesterName: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, requesterName: v } })),
      setRequesterContact: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, requesterContact: v } })),
      setApproverName: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, approverName: v } })),
      setApproverRole: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, approverRole: v } })),
      addOther: () =>
        setState((s) => ({
          ...s,
          step2: { ...s.step2, others: [...s.step2.others, { name: "", role: "", canBlock: false }] },
        })),
      updateOther: (idx: number, patch: Partial<{ name: string; role: string; canBlock: boolean }>) =>
        setState((s) => ({
          ...s,
          step2: {
            ...s.step2,
            others: s.step2.others.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
          },
        })),
      removeOther: (idx: number) =>
        setState((s) => ({
          ...s,
          step2: { ...s.step2, others: s.step2.others.filter((_, i) => i !== idx) },
        })),
    },
    step3: {
      setInScopeText: (v: string) => setState((s) => ({ ...s, step3: { ...s.step3, inScope: linesToList(v) } })),
      setOutScopeText: (v: string) => setState((s) => ({ ...s, step3: { ...s.step3, outScope: linesToList(v) } })),
      setAssumptionsText: (v: string) =>
        setState((s) => ({ ...s, step3: { ...s.step3, assumptions: linesToList(v) } })),
    },
    step4: {
      addDeliverable: () =>
        setState((s) => ({
          ...s,
          step4: { ...s.step4, deliverables: [...(s.step4.deliverables || []), newDeliverable()] },
        })),
      dupDeliverable: (idx: number) =>
        setState((s) => {
          const src = s.step4.deliverables[idx];
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Math.random()).slice(2);
          const next = [...s.step4.deliverables];
          next.splice(idx + 1, 0, copy);
          return { ...s, step4: { ...s.step4, deliverables: next } };
        }),
      removeDeliverable: (idx: number) =>
        setState((s) => {
          if (s.step4.deliverables.length === 1) {
            alert("Mantenha pelo menos 1 entregável.");
            return s;
          }
          const removed = s.step4.deliverables[idx];
          const nextDeliverables = s.step4.deliverables.filter((_, i) => i !== idx);

          // remove IDs selecionados em milestones (igual seu JS)
          const nextMilestones = s.step5.milestones.map((m) => ({
            ...m,
            deliverableIds: (m.deliverableIds || []).filter(
              (id) => id !== removed.id && nextDeliverables.some((d) => d.id === id)
            ),
          }));

          return {
            ...s,
            step4: { ...s.step4, deliverables: nextDeliverables },
            step5: { ...s.step5, milestones: nextMilestones },
          };
        }),
      updateDeliverable: (idx: number, patch: any) =>
        setState((s) => ({
          ...s,
          step4: {
            ...s.step4,
            deliverables: s.step4.deliverables.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
          },
        })),
      updateDeliverableAcceptance: (idx: number, patch: any) =>
        setState((s) => ({
          ...s,
          step4: {
            ...s.step4,
            deliverables: s.step4.deliverables.map((d, i) =>
              i === idx ? { ...d, acceptance: { ...d.acceptance, ...patch } } : d
            ),
          },
        })),
    },
    step5: {
      applyMilestoneCount: (n: number) =>
        setState((s) => {
          const clamped = clamp(Number(n || 1), 1, 10);
          const current = s.step5.milestones.length;
          let next = [...s.step5.milestones];
          if (current < clamped) {
            for (let i = current; i < clamped; i++) {
              next.push({
                name: "",
                deliverableIds: [],
                acceptChecklist: [],
                evidenceMin: "",
                valuePct: "",
                etaMinDays: "",
                etaMaxDays: "",
              });
            }
          } else if (current > clamped) {
            next = next.slice(0, clamped);
          }
          return { ...s, step5: { ...s.step5, milestones: next } };
        }),
      updateMilestone: (idx: number, patch: any) =>
        setState((s) => ({
          ...s,
          step5: {
            ...s.step5,
            milestones: s.step5.milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
          },
        })),
      toggleMilestoneDeliverable: (idx: number, deliverableId: string, checked: boolean) =>
        setState((s) => {
          const m = s.step5.milestones[idx];
          const arr = m.deliverableIds || [];
          const nextArr = checked
            ? arr.includes(deliverableId)
              ? arr
              : [...arr, deliverableId]
            : arr.filter((x) => x !== deliverableId);
          return {
            ...s,
            step5: {
              ...s.step5,
              milestones: s.step5.milestones.map((mm, i) => (i === idx ? { ...mm, deliverableIds: nextArr } : mm)),
            },
          };
        }),
      removeMilestone: (idx: number) =>
        setState((s) => {
          if (s.step5.milestones.length === 1) {
            alert("Mantenha pelo menos 1 milestone.");
            return s;
          }
          return { ...s, step5: { ...s.step5, milestones: s.step5.milestones.filter((_, i) => i !== idx) } };
        }),
    },
  };

  /** Fluxo [21.8]: habilita campos de cidade/bairro somente para Presencial ou Híbrido. */
  const isLocationVisible = state.step0.executionMode === "Presencial" || state.step0.executionMode === "Híbrido";

  /** Fluxo [21.9]: JSON final renderizado na etapa de resumo. */
  const summaryJson = useMemo(() => JSON.stringify(buildExport(state), null, 2), [state]);

  return (
    <div>
      <div className="bg" aria-hidden="true">
        <div className="blob blob--a"></div>
        <div className="blob blob--b"></div>
        <div className="noise"></div>
      </div>

      <header className="top">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2l8.5 4.8v10.4L12 22l-8.5-4.8V6.8L12 2z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 6.5l5.6 3.2v4.6L12 17.5l-5.6-3.2V9.7L12 6.5z" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <div className="brand__text">
            <div className="brand__name">OuterHeaven</div>
            <div className="brand__tag">Wizard • Deal 1×1</div>
          </div>
        </div>

        <div className="top__right">
          <button className="linkbtn" id="btnReset" type="button" title="Limpar dados salvos" onClick={resetAll}>
            Reset
          </button>
        </div>
      </header>

      <main className="shell">
        <aside className="side">
          <div className="progress">
            <div className="progress__bar">
              <div className="progress__fill" id="progressFill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress__meta">
              <span id="progressLabel">Etapa {currentStep}</span>
              <span className="muted" id="progressPct">
                {pct}%
              </span>
            </div>
          </div>

          <nav className="steps" aria-label="Etapas do wizard">
            {[
              { n: 0, label: "Identificação" },
              { n: 1, label: "Contexto" },
              { n: 2, label: "Stakeholders" },
              { n: 3, label: "Escopo" },
              { n: 4, label: "Entregáveis" },
              { n: 5, label: "Milestones" },
              { n: 6, label: "Resumo" },
            ].map((s) => (
              <button
                key={s.n}
                className={`step ${currentStep === s.n ? "active" : ""}`}
                data-step={s.n}
                type="button"
                onClick={() => goToStep(s.n)}
              >
                <span className="step__n">{s.n === 6 ? "✓" : s.n}</span> {s.label}
              </button>
            ))}
          </nav>

          <p className="side__hint">Dica: itens em lista são “1 por linha”. O wizard valida e sugere ajustes quando detectar ambiguidade.</p>
        </aside>

        <section className="panel">
          <div className="panel__title">
            <h1 id="panelTitle">Transforme um acordo em entregas objetivas — sem ambiguidade.</h1>
            <p className="panel__sub" id="panelSub">
              Preencha passo a passo. Você pode voltar e editar quando quiser.
            </p>
          </div>

          <div className="errors" id="errors" hidden={errors.length === 0}>
            {errors.length > 0 && (
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>

          {/* ===================== STEP 0 ===================== */}
          <section className={`stepPane ${currentStep === 0 ? "active" : ""}`} data-pane="0">
            <h2>Etapa 0 — Identificação do serviço</h2>

            <div className="field">
              <label htmlFor="projName">0.1 Nome do projeto</label>
              <input
                id="projName"
                type="text"
                placeholder="Ex.: Landing page + formulário de contato"
                minLength={3}
                maxLength={80}
                value={state.step0.projectName}
                onChange={(e) => update.step0.setProjectName(e.target.value)}
              />
              <div className="help">3–80 chars. Evite nomes genéricos.</div>
            </div>

            <div className="field">
              <label>0.2 Categoria principal</label>
              <div className="radios" id="category">
                {["Digital/Software", "Design/Conteúdo", "Consultoria/Treinamento", "Serviço presencial", "Produção física", "Outro"].map(
                  (v) => (
                    <label key={v}>
                      <input
                        type="radio"
                        name="category"
                        value={v}
                        checked={state.step0.category === v}
                        onChange={() => update.step0.setCategory(v)}
                      />{" "}
                      {v}
                    </label>
                  )
                )}
              </div>
            </div>

            <div className="field">
              <label>0.3 Local de execução</label>
              <div className="radios" id="executionMode">
                {["Remoto", "Presencial", "Híbrido"].map((v) => (
                  <label key={v}>
                    <input
                      type="radio"
                      name="executionMode"
                      value={v}
                      checked={state.step0.executionMode === v}
                      onChange={() => update.step0.setExecutionMode(v)}
                    />{" "}
                    {v}
                  </label>
                ))}
              </div>

              <div className="row" id="locationRow" hidden={!isLocationVisible}>
                <input id="city" type="text" placeholder="Cidade" value={state.step0.city} onChange={(e) => update.step0.setCity(e.target.value)} />
                <input
                  id="district"
                  type="text"
                  placeholder="Bairro (opcional)"
                  value={state.step0.district}
                  onChange={(e) => update.step0.setDistrict(e.target.value)}
                />
              </div>

              <div className="help">Se Presencial/Híbrido, informe cidade/bairro (sem endereço exato).</div>
            </div>
          </section>

          {/* ===================== STEP 1 ===================== */}
          <section className={`stepPane ${currentStep === 1 ? "active" : ""}`} data-pane="1">
            <h2>Etapa 1 — Contexto e objetivos</h2>

            <div className="field">
              <label htmlFor="problem">1.1 Qual problema você quer resolver?</label>
              <textarea
                id="problem"
                rows={4}
                placeholder="Ex.: Hoje o time faz X manualmente; isso causa Y; queremos reduzir Z..."
                value={state.step1.problem}
                onChange={(e) => update.step1.setProblem(e.target.value)}
              />
              <div className="help">1–5 frases. Tente conter “hoje acontece X → isso causa Y”.</div>
            </div>

            <div className="field">
              <label htmlFor="successBullets">1.2 Objetivos</label>
              <textarea
                id="successBullets"
                rows={5}
                placeholder={"1 por linha\nEx.: Página carrega em até 2s em 4G\nEx.: Formulário envia email e salva no CRM"}
                value={(state.step1.successBullets ?? []).join("\n")}
                onChange={(e) => update.step1.setSuccessBulletsText(e.target.value)}
              />
              <div className="help">3–5 itens, verificáveis. Se aparecer fuzzy word, o wizard vai pedir métrica/checklist.</div>
            </div>
          </section>

          {/* ===================== STEP 2 ===================== */}
          <section className={`stepPane ${currentStep === 2 ? "active" : ""}`} data-pane="2">
            <h2>Etapa 2 — Stakeholders e decisão</h2>

            <div className="grid2">
              <div className="field">
                <label>2.1 Solicitante (ponto de contato)</label>
                <div className="row">
                  <input
                    id="requesterName"
                    type="text"
                    placeholder="Nome"
                    value={state.step2.requesterName}
                    onChange={(e) => update.step2.setRequesterName(e.target.value)}
                  />
                  <input
                    id="requesterContact"
                    type="text"
                    placeholder="Contato (email/whats)"
                    value={state.step2.requesterContact}
                    onChange={(e) => update.step2.setRequesterContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>2.2 Aprovador final (decisor)</label>
                <div className="row">
                  <input
                    id="approverName"
                    type="text"
                    placeholder="Nome"
                    value={state.step2.approverName}
                    onChange={(e) => update.step2.setApproverName(e.target.value)}
                  />
                  <input
                    id="approverRole"
                    type="text"
                    placeholder="Papel (ex.: gerente, dono, cliente)"
                    value={state.step2.approverRole}
                    onChange={(e) => update.step2.setApproverRole(e.target.value)}
                  />
                </div>
                <div className="help">Obrigatório 1 decisor final.</div>
              </div>
            </div>

            <div className="field">
              <label>2.3 Outros envolvidos (opcional)</label>

              <div className="stack" id="othersStack">
                {state.step2.others.map((o, idx) => (
                  <div className="block" key={idx}>
                    <div className="block__head">
                      <div className="block__title">Envolvido {idx + 1}</div>
                      <div className="block__actions">
                        <button className="smallbtn" type="button" onClick={() => update.step2.removeOther(idx)}>
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="grid2">
                      <input type="text" placeholder="Nome" value={o.name} onChange={(e) => update.step2.updateOther(idx, { name: e.target.value })} />
                      <input type="text" placeholder="Papel" value={o.role} onChange={(e) => update.step2.updateOther(idx, { role: e.target.value })} />
                      <label className="check">
                        <input type="checkbox" checked={o.canBlock} onChange={(e) => update.step2.updateOther(idx, { canBlock: e.target.checked })} />
                        Pode bloquear aprovação?
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="row">
                <button className="btn btn--ghost" type="button" id="addOther" onClick={update.step2.addOther}>
                  + Adicionar envolvido
                </button>
              </div>
            </div>
          </section>

          {/* ===================== STEP 3 ===================== */}
          <section className={`stepPane ${currentStep === 3 ? "active" : ""}`} data-pane="3">
            <h2>Etapa 3 — Escopo (in / out)</h2>

            <div className="field">
              <label htmlFor="inScope">3.1 O que está INCLUÍDO? (5 a 15 bullets)</label>
              <textarea
                id="inScope"
                rows={7}
                placeholder={"1 por linha\nEvite “tudo”, “completo”, “total”..."}
                value={(state.step3.inScope ?? []).join("\n")}
                onChange={(e) => update.step3.setInScopeText(e.target.value)}
              />
              <div className="help">5–15 itens. Se aparecer “completo/total/tudo”, será pedido detalhamento.</div>
            </div>

            <div className="field">
              <label htmlFor="outScope">3.2 O que está EXPLICITAMENTE FORA do escopo? (mín. 3 bullets)</label>
              <textarea
                id="outScope"
                rows={6}
                placeholder={"1 por linha\nEx.: Não inclui hospedagem\nEx.: Não inclui criação de conteúdo"}
                value={(state.step3.outScope ?? []).join("\n")}
                onChange={(e) => update.step3.setOutScopeText(e.target.value)}
              />
              <div className="help">Obrigatório (protege muito contra disputa).</div>
            </div>

            <div className="field">
              <label htmlFor="assumptions">3.3 Assunções</label>
              <textarea
                id="assumptions"
                rows={5}
                placeholder={"1 por linha\nEx.: Cliente fornece acesso ao ambiente\nEx.: Dados estarão disponíveis"}
                value={(state.step3.assumptions ?? []).join("\n")}
                onChange={(e) => update.step3.setAssumptionsText(e.target.value)}
              />
            </div>
          </section>

          {/* ===================== STEP 4 ===================== */}
          <section className={`stepPane ${currentStep === 4 ? "active" : ""}`} data-pane="4">
            <h2>Etapa 4 — Entregáveis</h2>
            <p className="muted">Adicione 1 ou mais entregáveis. Cada entregável tem critérios de aceitação obrigatórios.</p>

            <div className="stack" id="deliverablesStack">
              {state.step4.deliverables.map((d, idx) => {
                const accMode = d.acceptance.mode;

                const showChecklist = accMode === "Checklist";
                const showMetric = accMode === "Métrica";
                const showEvidence = accMode === "Evidência";

                const showFormats = d.formatMode === "Formatos";
                const showStandard = d.formatMode === "Norma/padrão";

                return (
                  <div className="block" key={d.id} data-id={d.id}>
                    <div className="block__head">
                      <div className="block__title">Entregável {idx + 1}</div>
                      <div className="block__actions">
                        <button className="smallbtn" type="button" onClick={() => update.step4.dupDeliverable(idx)}>
                          Duplicar
                        </button>
                        <button className="smallbtn" type="button" onClick={() => update.step4.removeDeliverable(idx)}>
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="grid2">
                      <div className="field">
                        <label>4.{idx + 1}.1 Nome do entregável</label>
                        <input
                          type="text"
                          maxLength={60}
                          placeholder="Ex.: Relatório de diagnóstico"
                          value={d.name}
                          onChange={(e) => update.step4.updateDeliverable(idx, { name: e.target.value })}
                        />
                      </div>

                      <div className="field">
                        <label>4.{idx + 1}.2 Tipo</label>
                        <select value={d.type} onChange={(e) => update.step4.updateDeliverable(idx, { type: e.target.value })}>
                          {optionListValues(["", "arquivo", "instalação", "sessão", "treinamento", "relatório", "peça física", "outro"]).map((v) => (
                            <option key={v} value={v}>
                              {v === "" ? "Selecione..." : v}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label>4.{idx + 1}.3 Descrição objetiva</label>
                        <textarea
                          rows={3}
                          placeholder="1–3 frases. Evite ‘bonito/profissional/intuitivo’ sem critério."
                          value={d.description}
                          onChange={(e) => update.step4.updateDeliverable(idx, { description: e.target.value })}
                        />
                      </div>

                      <div className="field">
                        <label>4.{idx + 1}.4 Formato / padrão</label>
                        <select value={d.formatMode} onChange={(e) => update.step4.updateDeliverable(idx, { formatMode: e.target.value })}>
                          {optionListValues(["Sem formato específico", "Formatos", "Norma/padrão"]).map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>

                        <div className="row" style={{ marginTop: 10 }}>
                          <input
                            type="text"
                            placeholder="Formatos (ex.: PDF, PNG, SVG)"
                            value={d.formats}
                            hidden={!showFormats}
                            onChange={(e) => update.step4.updateDeliverable(idx, { formats: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Norma/padrão (ex.: ABNT, ISO...)"
                            value={d.standard}
                            hidden={!showStandard}
                            onChange={(e) => update.step4.updateDeliverable(idx, { standard: e.target.value })}
                          />
                        </div>

                        <div className="help">Se tipo=arquivo, exija formato.</div>
                      </div>

                      <div className="field">
                        <label>4.{idx + 1}.5 Critérios de aceitação (obrigatório)</label>
                        <div className="radios">
                          <label>
                            <input
                              type="radio"
                              name={`acc_${d.id}`}
                              value="Checklist"
                              checked={accMode === "Checklist"}
                              onChange={() => update.step4.updateDeliverableAcceptance(idx, { mode: "Checklist" })}
                            />
                            Checklist binária (mín. 5)
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`acc_${d.id}`}
                              value="Métrica"
                              checked={accMode === "Métrica"}
                              onChange={() => update.step4.updateDeliverableAcceptance(idx, { mode: "Métrica" })}
                            />
                            Métrica/limite (com unidade)
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`acc_${d.id}`}
                              value="Evidência"
                              checked={accMode === "Evidência"}
                              onChange={() => update.step4.updateDeliverableAcceptance(idx, { mode: "Evidência" })}
                            />
                            Evidência anexável
                          </label>
                        </div>

                        <div className="grid2" style={{ marginTop: 10 }}>
                          <textarea
                            rows={4}
                            placeholder="Checklist (1 por linha, min 5)"
                            hidden={!showChecklist}
                            value={(d.acceptance.checklist || []).join("\n")}
                            onChange={(e) => update.step4.updateDeliverableAcceptance(idx, { checklist: linesToList(e.target.value) })}
                          />

                          <div>
                            <div className="row">
                              <input
                                type="text"
                                placeholder="Métrica (ex.: até 2)"
                                hidden={!showMetric}
                                value={d.acceptance.metric?.value ?? ""}
                                onChange={(e) =>
                                  update.step4.updateDeliverableAcceptance(idx, {
                                    metric: { ...(d.acceptance.metric || { value: "", unit: "" }), value: e.target.value },
                                  })
                                }
                              />
                              <input
                                type="text"
                                placeholder="Unidade (s, %, mm...)"
                                hidden={!showMetric}
                                value={d.acceptance.metric?.unit ?? ""}
                                onChange={(e) =>
                                  update.step4.updateDeliverableAcceptance(idx, {
                                    metric: { ...(d.acceptance.metric || { value: "", unit: "" }), unit: e.target.value },
                                  })
                                }
                              />
                            </div>

                            <div className="row" style={{ marginTop: 10 }}>
                              <select
                                hidden={!showEvidence}
                                value={d.acceptance.evidenceType}
                                onChange={(e) => update.step4.updateDeliverableAcceptance(idx, { evidenceType: e.target.value })}
                              >
                                {optionListValues(["", "foto", "vídeo", "log", "relatório", "arquivo"]).map((v) => (
                                  <option key={v} value={v}>
                                    {v === "" ? "Selecione..." : v}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="help">Se evidência, escolha um tipo anexável.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="row">
              <button className="btn btn--primary" type="button" id="addDeliverable" onClick={update.step4.addDeliverable}>
                + Adicionar entregável
              </button>
            </div>
          </section>

          {/* ===================== STEP 5 ===================== */}
          <section className={`stepPane ${currentStep === 5 ? "active" : ""}`} data-pane="5">
            <h2>Etapa 5 — Milestones</h2>

            <div className="field">
              <label>5.1 Quantos milestones?</label>
              <div className="row">
                <input
                  id="milestoneCount"
                  type="number"
                  min={1}
                  max={10}
                  placeholder="3"
                  value={state.step5.milestones.length ? String(state.step5.milestones.length) : ""}
                  onChange={() => {
                    /* somente display, botão Aplicar faz a mudança */
                  }}
                />
                <button
                  className="btn btn--ghost"
                  type="button"
                  id="applyMilestoneCount"
                  onClick={() => {
                    const el = document.getElementById("milestoneCount") as HTMLInputElement | null;
                    const n = clamp(Number(el?.value || 1), 1, 10);
                    update.step5.applyMilestoneCount(n);
                  }}
                >
                  Aplicar
                </button>
              </div>
              <div className="help">Depois selecione entregáveis e distribua percentuais (total 100%).</div>
            </div>

            <div className="stack" id="milestonesStack">
              {state.step5.milestones.map((m, idx) => {
                const deliverables = state.step4.deliverables || [];
                return (
                  <div className="block" key={idx}>
                    <div className="block__head">
                      <div className="block__title">Milestone {idx + 1}</div>
                      <div className="block__actions">
                        <button className="smallbtn" type="button" onClick={() => update.step5.removeMilestone(idx)}>
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="grid2">
                      <div className="field">
                        <label>8.{idx + 1}.1 Nome</label>
                        <input
                          type="text"
                          placeholder="Ex.: Entrega do protótipo validado"
                          value={m.name}
                          onChange={(e) => update.step5.updateMilestone(idx, { name: e.target.value })}
                        />
                      </div>

                      <div className="field">
                        <label>8.{idx + 1}.2 Entregáveis incluídos</label>
                        <div className="checks">
                          {deliverables.length ? (
                            deliverables.map((d, di) => {
                              const checked = (m.deliverableIds || []).includes(d.id);
                              const name = d.name ? d.name : `Entregável ${di + 1}`;
                              return (
                                <label className="check" key={d.id}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => update.step5.toggleMilestoneDeliverable(idx, d.id, e.target.checked)}
                                  />
                                  {name}
                                </label>
                              );
                            })
                          ) : (
                            <div className="muted">Crie entregáveis na etapa 4 para poder selecioná-los aqui.</div>
                          )}
                        </div>
                      </div>

                      <div className="field">
                        <label>8.{idx + 1}.3 Critérios de aceite do milestone</label>

                        {/* ✅ textarea agora usa buffer local, então ENTER/ESPAÇO não “somem” */}
                        <textarea
                          rows={4}
                          placeholder="Checklist (1 por linha)"
                          value={milestoneChecklistText[idx] ?? ""}
                          onChange={(e) => {
                            const txt = e.target.value;

                            setMilestoneChecklistText((prev) => {
                              const next = [...prev];
                              next[idx] = txt;
                              return next;
                            });

                            // mantém o estado “normalizado” pra validação/export
                            update.step5.updateMilestone(idx, { acceptChecklist: linesToList(txt) });
                          }}
                        />

                        <input
                          type="text"
                          placeholder="Evidências mínimas (ex.: 1 vídeo + 3 prints + log)"
                          value={m.evidenceMin}
                          onChange={(e) => update.step5.updateMilestone(idx, { evidenceMin: e.target.value })}
                        />
                      </div>

                      <div className="field">
                        <label>8.{idx + 1}.4 Valor (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Ex.: 30"
                          value={m.valuePct}
                          onChange={(e) => update.step5.updateMilestone(idx, { valuePct: e.target.value })}
                        />
                        <div className="help">Total de todos milestones deve somar 100%.</div>

                        <label style={{ marginTop: 12 }}>8.{idx + 1}.5 Prazo estimado (faixa)</label>
                        <div className="row">
                          <input
                            type="number"
                            min={1}
                            placeholder="mín dias"
                            value={m.etaMinDays}
                            onChange={(e) => update.step5.updateMilestone(idx, { etaMinDays: e.target.value })}
                          />
                          <input
                            type="number"
                            min={1}
                            placeholder="máx dias"
                            value={m.etaMaxDays}
                            onChange={(e) => update.step5.updateMilestone(idx, { etaMaxDays: e.target.value })}
                          />
                          <span className="muted">dias</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===================== STEP 6 (SUMMARY) ===================== */}
          <section className={`stepPane ${currentStep === 6 ? "active" : ""}`} data-pane="6">
            <h2>Resumo</h2>
            <p className="muted">Esse JSON é o que o backend vai salvar depois. Por enquanto é só visualização.</p>

            <div className="row">
              <button className="btn btn--primary" type="button" id="btnExport" onClick={copyJson}>
                Copiar JSON
              </button>
              <button className="btn btn--ghost" type="button" id="btnDownload" onClick={downloadJson}>
                Baixar .json
              </button>
            </div>

            <pre className="code" id="summaryJson">
              {summaryJson}
            </pre>
          </section>

          <div className="navBar">
            <button className="btn btn--ghost" type="button" id="btnBack" onClick={onBack} disabled={currentStep === 0}>
              Voltar
            </button>
            <div className="navBar__mid">
              <span className="muted" id="stepHint">
                {stepHints[currentStep] ?? ""}
              </span>
            </div>
            <button className="btn btn--primary" type="button" id="btnNext" onClick={onNext} disabled={currentStep === 6}>
              Avançar
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Fluxo [31]: motor de validação por etapa do wizard.
 * - Retorna lista de erros para bloquear avanço/navegação quando necessário.
 * - Quem chama: goToStep e onNext antes de mudar a etapa atual.
 */
function validateStep(step: number, state: WizardState): Errors {
  const errs: string[] = [];

  if (step === 0) {
    const n = state.step0.projectName.trim();
    if (n.length < 3 || n.length > 80) errs.push("0.1 Nome do projeto deve ter 3–80 caracteres.");
    if (isTooGenericProjectName(n) || GENERIC_PROJECT_NAMES.some((g) => n.trim().toLowerCase() === g))
      errs.push("0.1 Nome do projeto está genérico demais (evite “Projeto/Serviço/Trabalho”).");

    if (!state.step0.category) errs.push("0.2 Selecione uma categoria principal.");
    if (!state.step0.executionMode) errs.push("0.3 Selecione o local de execução (Remoto/Presencial/Híbrido).");

    if (state.step0.executionMode === "Presencial" || state.step0.executionMode === "Híbrido") {
      if (!state.step0.city.trim()) errs.push("0.3 Para Presencial/Híbrido, informe a cidade.");
    }
  }

  if (step === 1) {
    const p = state.step1.problem.trim();
    if (!p) errs.push("1.1 Descreva o problema (não pode ficar vazio).");
    else if (looksLikeNoContextProblem(p)) errs.push("1.1 Parece faltar contexto. Tente: “Hoje acontece X → isso causa Y → queremos Z”.");

    const bullets = state.step1.successBullets || [];
    bullets.forEach((b, i) => {
      if (!validateVerifiableBullet(b)) errs.push(`1.2 Item ${i + 1} parece subjetivo (“fuzzy”). Inclua métrica/unidade/checklist verificável.`);
    });
  }

  if (step === 2) {
    if (!state.step2.requesterName.trim()) errs.push("2.1 Informe o nome do solicitante.");
    if (!state.step2.requesterContact.trim()) errs.push("2.1 Informe o contato do solicitante.");
    if (!state.step2.approverName.trim() || !state.step2.approverRole.trim()) errs.push("2.2 Informe 1 decisor final (nome + papel).");
  }

  if (step === 3) {
    const ins = state.step3.inScope || [];
    ins.forEach((b, i) => {
      if (!validateNoScopeBroadWords(b)) errs.push(`3.1 Item ${i + 1} contém “tudo/total/completo”. Detalhe melhor.`);
    });
  }

  if (step === 4) {
    const ds = state.step4.deliverables || [];
    if (ds.length < 1) errs.push("4: Crie pelo menos 1 entregável.");

    ds.forEach((d, i) => {
      const idx = i + 1;
      if (!d.name.trim() || d.name.trim().length < 2 || d.name.trim().length > 60) errs.push(`4.${idx}.1 Nome do entregável deve ter 2–60 chars.`);
      if (!d.type) errs.push(`4.${idx}.2 Selecione o tipo do entregável.`);
      if (!d.description.trim()) errs.push(`4.${idx}.3 Descrição objetiva é obrigatória.`);
      if (containsFuzzy(d.description) && !containsSomeUnitOrNumber(d.description)) {
        errs.push(`4.${idx}.3 Descrição contém termos subjetivos. Inclua critério verificável (métrica/checklist).`);
      }

      if (d.type.trim().toLowerCase() === "arquivo") {
        const fm = d.formatMode.trim().toLowerCase();
        const hasFormat =
          (fm === "formatos" && d.formats.trim().length > 0) || (fm === "norma/padrão" && d.standard.trim().length > 0);
        if (!hasFormat) errs.push(`4.${idx}.4 Tipo=arquivo exige formato (ex.: PDF/PNG) ou padrão.`);
      }

      if (!d.acceptance.mode) errs.push(`4.${idx}.6 Escolha um modo de aceitação (Checklist/Métrica/Evidência).`);
      else if (d.acceptance.mode === "Checklist") {
        if (!d.acceptance.checklist || d.acceptance.checklist.length < 5) errs.push(`4.${idx}.6 Checklist deve ter no mínimo 5 itens.`);
        (d.acceptance.checklist || []).forEach((it, j) => {
          if (containsFuzzy(it) && !containsSomeUnitOrNumber(it)) errs.push(`4.${idx}.6 Checklist item ${j + 1} parece subjetivo. Torne verificável.`);
        });
      } else if (d.acceptance.mode === "Métrica") {
        const v = (d.acceptance.metric?.value ?? "").toString().trim();
        const u = (d.acceptance.metric?.unit ?? "").toString().trim();
        if (!v) errs.push(`4.${idx}.6 Métrica: informe o valor/limite.`);
        if (!u) errs.push(`4.${idx}.6 Métrica: informe a unidade (s, %, mm...).`);
      } else if (d.acceptance.mode === "Evidência") {
        if (!d.acceptance.evidenceType) errs.push(`4.${idx}.6 Evidência: selecione um tipo anexável (foto/vídeo/log/relatório/arquivo).`);
      }
    });
  }

  if (step === 5) {
    const ms = state.step5.milestones || [];
    if (ms.length < 1) errs.push("8: Crie pelo menos 1 milestone.");

    if ((state.step4.deliverables || []).length < 1) {
      errs.push("8: Você precisa ter entregáveis (Etapa 4) antes de finalizar milestones.");
      return errs;
    }

    let sum = 0;
    ms.forEach((m, i) => {
      const idx = i + 1;
      if (!m.name.trim()) errs.push(`8.${idx}.1 Nome do milestone é obrigatório.`);
      if (!m.deliverableIds || m.deliverableIds.length < 1) errs.push(`8.${idx}.2 Selecione pelo menos 1 entregável.`);
      const v = Number(m.valuePct || 0);
      if (!m.valuePct || v <= 0) errs.push(`8.${idx}.4 Informe o valor (%) do milestone.`);
      sum += v;

      const minD = Number(m.etaMinDays || 0);
      const maxD = Number(m.etaMaxDays || 0);
      if (!minD || !maxD) errs.push(`8.${idx}.5 Informe faixa de prazo (mín e máx).`);
      else if (minD > maxD) errs.push(`8.${idx}.5 Prazo mínimo não pode ser maior que o máximo.`);

      const raw = `${m.etaMinDays} ${m.etaMaxDays}`.toLowerCase();
      if (raw.includes("quando der")) errs.push(`8.${idx}.5 Não aceitamos “quando der”. Use uma faixa numérica.`);

      const cl = m.acceptChecklist || [];
      if (cl.length < 2) errs.push(`8.${idx}.3 Aceite do milestone: inclua pelo menos 2 itens de checklist.`);
      if (!m.evidenceMin.trim()) errs.push(`8.${idx}.3 Aceite do milestone: defina evidências mínimas.`);
    });

    if (Math.round(sum) !== 100) {
      errs.push(`8.4 A soma dos percentuais deve ser 100%. Atualmente: ${sum}%.`);
    }
  }

  return errs;
}
