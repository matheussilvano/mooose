# Segurança

Encontrou uma vulnerabilidade? **Não abra uma issue pública.** Use *Security → Report a vulnerability* neste repositório.

Boas práticas já adotadas: chaves BYOK nunca são salvas nem logadas, `base_url` customizada fica desligada por padrão (anti-SSRF), saída da IA é sanitizada com DOMPurify no front, rate limit por IP. Se você publicar uma instância, **não** configure suas chaves como padrão do servidor sem limites.
