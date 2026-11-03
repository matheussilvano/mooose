# Guia de divulgação

Checklist para quem mantém o projeto. Divulgação boa é constante e honesta: mostre o que funciona, o que falta e como ajudar.

## Antes de postar
- [ ] README com prints reais, GIF de 20 s do fluxo (foto → nota) e o comando de instalação no topo
- [ ] Página do projeto no ar e link no campo *Website* do repositório
- [ ] 5 a 10 issues abertas e marcadas `good first issue` / `help wanted`, cada uma com contexto e arquivo sugerido
- [ ] GitHub Discussions ligado, com uma thread fixa "Apresente-se e conte como você usa"
- [ ] Imagem de preview social enviada (Settings → Social preview: `promo/assets/og.png`)
- [ ] Topics do repositório: `enem`, `redacao`, `llm`, `langgraph`, `ollama`, `openrouter`, `education`

## Onde postar (e como)
| Canal | Formato | Dica |
|---|---|---|
| X/Twitter | Thread: problema → demo (GIF) → como rodar → como ajudar | Poste de manhã, responda todos os comentários na primeira hora |
| LinkedIn | História: por que criou + decisões técnicas (LangGraph, regras em código, evals) | Marque quem ajudou; fale de aprendizados, não só de features |
| TabNews / r/brdev | "Show": como construí um corretor de ENEM open-source | Seja específico sobre limites (modelos grátis erram mais) |
| Hacker News | `Show HN:` em inglês, link para o repo | Terça a quinta, 9h a 11h (horário de Nova York) |
| dev.to / Medium | Artigo técnico: "Como calibrar notas de LLM com regras determinísticas" | Reaproveite os diagramas de `docs/ARCHITECTURE.md` |
| Professores e cursinhos | Mensagem direta + vídeo curto | Peça redações já corrigidas (com consentimento) para o dataset |

## Rascunhos
**X (thread, 1/4):** Abri o código do Mooose: um corretor de redação do ENEM open-source. Você traz a IA (tem opção grátis e até local com Ollama) e recebe nota por competência. 🧵

**LinkedIn:** Passei meses construindo um corretor de redação do ENEM e hoje abri o código. O que tem por dentro: 5 corretores em paralelo (LangGraph), regras do ENEM em código testado, nota da C5 por checklist e um script de avaliação. Falta um dataset de redações corrigidas por humanos: se você é professor(a) de redação, quero conversar.

## Como transformar curiosos em contribuidores
1. **Responda rápido** (em até 24 h) a toda issue e PR; o primeiro contato define se a pessoa volta.
2. **Issues pequenas e claras** ganham de issues grandes e vagas. Diga qual arquivo mexer.
3. **Agradeça em público** no changelog e no README (a seção de contribuidores já é automática).
4. **Mostre o impacto**: poste números reais (correções feitas, redações no dataset).
5. **Contribuição não-código conta**: testar modelos, revisar a rubrica, traduzir, divulgar.

## Medindo
Estrelas por semana, visitas únicas ao repo (Insights → Traffic), clones, issues abertas por pessoas novas e PRs mesclados de quem nunca contribuiu.
