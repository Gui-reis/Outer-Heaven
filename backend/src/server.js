"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importStar(require("http"));
const url_1 = require("url");
// "Banco de dados" em memória por enquanto
let nextId = 3;
const opportunities = [
    {
        id: 1,
        title: "Desenvolvedor Frontend React",
        company: "TechWave Solutions",
        work_type: "remote",
        duration: "Projeto pontual",
        payment: "R$ 5.000 - R$ 7.000",
        location: "Qualquer lugar do Brasil",
        skills: "React · TypeScript · REST API",
        description: "Painel de controle em tempo real. Projeto de 3 meses com possibilidade de extensão."
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
        description: "Desenvolvimento de APIs para sistema financeiro. Integrações e bancos relacionais."
    }
];
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}
const server = http_1.default.createServer((req, res) => {
    const method = req.method || "GET";
    const url = new url_1.URL(req.url || "/", `http://${req.headers.host}`);
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
                const newOpportunity = {
                    id: nextId++,
                    title: String(data.title),
                    company: String(data.company),
                    work_type: data.work_type,
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
            }
            catch (err) {
                console.error("Erro ao processar POST /opportunities:", err);
                sendJson(res, 400, { error: "JSON inválido" });
            }
        });
        return;
    }
    // Qualquer outra rota → 404
    sendJson(res, 404, { error: "Not found" });
});
// Sobe o servidor na porta 3000
server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
//# sourceMappingURL=server.js.map