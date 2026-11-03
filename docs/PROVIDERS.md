# Provedores de IA

Você escolhe o provedor na tela (`/corrigir`) ou via headers da API: `X-LLM-Provider`, `X-LLM-Model`, `X-LLM-Api-Key`.

| Provedor | id | Grátis? | Chave | Visão (foto) |
|---|---|---|---|---|
| OpenRouter | `openrouter` | modelos `:free` | https://openrouter.ai/keys | só modelos com visão |
| Google Gemini | `google` | camada gratuita do AI Studio | https://aistudio.google.com/apikey | sim |
| Groq | `groq` | camada gratuita | https://console.groq.com/keys | não |
| Ollama | `ollama` | 100% local | não precisa | sim (`MOOOSE_OLLAMA_VISION_MODEL`, padrão `qwen2.5vl:7b`) |
| OpenAI | `openai` | pago | https://platform.openai.com/api-keys | sim |
| Anthropic | `anthropic` | pago | https://console.anthropic.com | sim |
| Outro (OpenAI-compatível) | `custom` | — | — | — |

Os IDs de modelos gratuitos mudam toda semana, por isso a lista do OpenRouter é buscada **ao vivo** (`GET /v1/providers/openrouter/free-models`). Defaults podem ser trocados por variável (`MOOOSE_OPENROUTER_MODEL`, `MOOOSE_GOOGLE_MODEL`, …).

**Dica de qualidade:** modelos grandes (≥70B ou "flash/mini" modernos) corrigem bem; modelos pequenos oscilam — use `samples=3`.
Limites das camadas gratuitas variam e mudam; confira no site de cada provedor. Na camada gratuita do Google, os dados podem ser usados para melhorar produtos deles.

## E a minha assinatura (ChatGPT Plus / Claude Pro)?

Não dá, e não é por falta de vontade:
- Assinaturas de chat e **APIs são produtos separados**; a assinatura não gera chave de API.
- Reaproveitar o login/token OAuth de uma assinatura em um app de terceiros **viola os termos de uso** desses serviços e pode banir a conta.

Alternativas legítimas: as opções gratuitas acima, ou Ollama local. Se um provedor lançar login oficial por assinatura para apps de terceiros, a mudança é pequena (um novo item em `providers.py`) — PRs são bem-vindos.

## Servidor público: segurança
- Chaves BYOK nunca são salvas nem logadas.
- `base_url` customizada só com `MOOOSE_ALLOW_CUSTOM_BASE_URL=1` (evita SSRF).
- Limite por IP: `MOOOSE_RATE_LIMIT_PER_MIN` (padrão 20).
