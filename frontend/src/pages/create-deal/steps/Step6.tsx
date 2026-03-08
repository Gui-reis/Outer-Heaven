import { type Deliverable, type Milestone, type WizardState, buildExport } from "../../../wizard/wizardLogic";

type ExportSummary = ReturnType<typeof buildExport>;
type Stakeholder = WizardState["step2"]["others"][number];

type Step6Props = {
  currentStep: number;
  summary: ExportSummary;
};

const emptyValue = "Não informado";

function showValue(value?: string) {
  const text = (value ?? "").trim();
  return text || emptyValue;
}

function ListBlock({ items }: { items: string[] }) {
  if (!items.length) return <p className="muted">{emptyValue}</p>;

  return (
    <ul>
      {items.map((item, idx) => (
        <li key={`${item}-${idx}`}>{item}</li>
      ))}
    </ul>
  );
}

export function Step6({ currentStep, summary }: Step6Props) {
  const { step0, step1, step2, step3, step4, step5 } = summary;

  return (
    <section className={`stepPane ${currentStep === 6 ? "active" : ""}`} data-pane="6">
      <h2>Contrato resumido</h2>
      <p className="muted">Confira abaixo o acordo em linguagem mais humana antes de finalizar.</p>

      <h3>1. Identificação do serviço</h3>
      <p><strong>Projeto:</strong> {showValue(step0.projectName)}</p>
      <p><strong>Categoria:</strong> {showValue(step0.category)}</p>
      <p><strong>Modo de execução:</strong> {showValue(step0.executionMode)}</p>
      <p><strong>Local:</strong> {[step0.city, step0.district].filter(Boolean).join(" - ") || emptyValue}</p>

      <h3>2. Problema e resultado esperado</h3>
      <p><strong>Contexto do problema:</strong> {showValue(step1.problem)}</p>
      <strong>Critérios de sucesso</strong>
      <ListBlock items={step1.successBullets || []} />

      <h3>3. Responsáveis e aprovadores</h3>
      <p><strong>Solicitante:</strong> {showValue(step2.requesterName)} ({showValue(step2.requesterContact)})</p>
      <p><strong>Aprovador:</strong> {showValue(step2.approverName)} ({showValue(step2.approverRole)})</p>
      <strong>Outros envolvidos</strong>
      {step2.others?.length ? (
        <ul>
          {step2.others.map((person: Stakeholder, idx: number) => (
            <li key={`${person.name}-${idx}`}>
              {showValue(person.name)} — {showValue(person.role)} {person.canBlock ? "(pode bloquear)" : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{emptyValue}</p>
      )}

      <h3>4. Escopo e premissas</h3>
      <strong>Itens dentro do escopo</strong>
      <ListBlock items={step3.inScope || []} />
      <strong>Itens fora do escopo</strong>
      <ListBlock items={step3.outScope || []} />
      <strong>Premissas</strong>
      <ListBlock items={step3.assumptions || []} />

      <h3>5. Entregáveis</h3>
      {step4.deliverables?.length ? (
        <ol>
          {step4.deliverables.map((deliverable: Deliverable) => (
            <li key={deliverable.id}>
              <p><strong>{showValue(deliverable.name)}</strong> ({showValue(deliverable.type)})</p>
              <p>{showValue(deliverable.description)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{emptyValue}</p>
      )}

      <h3>6. Marcos e aceite</h3>
      {step5.milestones?.length ? (
        <ol>
          {step5.milestones.map((milestone: Milestone, idx: number) => (
            <li key={`${milestone.name}-${idx}`}>
              <p><strong>{showValue(milestone.name)}</strong></p>
              <p><strong>Percentual:</strong> {showValue(milestone.valuePct)}%</p>
              <p><strong>Prazo:</strong> {showValue(milestone.etaMinDays)} a {showValue(milestone.etaMaxDays)} dias</p>
              <strong>Critérios de aceite</strong>
              <ListBlock items={milestone.acceptChecklist || []} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{emptyValue}</p>
      )}
    </section>
  );
}
