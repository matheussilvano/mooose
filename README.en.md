
# 🫎 Mooose — the open-source ENEM essay grader

<p align="center"><b><a href="https://mooose.matheussilvano.workers.dev">Project page</a></b> · <a href="CONTRIBUTING.md">Contribute</a> · <a href="https://github.com/sponsors/matheussilvano">Sponsor</a></p>

**Mooose** grades essays for **ENEM** (Brazil's national high-school exam) across its 5 official competencies (0–200 each) and tells students *how to improve*. It is fully open source: **bring your own LLM** (OpenRouter free models, Gemini free tier, Groq, local Ollama, OpenAI, Claude, any OpenAI-compatible API) and grade for free.

> Independent project, **not affiliated with INEP/MEC**. Scores are AI estimates for practice.

<p align="center">
  <img src="docs/assets/landing.jpg" alt="Landing page do Mooose" width="880">
</p>
<table>
  <tr>
    <td><img src="docs/assets/corretor.jpg" alt="Corretor open-source: escolha sua IA, envie foto ou texto"></td>
    <td><img src="docs/assets/resultado.jpg" alt="Resultado: nota final, feedback por competência"></td>
  </tr>
  <tr>
    <td align="center"><sub>Escolha sua IA (grátis ou não), envie foto ou texto</sub></td>
    <td align="center"><sub>Nota por competência com feedback acionável</sub></td>
  </tr>
</table>

## Why it's interesting for AI engineers
- **LangGraph pipeline**: theme analysis → 5 parallel specialist graders → senior-reviewer audit → deterministic calibration → synthesis ([architecture](docs/ARCHITECTURE.md)).
- **Provider-agnostic structured output**: JSON-in-prompt + Pydantic validation + one repair retry, so it works on free/local models without tool-calling.
- **Self-consistency**: N samples per competency, median wins; divergence is surfaced as a warning.
- **Hybrid LLM + rules**: C5 is graded by feature extraction (agent/action/means/purpose/detail) with the score computed in code; INEP annulment rules and tangency caps are plain, unit-tested Python.
- **Prompt-injection hardening**: essay text is delimited and treated as data.
- **Offline tests** with a scripted fake LLM + an [eval harness](backend/evals) (in-range rate, MAE, run-to-run stability) with optional LangSmith tracing.
- **BYOK, stateless API** with SSE progress streaming (`POST /v1/grade/stream`).

## Quick start
```bash
git clone https://github.com/matheussilvano/mooose && cd mooose
docker compose up --build        # UI http://localhost:8080/corrigir · API http://localhost:8000/docs
```
or run `uvicorn mooose_api.app:app` in `backend/` and `npm run dev` in `frontend/`.

## About subscriptions
ChatGPT Plus / Claude Pro don't include API access and using their logins in third-party apps violates the providers' terms, so Mooose doesn't do that. Use the free options instead — see [docs/PROVIDERS.md](docs/PROVIDERS.md).

## Contributing & support
See [CONTRIBUTING.md](CONTRIBUTING.md). Star the repo, sponsor via GitHub Sponsors, or send a PR. License: [Apache-2.0](LICENSE) (name and logo excluded, see [NOTICE](NOTICE)).
