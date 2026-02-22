type Step6Props = {
  currentStep: number;
  summaryJson: string;
  copyJson: () => Promise<void>;
  downloadJson: () => void;
};

export function Step6({ currentStep, summaryJson, copyJson, downloadJson }: Step6Props) {
  /** Fluxo [32.6]: renderiza resumo final e ações de exportação. Quem chama: CreateDealPage. */
  return (
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
  );
}
