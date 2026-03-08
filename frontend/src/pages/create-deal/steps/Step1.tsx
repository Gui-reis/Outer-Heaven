import type { Dispatch, SetStateAction } from "react";
import type { WizardState } from "../../../wizard/wizardLogic";
import type { WizardUpdate } from "../hooks/useWizardState";

type Step1Props = {
  currentStep: number;
  state: WizardState;
  update: WizardUpdate;
  successBulletsText: string;
  setSuccessBulletsText: Dispatch<SetStateAction<string>>;
};

export function Step1({ currentStep, state, update, successBulletsText, setSuccessBulletsText }: Step1Props) {
  /** Fluxo [32.1]: renderiza campos da Etapa 1. Quem chama: CreateDealPage. */
  return (
    <section className={`stepPane ${currentStep === 1 ? "active" : ""}`} data-pane="1">
      <h2>Etapa 1 — Contexto e objetivos</h2>
      <div className="field">
        <label htmlFor="problem">1.1 Qual problema você quer resolver?</label>
        <textarea id="problem" rows={4} placeholder="Ex.: Hoje o time faz X manualmente; isso causa Y; queremos reduzir Z..." value={state.step1.problem} onChange={(e) => update.step1.setProblem(e.target.value)} />
        <div className="help">1–5 frases. Tente conter “hoje acontece X → isso causa Y”.</div>
      </div>

      <div className="field">
        <label htmlFor="successBullets">1.2 Objetivos</label>
        <textarea
          id="successBullets"
          rows={5}
          placeholder={"1 por linha\nEx.: Página carrega em até 2s em 4G\nEx.: Formulário envia email e salva no CRM"}
          value={successBulletsText}
          onChange={(e) => {
            const txt = e.target.value;
            setSuccessBulletsText(txt);
            update.step1.setSuccessBulletsText(txt);
          }}
        />
        <div className="help">3–5 itens, verificáveis. Se aparecer fuzzy word, o wizard vai pedir métrica/checklist.</div>
      </div>
    </section>
  );
}
