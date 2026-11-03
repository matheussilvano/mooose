# Contribuindo com o Mooose

Obrigado por querer ajudar estudantes do ENEM! 🫎

## Setup
```bash
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && pytest -q
cd frontend && npm install && npm run build
```
Os testes não usam internet nem chaves de API (LLM falso). **Nunca** commite chaves, `.env`, dados de alunos ou redações reais sem consentimento por escrito.

## Fluxo
1. Abra uma issue (ou comente numa `good first issue`) antes de mudanças grandes.
2. Faça um fork, crie um branch, commits curtos no imperativo ("Add Groq vision support").
3. Abra o PR preenchendo o template. O CI (`pytest` + `npm run build`) precisa passar.

## Onde mexer
| Quero... | Arquivo |
|---|---|
| ajustar a rubrica/prompts | `backend/mooose_ai/rubric.py` |
| mudar regras de nota (anulação, tetos) | `backend/mooose_ai/calibration.py` (+ testes) |
| mudar o fluxo do agente | `backend/mooose_ai/graph.py` |
| adicionar um provedor | `backend/mooose_ai/providers.py` |
| UI do corretor aberto | `frontend/src/pages/OpenGraderPage.tsx` |

**Mudou prompt ou rubrica?** Rode `python -m evals.run_evals` antes e depois e cole os números no PR. Sem medir, não dá para saber se melhorou.

## Código de conduta
Seja respeitoso e construtivo. Críticas são sobre código, não sobre pessoas. Assédio ou discriminação levam a banimento. Problemas: abra um aviso privado conforme o [SECURITY.md](SECURITY.md).
