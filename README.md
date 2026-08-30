# AI Chat Assistant

A chat assistant built with **Next.js 14 (App Router) + TypeScript + React**, backed by the Claude API.

> Note: the brief mentioned Next.js 10, but this is built on Next.js 14, since 10 predates
> the App Router and the streaming primitives Phase 2 onward needs. Everything else
> (React, TypeScript, component structure) is the same skillset.

## Phase 1 — done ✅

- Chat UI (`components/ChatWindow.tsx`)
- Text input with disabled/loading states
- Send message → optimistic UI update
- API route (`app/api/chat/route.ts`)
- LLM integration via `@anthropic-ai/sdk`
- Response rendered as a chat bubble, with a typing indicator and error state

## Phase 5 — done ✅ (tool calling)

Two tools, wired end to end:

- **`getWeather(city)`** — real data, via Open-Meteo (free, no API key).
- **`searchProducts(query, brand, maxPrice)`** — mock Puma/Nike/Adidas catalog.
  There's no free public "search any store" API, so this runs against a small
  in-memory dataset in `lib/tools.ts`. To go live, replace the body of
  `searchProducts()` with a real call (SerpApi Google Shopping, RapidAPI
  real-time product search, or a retailer's own API) — keep the same return
  shape (`ProductsResult`) and the UI needs zero changes.

**How it works** (`app/api/chat/route.ts`):
1. User message + `tools` schema sent to Groq.
2. If the model responds with a `tool_call` (not text), we run the *real*
   function server-side — actually hitting Open-Meteo, or filtering the
   mock catalog.
3. The tool's result is sent back to the model in a second call, so it can
   write a short natural-language summary.
4. The route returns **both** `reply` (text) and `toolResults` (structured
   data) — the client renders `toolResults` as real cards
   (`WeatherCard.tsx`, `ProductGrid.tsx`) instead of the model describing
   data in prose.

Try it: "What's the weather in Nagpur?" or "Show me Puma shoes under 3000".

## Run it locally

```bash
npm install
cp .env.local.example .env.local   # then paste your real Groq key in
npm run dev
```

Open http://localhost:3000. Get a free key at https://console.groq.com/keys.

## Project structure

```
app/
  api/chat/route.ts   → server route that calls Claude
  layout.tsx           → fonts + global shell
  page.tsx              → page shell, renders ChatWindow
  globals.css
components/
  ChatWindow.tsx        → all client-side chat logic + UI
```

## How Phase 1 works, end to end

1. User types in `ChatWindow`, hits Send.
2. The full message list (client-side state) is POSTed to `/api/chat`.
3. `route.ts` runs server-side, calls `anthropic.messages.create()` with your
   `ANTHROPIC_API_KEY` (never exposed to the browser), and returns `{ reply }`.
4. `ChatWindow` appends the reply as a new bubble.

This "send full history every time" pattern is intentional — it's the simplest
correct way to give the model context, and it's exactly what Phase 3
(conversation history) will build on.

---

## Roadmap — what's next

### Phase 2 — Streaming
Right now the whole reply arrives at once (`anthropic.messages.create`).
Swap to `anthropic.messages.stream()` server-side and return a
`ReadableStream` from the route so tokens render as they arrive, like
ChatGPT/Claude's own UI. Client side: read the response body with
`res.body.getReader()` and append chunks to the last assistant message
as they come in.

### Phase 3 — Conversation history
Persist conversations (e.g. `localStorage` first, then a real DB like
Postgres/SQLite via Prisma). Add a sidebar to list/switch/delete past
chats. Each chat = an id + ordered message array.

### Phase 4 — Structured output
Use Claude's `tools` param (or a JSON-mode system prompt) to force
replies into a typed shape — e.g. `{ summary, actionItems[], sentiment }` —
validated with `zod`, so the UI can render structured cards instead of
plain text for certain queries.

### Phase 6 — RAG
Chunk + embed your own documents (e.g. `voyage-3` or OpenAI embeddings),
store vectors (pgvector / Pinecone), retrieve top-k relevant chunks per
user query, and inject them into the system prompt before calling
Claude — so answers are grounded in your own data.

---

## Turning this into a resume project

- Deploy it (Vercel is a one-click fit for Next.js).
- Write a short README section: architecture diagram, decisions made,
  trade-offs (e.g. why history is sent in full pre-Phase-3).
- Add tests for the API route (mock the Anthropic client).
- Once Phase 6 is done, this genuinely covers: full-stack TypeScript,
  API design, streaming, state management, structured data validation,
  tool/function calling, and RAG — a legitimately strong project.
