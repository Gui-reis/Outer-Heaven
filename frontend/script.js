// URL base da sua API Node
const API_BASE_URL = "http://localhost:3000";

let opportunities = [];

// =============================
// 1. Carregar oportunidades (GET)
// =============================
async function loadOpportunitiesFromApi() {
  try {
    const response = await fetch(`${API_BASE_URL}/opportunities`);

    if (!response.ok) {
      console.error("Erro ao buscar oportunidades:", response.status);
      return;
    }

    opportunities = await response.json();
  } catch (err) {
    console.error("Erro de rede ao buscar oportunidades:", err);
  }
}

// =============================
// 2. Utilitários de UI
// =============================
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

// =============================
// 3. Criar oportunidade (POST)
// =============================
async function createOpportunityFromForm(form) {
  const formData = new FormData(form);

  const payload = {
    title: formData.get("title"),
    company: formData.get("company"),
    work_type: formData.get("work_type"),
    duration: formData.get("duration") || undefined,
    payment: formData.get("payment") || undefined,
    location: formData.get("location") || undefined,
    skills: formData.get("skills") || undefined,
    description: formData.get("description") || undefined
  };

  try {
    const response = await fetch(`${API_BASE_URL}/opportunities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("Erro ao criar oportunidade:", response.status, errorBody);
      alert("Erro ao criar oportunidade. Verifique os campos obrigatórios.");
      return;
    }

    const created = await response.json();
    console.log("Oportunidade criada com sucesso:", created);
  } catch (err) {
    console.error("Erro de rede ao criar oportunidade:", err);
    alert("Erro de rede ao criar oportunidade.");
  }
}

// =============================
// 4. Inicialização por página
// =============================
window.addEventListener("DOMContentLoaded", async () => {
  const cardsContainer = document.getElementById("cards-container");
  const form = document.getElementById("job-form");

  // Página de listagem: oportunidades.html
  if (cardsContainer) {
    await loadOpportunitiesFromApi();
    renderCards(cardsContainer);
  }

  // Página de criação: criar-oportunidade.html
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      await createOpportunityFromForm(form);

      // limpa o form
      form.reset();

      // redireciona para a lista
      window.location.href = "oportunidades.html";
    });
  }
});
