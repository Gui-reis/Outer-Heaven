import type { WizardState } from "../../../wizard/wizardLogic";
import type { WizardUpdate } from "../hooks/useWizardState";

type Step2Props = { currentStep: number; state: WizardState; update: WizardUpdate };

export function Step2({ currentStep, state, update }: Step2Props) {
  /** Fluxo [32.2]: renderiza campos da Etapa 2. Quem chama: CreateDealPage. */
  return (
    <section className={`stepPane ${currentStep === 2 ? "active" : ""}`} data-pane="2">
      <h2>Etapa 2 — Stakeholders e decisão</h2>

      <div className="grid2">
        <div className="field">
          <label>2.1 Solicitante (ponto de contato)</label>
          <div className="row">
            <input id="requesterName" type="text" placeholder="Nome" value={state.step2.requesterName} onChange={(e) => update.step2.setRequesterName(e.target.value)} />
            <input id="requesterContact" type="text" placeholder="Contato (email/whats)" value={state.step2.requesterContact} onChange={(e) => update.step2.setRequesterContact(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>2.2 Aprovador final (decisor)</label>
          <div className="row">
            <input id="approverName" type="text" placeholder="Nome" value={state.step2.approverName} onChange={(e) => update.step2.setApproverName(e.target.value)} />
            <input id="approverRole" type="text" placeholder="Papel (ex.: gerente, dono, cliente)" value={state.step2.approverRole} onChange={(e) => update.step2.setApproverRole(e.target.value)} />
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
  );
}
