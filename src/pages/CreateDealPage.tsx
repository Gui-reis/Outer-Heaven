import { useEffect, useMemo, useState } from "react";
import "../styles/wizard.css";
import { buildExport, clamp, defaultState, newDeliverable, STORAGE_KEY } from "../wizard/wizardLogic";
import { SideNav } from "./create-deal/components/SideNav";
import { TopBar } from "./create-deal/components/TopBar";
import { useWizardState } from "./create-deal/hooks/useWizardState";
import { Step0 } from "./create-deal/steps/Step0";
import { Step1 } from "./create-deal/steps/Step1";
import { Step2 } from "./create-deal/steps/Step2";
import { Step3 } from "./create-deal/steps/Step3";
import { Step4 } from "./create-deal/steps/Step4";
import { Step5 } from "./create-deal/steps/Step5";
import { Step6 } from "./create-deal/steps/Step6";
import { type Errors, validateStep } from "./create-deal/validation/validateStep";

export default function CreateDealPage() {
  /**
   * Fluxo [21]: página principal do wizard de criação de deal (orquestração/layout).
   * - Quem chama: App quando a rota ativa é "/create".
   */
  const { state, setState, update } = useWizardState();
  /**
   * Fluxo [21.2]: controla qual etapa (0..6) está visível no painel.
   * - Quem chama: render da própria CreateDealPage e handlers de navegação.
   */
  const [currentStep, setCurrentStep] = useState<number>(0);
  /**
   * Fluxo [21.3]: armazena erros de validação da etapa atual para feedback visual.
   * - Quem chama: showErrors/clearErrors.
   */
  const [errors, setErrors] = useState<Errors>([]);
  /**
   * Fluxo [21.4]: buffer local do checklist de milestones para não perder ENTER/ESPAÇO durante edição.
   * - Quem chama: render de Step5 e sincronização via useEffect.
   */
  const [milestoneChecklistText, setMilestoneChecklistText] = useState<string[]>(() => (state.step5.milestones || []).map((m) => (m.acceptChecklist || []).join("\n")));

  useEffect(() => {
    /**
     * Fluxo [21.4.1]: mantém buffer textual alinhado quando quantidade de milestones muda.
     * - Quem chama: ciclo de efeitos do React quando state.step5.milestones.length muda.
     */
    setMilestoneChecklistText((prev) => {
      const ms = state.step5.milestones || [];
      const next = ms.map((m, i) => prev[i] ?? (m.acceptChecklist || []).join("\n"));
      return next;
    });
  }, [state.step5.milestones.length]);

  const pct = useMemo(() => Math.round((currentStep / 6) * 100), [currentStep]);

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

  function clearErrors() {
    /**
     * Fluxo [22]: limpa mensagens de erro antes de nova validação/navegação.
     * - Quem chama: goToStep, onNext, onBack e resetAll.
     */
    setErrors([]);
  }

  function showErrors(errs: Errors) {
    /**
     * Fluxo [23]: registra erros e rola até #errors para feedback imediato.
     * - Quem chama: goToStep e onNext quando validação falha.
     */
    setErrors(errs);
    requestAnimationFrame(() => {
      document.getElementById("errors")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goToStep(target: number) {
    /**
     * Fluxo [24]: navegação lateral com validação da etapa corrente antes de sair.
     * - Quem chama: clique nos botões da SideNav.
     */
    const t = clamp(target, 0, 6);
    const errs = validateStep(currentStep, state);
    if (errs.length) {
      showErrors(errs);
      return;
    }
    clearErrors();
    setCurrentStep(t);
  }

  function onNext() {
    /**
     * Fluxo [25]: avança etapa somente se validação da atual passar.
     * - Quem chama: botão "Avançar" (#btnNext).
     */
    const errs = validateStep(currentStep, state);
    if (errs.length) {
      showErrors(errs);
      return;
    }
    clearErrors();
    setCurrentStep((s) => clamp(s + 1, 0, 6));
  }

  function onBack() {
    /**
     * Fluxo [26]: volta uma etapa sem validar conteúdo.
     * - Quem chama: botão "Voltar" (#btnBack).
     */
    clearErrors();
    setCurrentStep((s) => clamp(s - 1, 0, 6));
  }

  function resetAll() {
    /**
     * Fluxo [27]: reinicia wizard (estado + localStorage) mantendo defaults mínimos de entregável/milestone.
     * - Quem chama: TopBar via botão "Reset" (#btnReset).
     */
    if (!confirm("Tem certeza que deseja limpar os dados do wizard?")) return;
    localStorage.removeItem(STORAGE_KEY);
    const s = defaultState();
    s.step4.deliverables = [newDeliverable()];
    s.step5.milestones = [{ name: "", deliverableIds: [], acceptChecklist: [], evidenceMin: "", valuePct: "", etaMinDays: "", etaMaxDays: "" }];
    setState(s);
    setMilestoneChecklistText((s.step5.milestones || []).map((m) => (m.acceptChecklist || []).join("\n")));
    setCurrentStep(0);
    clearErrors();
  }

  async function copyJson() {
    /**
     * Fluxo [28]: copia o JSON final para clipboard.
     * - Quem chama: Step6 via botão "Copiar JSON" (#btnExport).
     */
    const json = JSON.stringify(buildExport(state), null, 2);
    await navigator.clipboard.writeText(json);
    alert("JSON copiado!");
  }

  function downloadJson() {
    /**
     * Fluxo [29]: faz download local do JSON final.
     * - Quem chama: Step6 via botão "Baixar .json" (#btnDownload).
     */
    const json = JSON.stringify(buildExport(state), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outerheaven_deal.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const isLocationVisible = state.step0.executionMode === "Presencial" || state.step0.executionMode === "Híbrido";
  const summaryJson = useMemo(() => JSON.stringify(buildExport(state), null, 2), [state]);

  return (
    <div>
      <div className="bg" aria-hidden="true">
        <div className="blob blob--a"></div>
        <div className="blob blob--b"></div>
        <div className="noise"></div>
      </div>

      <TopBar onReset={resetAll} />

      <main className="shell">
        <SideNav currentStep={currentStep} pct={pct} goToStep={goToStep} />

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

          <Step0 currentStep={currentStep} state={state} update={update} isLocationVisible={isLocationVisible} />
          <Step1 currentStep={currentStep} state={state} update={update} />
          <Step2 currentStep={currentStep} state={state} update={update} />
          <Step3 currentStep={currentStep} state={state} update={update} />
          <Step4 currentStep={currentStep} state={state} update={update} />
          <Step5
            currentStep={currentStep}
            state={state}
            update={update}
            milestoneChecklistText={milestoneChecklistText}
            setMilestoneChecklistText={setMilestoneChecklistText}
          />
          <Step6 currentStep={currentStep} summaryJson={summaryJson} copyJson={copyJson} downloadJson={downloadJson} />

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
