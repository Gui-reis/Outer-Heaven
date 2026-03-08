import { createServer } from "node:http";

// Definimos a porta de forma configurável por variável de ambiente.
// Isso ajuda a aprender um conceito bem comum: ambientes diferentes
// (desenvolvimento, teste, produção) podem rodar em portas diferentes.
const port = Number(process.env.PORT) || 3333;

// Este servidor é o coração do backend.
// Ele recebe cada requisição HTTP e decide qual resposta enviar.
const server = createServer((request, response) => {
  // Pegamos método e URL da requisição para roteamento básico.
  const method = request.method;
  const url = request.url;

  // Endpoint mínimo solicitado:
  // GET /health -> retorna JSON com { ok: true }
  if (method === "GET" && url === "/health") {
    // Indicamos que o conteúdo da resposta é JSON.
    response.setHeader("Content-Type", "application/json");

    // Status 200 = sucesso.
    response.writeHead(200);

    // Enviamos um JSON simples.
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  // Qualquer rota não tratada cai aqui (404 Not Found).
  // Mantemos também em JSON para consistência.
  response.setHeader("Content-Type", "application/json");
  response.writeHead(404);
  response.end(JSON.stringify({ error: "Not Found" }));
});

// Inicia o servidor e deixa ele escutando na porta escolhida.
server.listen(port, () => {
  // Log simples para facilitar quando você estiver aprendendo.
  console.log(`✅ Backend rodando em http://localhost:${port}`);
  console.log(`✅ Health check em http://localhost:${port}/health`);
});
