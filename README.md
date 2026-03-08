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

## Personalização do TypeDoc (sim, dá para enriquecer bastante)

A parte visual padrão do TypeDoc é simples, mas o conteúdo pode ficar bem completo usando TSDoc/JSDoc.

- Para descrições longas: use texto normal + Markdown no bloco de comentário.
- Para explicações adicionais: use `@remarks`.
- Para exemplos de uso: use um ou mais blocos `@example`.
- Para avisos e cuidados: use `@throws`, `@deprecated`, `@see`.

Exemplo:

```ts
/**
 * Calcula o total do pedido.
 *
 * Aceita valores em moeda inteira (ex.: centavos) para evitar problemas de ponto flutuante.
 *
 * @param subtotal Valor base do pedido.
 * @param taxa Taxa adicional aplicada sobre o subtotal.
 * @returns Total final com taxa aplicada.
 *
 * @remarks
 * Regra de negócio atual: a taxa não pode ser negativa.
 *
 * @example
 * ```ts
 * calcularTotal(1000, 200) // 1200
 * ```
 *
 * @example
 * ```ts
 * calcularTotal(5000, 0) // 5000
 * ```
 */
export function calcularTotal(subtotal: number, taxa: number): number {
  return subtotal + taxa;
}
```

### Sobre “mostrar o código da função”

No TypeDoc padrão, o comportamento normal é mostrar assinatura/tipos e apontar para o arquivo de origem (com link), não renderizar o corpo completo da função dentro da página da API.

Se você quiser algo mais “rico”, existem 2 caminhos:

1. **Customizar comentários TSDoc** (mais simples e recomendado): já resolve exemplos, contexto, limitações, decisões de negócio.
2. **Usar tema/plugin customizado** (mais avançado): altera layout e pode enriquecer navegação/apresentação.

## Como escrever comentários para aparecer na documentação

O TypeDoc lê comentários em formato TSDoc/JSDoc. Depois de adicionar comentários, rode `npm run docs` novamente para atualizar o HTML.
