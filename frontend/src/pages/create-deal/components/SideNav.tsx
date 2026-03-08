type SideNavProps = {
  currentStep: number;
  pct: number;
  goToStep: (n: number) => void;
};

export function SideNav({ currentStep, pct, goToStep }: SideNavProps) {
  /** Fluxo [33.2]: barra lateral com progresso e navegação por etapa. Quem chama: CreateDealPage. */
  return (
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
          <button key={s.n} className={`step ${currentStep === s.n ? "active" : ""}`} data-step={s.n} type="button" onClick={() => goToStep(s.n)}>
            <span className="step__n">{s.n === 6 ? "✓" : s.n}</span> {s.label}
          </button>
        ))}
      </nav>

      <p className="side__hint">Dica: itens em lista são “1 por linha”. O wizard valida e sugere ajustes quando detectar ambiguidade.</p>
    </aside>
  );
}
