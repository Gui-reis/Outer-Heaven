const STORAGE_KEY = "oh_opportunities";

// Dados iniciais (seed) – só usados se ainda não existir nada no localStorage
function getInitialOpportunities() {
  return [
    {
      title: "Desenvolvedor Frontend React",
      company: "TechWave Solutions",
      work_type: "remote",
      duration: "Projeto pontual",
      payment: "R$ 5.000 - R$ 7.000",
      location: "Qualquer lugar do Brasil",
      skills: "React · TypeScript · REST API",
      description:
        "Painel de controle em tempo real. Projeto de 3 meses com possibilidade de extensão."
    },
    {
      title: "Backend Python / Django",
      company: "FinTrack Digital",
      work_type: "hybrid",
      duration: "6 meses",
      payment: "R$ 8.000 / mês",
      location: "São Paulo - SP",
      skills: "Python · Django · PostgreSQL",
      description:
        "Desenvolvimento de APIs para sistema financeiro. Integrações e bancos relacionais."
    }
  ];
}

function loadOpportunities() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Erro ao ler oportunidades do localStorage:", e);
    }
  }

  const initial = getInitialOpportunities();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveOpportunities(opportunities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
}

let opportunities = loadOpportunities();

function getTagInfo(workType) {
  switch (workType) {
    case "remote":
      return { label: "Remoto", className: "card__tag--remote" };
    case "hybrid":
      return { label: "Híbrido", className: "card__tag--hybrid" };
    case "onsite":
      return { label: "Presencial", className: "card__tag--onsite" };
    default:
      return { label: "N/A", className: "" };
  }
}

function createCardElement(opportunity) {
  const { label, className } = getTagInfo(opportunity.work_type);

  const article = document.createElement("article");
  article.className = "card";

  article.innerHTML = `
    <div class="card__header">
      <h2 class="card__title">${opportunity.title}</h2>
      <span class="card__tag ${className}">${label}</span>
    </div>

    <p class="card__company">${opportunity.company}</p>

    <p class="card__description">
      ${opportunity.description || "Sem descrição fornecida."}
    </p>

    <ul class="card__meta">
      <li>⏱ ${opportunity.duration || "Não informado"}</li>
      <li>💰 ${opportunity.payment || "A combinar"}</li>
      <li>📍 ${opportunity.location || "Não informado"}</li>
    </ul>

    <div class="card__footer">
      <span class="card__skills">
        ${opportunity.skills || "Nenhuma skill informada"}
      </span>
      <button class="card__button">Ver detalhes</button>
    </div>
  `;

  return article;
}

function renderCards(cardsContainer) {
  if (!cardsContainer) return;
  cardsContainer.innerHTML = "";

  opportunities.forEach((op) => {
    const cardEl = createCardElement(op);
    cardsContainer.appendChild(cardEl);
  });
}

function setupForm(form) {
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    const newOpportunity = {
      title: formData.get("title"),
      company: formData.get("company"),
      work_type: formData.get("work_type"),
      duration: formData.get("duration"),
      payment: formData.get("payment"),
      location: formData.get("location"),
      skills: formData.get("skills"),
      description: formData.get("description")
    };

    // Adiciona nova oportunidade no início
    opportunities.unshift(newOpportunity);
    saveOpportunities(opportunities);

    // Limpa o form
    form.reset();

    // Opcional: redireciona para a página de oportunidades
    window.location.href = "oportunidades.html";
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const cardsContainer = document.getElementById("cards-container");
  const form = document.getElementById("job-form");

  // Se estiver na página de lista, renderiza cards
  if (cardsContainer) {
    renderCards(cardsContainer);
  }

  // Se estiver na página de criação, configura o form
  if (form) {
    setupForm(form);
  }
});
