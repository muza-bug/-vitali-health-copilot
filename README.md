# Vitali Health AI — Mobile App

A polished, navigable app for **Vitali Health AI** — a B2B platform that helps
hospital nursing teams share patient context and coordinate in real time.

When a nurse takes over a patient, they shouldn't have to rebuild the picture from
scratch (and the patient shouldn't have to repeat themselves). In Vitali, the first
nurse assigned creates a shared workspace — a **Circle** — for that patient, enters
the key context, and invites the team. Everyone who joins instantly sees the full
picture before they walk in the room. A push-to-talk walkie-talkie keeps the team
coordinated, a **live bedside-monitor stream** keeps vitals current, an **AI care
assistant** proposes the next steps, and everything is timestamped. Process metrics
are quietly captured as **anonymized** training insight.

> Runs fully on mock data so the demo never breaks — but the AI, voice, live data,
> and real-time features are wired to real services and degrade gracefully to mocks
> when a key or device capability is missing.

---

## What's in this build

- **App-open intro** — a short brand tour greets you each time you open the app.
- **Live data collection** — active Circles receive a continuous vitals stream
  (simulating bedside monitors); notable clinical changes (a falling SpO₂, a rising
  temp) post themselves to the timeline. Toggle it in **Profile → Live monitoring**.
- **AI care assistant (agent)** — reads each Circle's live context and proposes
  prioritized next steps you can accept with one tap, plus an AI-written **handoff
  briefing** — grounded only in that patient's data. Nothing is applied automatically.
- **Pluggable LLM backend** — the same AI features run on **Claude (Anthropic)**,
  a **local Ollama** model, or **AnythingLLM** (local RAG), chosen by an env var.
- **Self-hosted + Docker** — a one-command stack runs the app alongside Ollama and
  AnythingLLM for a fully local, private deployment.
- Full app flow: sign-in → My Shift → Circle (context, team, tasks, walkie-talkie,
  AI assistant, timeline) → Handoff → Insights → Profile / Team directory.

## Tech

- **React + TypeScript + Vite** — responsive, mobile-first, renders as a centered
  phone frame on desktop.
- **Plain CSS + design tokens** — no UI framework; the brand lives in
  [`src/styles/tokens.css`](src/styles/tokens.css).
- **Pluggable LLM core** ([`api/_llm.ts`](api/_llm.ts)) behind `/api/llm` — served by
  a Vercel function, a Vite dev middleware, OR the self-hosted Node server
  ([`server/index.ts`](server/index.ts)). The provider key never reaches the browser.
- **react-router-dom** for navigation, **lucide-react** for icons.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

The login screen is pre-filled — just tap **Sign in** (auth is mocked).

Other scripts: `npm run build` (type-check + bundle), `npm run preview` (serve the
build), `npm start` (self-hosted server that serves the build **and** `/api/llm`).

## Enable real AI

Copy the env template and pick a provider:

```bash
cp .env.example .env
```

| Provider | What it gives you | Set |
| --- | --- | --- |
| **Anthropic (Claude)** | Highest quality, hosted | `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY=sk-ant-…` |
| **Ollama** | Fully local, private, free | `LLM_PROVIDER=ollama` (run `ollama serve` + `ollama pull llama3.1`) |
| **AnythingLLM** | Local RAG over your own docs | `LLM_PROVIDER=anythingllm` + `ANYTHINGLLM_API_KEY=…` |
| `auto` (default) | First configured of the above | — |

Without any provider, the AI features fall back to on-device heuristics and
everything still runs. Voice recording + transcription work on-device (Chrome/Edge)
with no key.

## Run the full local stack with Docker

Spin up the app + a local Ollama + AnythingLLM, no cloud and no API key:

```bash
docker compose up --build
docker compose exec ollama ollama pull llama3.1   # first run only
# open http://localhost:3000
```

- `app` → http://localhost:3000  ·  `ollama` → :11434  ·  `anythingllm` → :3001
- Defaults to `LLM_PROVIDER=ollama`. Override anything via your `.env` (see
  [`docker-compose.yml`](docker-compose.yml)).

## Architecture (the seams)

Everything that talks to a "backend" lives in [`src/services/`](src/services) so the
prototype can go live one file at a time without touching screens:

| File | Responsibility |
| --- | --- |
| `services/api.ts` | In-memory data store — swap method bodies for real HTTP |
| `services/llm.ts` ↔ `api/_llm.ts` | Browser client ↔ pluggable server-side model |
| `services/realtime.ts` | Live cross-window sync (BroadcastChannel → WebSocket) |
| `services/voice.ts` | Mic capture + on-device speech-to-text |
| `services/liveData.ts` | Live vitals stream (→ real device/FHIR feed) |
| `services/ehr.ts` | Pull patient context from the chart (→ FHIR) |
| `services/analytics.ts` | De-identified process metrics |

`src/store/AppContext.tsx` is the reactive layer over these; screens call `useApp()`.

## Developing with Cursor / AI agents

A [`.cursorrules`](.cursorrules) file documents the architecture and conventions for
Cursor's agent (and any AI coding assistant) so generated changes respect the seams.

## Privacy

AI runs server-side and patient identity never leaves a team's Circle for analytics;
process metrics carry no patient or nurse identity. **No real PHI** — every name,
room, and number here is invented. A production deployment handling real patient data
needs a BAA (or a fully local model like Ollama) and the usual HIPAA controls.
