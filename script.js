// Lista de oportunidades em memória (poderia vir de um backend depois)
const opportunities = [
  {
    title: "Desenvolvedor Frontend React",
    company: "TechWave Solutions",
    work_type: "remote",
    duration: "Projeto pontual",
    payment: "R$ 5.000 - R$ 7.000",
    location: "Qualquer lugar do Brasil",
    skills: "React · TypeScript · REST API",
    description:
      "Procura-se dev frontend para atuar em um painel de controle de dados em tempo real. Projeto de 3 meses com possibilidade de extensão."
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
      "Desenvolvimento de APIs para sistema financeiro. Experiência com integração de sistemas e bancos de dados relacionais é desejável."
  }
];

const form = document.getElementById("job-form");
const cardsContainer = document.getElementById("cards-container");

// Função utilitária: retorna rótulo e classe da tag pelo tipo de trabalho
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

// Cria o elemento DOM do card
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

// Renderiza todas as oportunidades na tela
function renderCards() {
  cardsContainer.innerHTML = ""; // limpa
  opportunities.forEach((op) => {
    const cardEl = createCardElement(op);
    cardsContainer.appendChild(cardEl);
  });
}

// Lida com o envio do formulário
form.addEventListener("submit", function (event) {
  event.preventDefault(); // impede o refresh da página

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

  // Adiciona no início da lista (aparece como o primeiro card)
  opportunities.unshift(newOpportunity);

  // Re-renderiza os cards
  renderCards();

  // Limpa o formulário
  form.reset();
});

// Render inicial ao carregar a página
renderCards();
