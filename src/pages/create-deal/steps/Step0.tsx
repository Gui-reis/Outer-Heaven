import type { WizardState } from "../../../wizard/wizardLogic";
import type { WizardUpdate } from "../hooks/useWizardState";

type Step0Props = { currentStep: number; state: WizardState; update: WizardUpdate; isLocationVisible: boolean };

export function Step0({ currentStep, state, update, isLocationVisible }: Step0Props) {
  /** Fluxo [32.0]: renderiza campos da Etapa 0. Quem chama: CreateDealPage. */
  return (
    <section className={`stepPane ${currentStep === 0 ? "active" : ""}`} data-pane="0">
      <h2>Etapa 0 — Identificação do serviço</h2>
      <div className="field">
        <label htmlFor="projName">0.1 Nome do projeto</label>
        <input id="projName" type="text" placeholder="Ex.: Landing page + formulário de contato" minLength={3} maxLength={80} value={state.step0.projectName} onChange={(e) => update.step0.setProjectName(e.target.value)} />
        <div className="help">3–80 chars. Evite nomes genéricos.</div>
      </div>
      <div className="field">
        <label>0.2 Categoria principal</label>
        <div className="radios" id="category">
          {["Digital/Software", "Design/Conteúdo", "Consultoria/Treinamento", "Serviço presencial", "Produção física", "Outro"].map((v) => (
            <label key={v}>
              <input type="radio" name="category" value={v} checked={state.step0.category === v} onChange={() => update.step0.setCategory(v)} /> {v}
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label>0.3 Local de execução</label>
        <div className="radios" id="executionMode">
          {["Remoto", "Presencial", "Híbrido"].map((v) => (
            <label key={v}>
              <input type="radio" name="executionMode" value={v} checked={state.step0.executionMode === v} onChange={() => update.step0.setExecutionMode(v)} /> {v}
            </label>
          ))}
        </div>

        <div className="row" id="locationRow" hidden={!isLocationVisible}>
          <input id="city" type="text" placeholder="Cidade" value={state.step0.city} onChange={(e) => update.step0.setCity(e.target.value)} />
          <input id="district" type="text" placeholder="Bairro (opcional)" value={state.step0.district} onChange={(e) => update.step0.setDistrict(e.target.value)} />
        </div>

        <div className="help">Se Presencial/Híbrido, informe cidade/bairro (sem endereço exato).</div>
      </div>
    </section>
  );
}
