import { Link } from "react-router-dom";
import "../styles/styles.css";

export default function LandingPage() {
  return (
    <div>
      <div className="bg" aria-hidden="true">
        <div className="blob blob--a"></div>
        <div className="blob blob--b"></div>
        <div className="noise"></div>
      </div>

      <main className="wrap">
        <header className="header">
          <div className="logo">
            <span className="logo__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l8.5 4.8v10.4L12 22l-8.5-4.8V6.8L12 2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M12 6.5l5.6 3.2v4.6L12 17.5l-5.6-3.2V9.7L12 6.5z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </span>
            <span className="logo__text">OuterHeaven</span>
          </div>
        </header>

        <section className="center">
          <h1 className="headline">
            Transforme um acordo em <span className="accent">entregas objetivas</span> — sem ambiguidade.
          </h1>

          <div className="actions" aria-label="Ações principais">
            <Link className="btn btn--primary" to="/create">
              Criar deal
            </Link>
            <a className="btn btn--ghost" href="#">
              Entrar em deal
            </a>
          </div>

          <p className="hint">MVP 1×1 • convite por link/código</p>
        </section>
      </main>
    </div>
  );
}
