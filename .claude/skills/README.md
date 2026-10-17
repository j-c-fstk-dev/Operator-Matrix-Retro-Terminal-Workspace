# Skills do projeto

Skills de design usadas pelo Claude Code neste repositório (landing page e UI).
Cada uma foi lida por inteiro antes de entrar aqui. Ficam versionadas para que
qualquer sessão use exatamente o mesmo conteúdo revisado.

| Skill | Origem (commit) | Licença | Alterações |
|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) (`dbd4588`) | Apache-2.0 | Nenhuma |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (`6af45ac`) | Apache-2.0 | Sem a pasta `scripts/` (o launcher baixa e executa um binário). O passo de Setup do `SKILL.md` foi reescrito para ler o contexto direto. Comandos `live`, `generate`, `hooks`, `doctor` e `pin` não funcionam aqui. |
| `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (`f624f37`) | MIT | Sem a pasta `evals/`. Scripts revisados: rodam com Node 22, não instalam pacotes, abrem só o Chrome local em modo headless e acessam apenas acervos abertos de imagens (Openverse, Wikimedia, Met, Art Institute, NASA). |
| `emil-design-eng` | [emilkowalski/skill](https://github.com/emilkowalski/skill) (`2d22863`) | MIT | Nenhuma |
| `stop-slop` | [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) (`8da1f03`) | MIT | Nenhuma |
| `web-interface-guidelines` | [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) (`command.md`, 2026-10-16) | MIT | Regras copiadas para dentro do `SKILL.md`. O original da Vercel (`vercel-labs/agent-skills`) baixa as regras da internet a cada uso. |

Não incluída: **UI/UX Pro Max**, porque depende de dezenas de scripts Python executados no projeto.

## Conflito conhecido com a identidade do Operator

`design-taste-frontend` e `frontend-design` tratam monospace, fundo quase preto com verde
neon e linhas finas como "cara de IA". No Operator, isso é o produto (um terminal de
fósforo verde). As duas skills dizem que a marca e o brief vencem as regras gerais, e a
landing page segue essa exceção, registrada no `landing/DESIGN.md`.
