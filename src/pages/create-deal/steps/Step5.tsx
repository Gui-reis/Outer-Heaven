import type { Dispatch, SetStateAction } from "react";
import { clamp, linesToList, type WizardState } from "../../../wizard/wizardLogic";
import type { WizardUpdate } from "../hooks/useWizardState";

type Step5Props = {
  currentStep: number;
  state: WizardState;
  update: WizardUpdate;
  milestoneChecklistText: string[];
  setMilestoneChecklistText: Dispatch<SetStateAction<string[]>>;
};

export function Step5({ currentStep, state, update, milestoneChecklistText, setMilestoneChecklistText }: Step5Props) {
  /** Fluxo [32.5]: renderiza milestones e mantém checklist textual em buffer. Quem chama: CreateDealPage. */
  return (
    <section className={`stepPane ${currentStep === 5 ? "active" : ""}`} data-pane="5">
      <h2>Etapa 5 — Milestones</h2>

      <div className="field">
        <label>5.1 Quantos milestones?</label>
        <div className="row">
          <input
            key={state.step5.milestones.length}
            id="milestoneCount"
            type="number"
            min={1}
            max={10}
            placeholder="3"
            defaultValue={state.step5.milestones.length ? String(state.step5.milestones.length) : ""}
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
                  <input type="text" placeholder="Ex.: Entrega do protótipo validado" value={m.name} onChange={(e) => update.step5.updateMilestone(idx, { name: e.target.value })} />
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
                            <input type="checkbox" checked={checked} onChange={(e) => update.step5.toggleMilestoneDeliverable(idx, d.id, e.target.checked)} />
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

                      update.step5.updateMilestone(idx, { acceptChecklist: linesToList(txt) });
                    }}
                  />

                  <input type="text" placeholder="Evidências mínimas (ex.: 1 vídeo + 3 prints + log)" value={m.evidenceMin} onChange={(e) => update.step5.updateMilestone(idx, { evidenceMin: e.target.value })} />
                </div>

                <div className="field">
                  <label>8.{idx + 1}.4 Valor (%)</label>
                  <input type="number" min={0} max={100} placeholder="Ex.: 30" value={m.valuePct} onChange={(e) => update.step5.updateMilestone(idx, { valuePct: e.target.value })} />
                  <div className="help">Total de todos milestones deve somar 100%.</div>

                  <label style={{ marginTop: 12 }}>8.{idx + 1}.5 Prazo estimado (faixa)</label>
                  <div className="row">
                    <input type="number" min={1} placeholder="mín dias" value={m.etaMinDays} onChange={(e) => update.step5.updateMilestone(idx, { etaMinDays: e.target.value })} />
                    <input type="number" min={1} placeholder="máx dias" value={m.etaMaxDays} onChange={(e) => update.step5.updateMilestone(idx, { etaMaxDays: e.target.value })} />
                    <span className="muted">dias</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
