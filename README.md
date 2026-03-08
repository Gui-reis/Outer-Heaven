# Outer Heaven

Monorepo simples com separação entre frontend e backend:

- `frontend/`: app React + TypeScript + Vite.
- `backend/`: servidor Node.js + TypeScript com endpoint `GET /health`.

## Documentação com TypeDoc

Este repositório agora está preparado para gerar documentação de API TypeScript com **TypeDoc** em cada pacote.

### Frontend

```bash
cd frontend
npm install
npm run docs
```

- Saída gerada em: `frontend/docs/api`.
- Modo watch: `npm run docs:watch`.

### Backend

```bash
cd backend
npm install
npm run docs
```

- Saída gerada em: `backend/docs/api`.
- Modo watch: `npm run docs:watch`.

## Como escrever comentários para aparecer na documentação

O TypeDoc lê comentários em formato TSDoc/JSDoc. Exemplo:

```ts
/**
 * Calcula o total do pedido.
 * @param subtotal Valor base.
 * @param taxa Taxa adicional.
 * @returns Total final com taxa aplicada.
 */
export function calcularTotal(subtotal: number, taxa: number): number {
  return subtotal + taxa;
}
```

Depois de adicionar comentários, rode `npm run docs` novamente para atualizar o HTML.
