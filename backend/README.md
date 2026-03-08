# Backend mínimo (Node.js + TypeScript)

Este backend foi criado para ser o mais simples possível.

## Objetivo atual

- Subir um servidor HTTP local.
- Ter apenas **1 endpoint**: `GET /health`.
- Retornar JSON:

```json
{ "ok": true }
```

## Como rodar

1. Entre na pasta `backend`:

```bash
cd backend
```

2. Instale dependências:

```bash
npm install
```

3. Rode em modo desenvolvimento:

```bash
npm run dev
```

4. Teste o endpoint:

```bash
curl http://localhost:3333/health
```

Você deve receber:

```json
{"ok":true}
```

## Arquivos importantes

- `src/server.ts`: servidor HTTP e roteamento mínimo.
- `tsconfig.json`: configuração do TypeScript.
- `package.json`: scripts e dependências do backend.
