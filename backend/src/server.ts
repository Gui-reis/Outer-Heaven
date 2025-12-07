import http, { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

type WorkType = "remote" | "hybrid" | "onsite";

type Opportunity = {
  id: number;
  title: string;
  company: string;
  work_type: WorkType;
  duration?: string;
  payment?: string;
  location?: string;
  skills?: string;
  description?: string;
};

// "Banco de dados" em memória por enquanto
let nextId = 3;
const opportunities: Opportunity[] = [
  {
    id: 1,
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
    id: 2,
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

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    const method = req.method || "GET";
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // CORS básico pra permitir o front em outro localhost/porta
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rota: GET /opportunities
    if (url.pathname === "/opportunities" && method === "GET") {
      sendJson(res, 200, opportunities);
      return;
    }

    // Rota: POST /opportunities
    if (url.pathname === "/opportunities" && method === "POST") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        try {
          const data = JSON.parse(body);

          // Validação bem simples de exemplo
          if (!data.title || !data.company || !data.work_type) {
            sendJson(res, 400, {
              error: "title, company e work_type são obrigatórios"
            });
            return;
          }

          const newOpportunity: Opportunity = {
            id: nextId++,
            title: String(data.title),
            company: String(data.company),
            work_type: data.work_type as WorkType,
            duration: data.duration ? String(data.duration) : undefined,
            payment: data.payment ? String(data.payment) : undefined,
            location: data.location ? String(data.location) : undefined,
            skills: data.skills ? String(data.skills) : undefined,
            description: data.description
              ? String(data.description)
              : undefined
          };

          opportunities.unshift(newOpportunity);
          sendJson(res, 201, newOpportunity);
        } catch (err) {
          console.error("Erro ao processar POST /opportunities:", err);
          sendJson(res, 400, { error: "JSON inválido" });
        }
      });

      return;
    }

    // Qualquer outra rota → 404
    sendJson(res, 404, { error: "Not found" });
  }
);

// Sobe o servidor na porta 3000
server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
