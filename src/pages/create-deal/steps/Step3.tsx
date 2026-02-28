import type { WizardState } from "../../../wizard/wizardLogic";
import type { WizardUpdate } from "../hooks/useWizardState";

type Step3Props = { currentStep: number; state: WizardState; update: WizardUpdate };

export function Step3({ currentStep, state, update }: Step3Props) {
  /** Fluxo [32.3]: renderiza campos da Etapa 3. Quem chama: CreateDealPage. */
  return (
    <section className={`stepPane ${currentStep === 3 ? "active" : ""}`} data-pane="3">
      <h2>Etapa 3 — Escopo (in / out)</h2>

      <div className="field">
        <label htmlFor="inScope">3.1 O que está INCLUÍDO? (5 a 15 bullets)</label>
        <textarea id="inScope" rows={7} placeholder={"1 por linha\nEvite “tudo”, “completo”, “total”..."} value={(state.step3.inScope ?? []).join("\n")} onChange={(e) => update.step3.setInScopeText(e.target.value)} />
        <div className="help">5–15 itens. Se aparecer “completo/total/tudo”, será pedido detalhamento.</div>
      </div>

      <div className="field">
        <label htmlFor="outScope">3.2 O que está EXPLICITAMENTE FORA do escopo? (mín. 3 bullets)</label>
        <textarea id="outScope" rows={6} placeholder={"1 por linha\nEx.: Não inclui hospedagem\nEx.: Não inclui criação de conteúdo"} value={(state.step3.outScope ?? []).join("\n")} onChange={(e) => update.step3.setOutScopeText(e.target.value)} />
        <div className="help">Obrigatório (protege muito contra disputa).</div>
      </div>

      <div className="field">
        <label htmlFor="assumptions">3.3 Assunções</label>
        <textarea id="assumptions" rows={5} placeholder={"1 por linha\nEx.: Cliente fornece acesso ao ambiente\nEx.: Dados estarão disponíveis"} value={(state.step3.assumptions ?? []).join("\n")} onChange={(e) => update.step3.setAssumptionsText(e.target.value)} />
      </div>
    </section>
  );
}
