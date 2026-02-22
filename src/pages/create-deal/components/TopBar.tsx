type TopBarProps = {
  onReset: () => void;
};

export function TopBar({ onReset }: TopBarProps) {
  /** Fluxo [33.1]: topo da página com ação de reset. Quem chama: CreateDealPage. */
  return (
    <header className="top">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2l8.5 4.8v10.4L12 22l-8.5-4.8V6.8L12 2z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 6.5l5.6 3.2v4.6L12 17.5l-5.6-3.2V9.7L12 6.5z" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
        <div className="brand__text">
          <div className="brand__name">OuterHeaven</div>
          <div className="brand__tag">Wizard • Deal 1×1</div>
        </div>
      </div>

      <div className="top__right">
        <button className="linkbtn" id="btnReset" type="button" title="Limpar dados salvos" onClick={onReset}>
          Reset
        </button>
      </div>
    </header>
  );
}
