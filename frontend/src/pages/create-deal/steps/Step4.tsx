import type { Dispatch, SetStateAction } from "react";
import { linesToList, optionListValues, type WizardState } from "../../../wizard/wizardLogic";
import type { WizardUpdate } from "../hooks/useWizardState";

type Step4Props = {
  currentStep: number;
  state: WizardState;
  update: WizardUpdate;
  deliverableChecklistTextById: Record<string, string>;
  setDeliverableChecklistTextById: Dispatch<SetStateAction<Record<string, string>>>;
};

export function Step4({ currentStep, state, update, deliverableChecklistTextById, setDeliverableChecklistTextById }: Step4Props) {
  /** Fluxo [32.4]: renderiza campos dinâmicos de entregáveis da Etapa 4. Quem chama: CreateDealPage. */
  return (
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
                  <input type="text" maxLength={60} placeholder="Ex.: Relatório de diagnóstico" value={d.name} onChange={(e) => update.step4.updateDeliverable(idx, { name: e.target.value })} />
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
                  <textarea rows={3} placeholder="1–3 frases. Evite ‘bonito/profissional/intuitivo’ sem critério." value={d.description} onChange={(e) => update.step4.updateDeliverable(idx, { description: e.target.value })} />
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
                    <input type="text" placeholder="Formatos (ex.: PDF, PNG, SVG)" value={d.formats} hidden={!showFormats} onChange={(e) => update.step4.updateDeliverable(idx, { formats: e.target.value })} />
                    <input type="text" placeholder="Norma/padrão (ex.: ABNT, ISO...)" value={d.standard} hidden={!showStandard} onChange={(e) => update.step4.updateDeliverable(idx, { standard: e.target.value })} />
                  </div>

                  <div className="help">Se tipo=arquivo, exija formato.</div>
                </div>

                <div className="field">
                  <label>4.{idx + 1}.5 Critérios de aceitação (obrigatório)</label>
                  <div className="radios">
                    <label>
                      <input type="radio" name={`acc_${d.id}`} value="Checklist" checked={accMode === "Checklist"} onChange={() => update.step4.updateDeliverableAcceptance(idx, { mode: "Checklist" })} />
                      Checklist binária (mín. 5)
                    </label>
                    <label>
                      <input type="radio" name={`acc_${d.id}`} value="Métrica" checked={accMode === "Métrica"} onChange={() => update.step4.updateDeliverableAcceptance(idx, { mode: "Métrica" })} />
                      Métrica/limite (com unidade)
                    </label>
                    <label>
                      <input type="radio" name={`acc_${d.id}`} value="Evidência" checked={accMode === "Evidência"} onChange={() => update.step4.updateDeliverableAcceptance(idx, { mode: "Evidência" })} />
                      Evidência anexável
                    </label>
                  </div>

                  <div className="grid2" style={{ marginTop: 10 }}>
                    <textarea
                      rows={4}
                      placeholder="Checklist (1 por linha, min 5)"
                      hidden={!showChecklist}
                      value={deliverableChecklistTextById[d.id] ?? (d.acceptance.checklist || []).join("\n")}
                      onChange={(e) => {
                        const txt = e.target.value;
                        setDeliverableChecklistTextById((prev) => ({ ...prev, [d.id]: txt }));
                        update.step4.updateDeliverableAcceptance(idx, { checklist: linesToList(txt) });
                      }}
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
                        <select hidden={!showEvidence} value={d.acceptance.evidenceType} onChange={(e) => update.step4.updateDeliverableAcceptance(idx, { evidenceType: e.target.value })}>
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
  );
}
