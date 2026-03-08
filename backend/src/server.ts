import { createServer } from "node:http";
import { createConnection } from "node:net";

// Definimos a porta de forma configurável por variável de ambiente.
// Isso ajuda a aprender um conceito bem comum: ambientes diferentes
// (desenvolvimento, teste, produção) podem rodar em portas diferentes.
const port = Number(process.env.PORT) || 3333;
const postgresHost = process.env.PGHOST || "localhost";
const postgresPort = Number(process.env.PGPORT) || 5432;

function testPostgresConnection(timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: postgresHost, port: postgresPort });

    socket.once("connect", () => {
      socket.end();
      resolve();
    });

    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error("Timeout ao conectar no PostgreSQL"));
    });
  });
}

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

  // Endpoint para validar se o backend consegue alcançar o PostgreSQL local.
  if (method === "GET" && url === "/test-db") {
    response.setHeader("Content-Type", "application/json");

    testPostgresConnection()
      .then(() => {
        response.writeHead(200);
        response.end(JSON.stringify({ database: "connected" }));
      })
      .catch(() => {
        response.writeHead(500);
        response.end(JSON.stringify({ database: "error" }));
      });

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
  console.log(`✅ Teste de banco em http://localhost:${port}/test-db`);
});
