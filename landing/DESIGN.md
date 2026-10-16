# Landing page do Operator: plano de design

Página estática em `landing/` (HTML, CSS e JS sem build), publicada como um segundo site no Netlify.
Construída com as skills de `.claude/skills/` (direção sorteada pela `design-taste-frontend`).

## Brief

- **Produto:** Operator, gerenciador de projetos pessoal com cara de terminal de fósforo verde.
- **Público:** devs e pessoas que vivem no terminal (Linux, Vim, Git), começando pelo público brasileiro.
- **Trabalho da página:** fazer a pessoa abrir o app (grátis, sem conta) e, para quem quiser, entrar na lista do Sync Pro.
- **Modo (impeccable):** Persuade.

## A ideia

> Nesta página, **o prompt Ctrl+K do Operator** vira **o próprio hero**: um fragmento que funciona, onde o
> visitante digita `git status`, `+ comprar café #casa` ou `theme roxo` e a página responde.

Teste do concorrente: trocar Operator por Todoist ou Notion quebra a frase (nenhum tem prompt estilo git
nem temas de fósforo). A **coisa viva** é o prompt; o comando `theme` repinta a página inteira.

Direção sorteada: `product-performs` (seed 2071797023), hero "Sentence split by a frame", movimento
"Pinned story". Paleta e tipografia mantidas da marca (`--keep palette,type`).

## Exceção de marca (registrada)

As skills tratam monospace, fundo quase preto com verde e bordas finas como sinais de página gerada.
No Operator isso é o produto real, então:

- **Monospace fica** (JetBrains Mono, a fonte do app). Inspetor rodado com `--allow mono`.
- **Todo o resto das regras vale:** sem eyebrows, sem numeração 01/02/03, sem gradiente, sem sombra em
  repouso, sem linhas finas fora dos fragmentos do produto (`data-ui`), sem rótulos minúsculos em caixa alta.
- O brilho de fósforo (`text-shadow`) e as bordas de 1px só aparecem dentro dos fragmentos `data-ui`,
  onde são a convenção do próprio app.

## Tokens

Cor (tema Matrix; os outros 7 temas giram o matiz em OKLCH, igual ao app):

| Papel | Hex | Uso |
|---|---|---|
| `--bg` | `#030704` | chão da página |
| `--surface` | `#071008` | um passo acima (painéis, chamadas) |
| `--surface-2` | `#0b1a0e` | segundo passo (tiles do FAQ) |
| `--ink` | `#86efac` | texto corrido (14,4:1) |
| `--ink-strong` | `#dcfce7` | títulos (18,5:1) |
| `--muted` | `#4f9a6a` | texto secundário (5,9:1) |
| `--accent` | `#22c55e` | ação principal (texto `#03140a` sobre ele: 8,3:1) |

Tipo: JetBrains Mono variável (auto-hospedada, OFL). Cinco tamanhos: 14px (UI, nav), 17px (texto),
22px (linha de apoio), até 36px (frases das faixas, regra de "statement"), clamp(40px, 4vw, 64px) (hero).

Forma: cantos retos em tudo fora do produto. Um botão (bloco sólido, sem raio).

Movimento: easing `cubic-bezier(0.22, 1, 0.36, 1)`; pressão 140ms; revelações 700–900ms;
`prefers-reduced-motion` desliga deslocamentos e o carrossel fixo.

## Layout

```
┌──────────────────────────────────────────────┐
│ Operator            Prompt Recursos Perguntas [Abrir o Operator]
│                                              │
│ Seus projetos   ┌────────────┐  num terminal │  ← frase dividida pelo quadro
│                 │ prompt vivo│               │    (o carrossel passa pelo quadro
│                 └────────────┘               │     enquanto a frase fica parada)
│ Tarefas, notas e snippets…                   │
└──────────────────────────────────────────────┘
  Do prompt ao feito      [tarefa: nova]
             em foco      [tarefa: hover, checkbox vivo]
               feita      [tarefa: concluída]
  ███ Deixe a chuva Matrix cair no fundo.  [on] ███  ← faixas com interruptores reais
  ░░░ Ouça um clique a cada comando.       [off] ░░░
  Tudo pelo Ctrl+K   chamada → resposta (3x, a última abre largura)
  Me chame para o Sync Pro em [e-mail] [Entrar na fila]
  Perguntas (fixo) | acordeão de tiles
  rodapé em uma linha
```

Alinhamento à esquerda; nada centralizado além do quadro do hero.

## Revisão contra os padrões genéricos

- Hero com número grande e estatísticas: **não usado**.
- Cards iguais com ícone: **não usados**; recursos são faixas com interruptores que funcionam.
- Eyebrow acima de título, `01 / 02 / 03`, meta com pontos médios: **não usados**.
- Fundo preto com um único verde neon (padrão 2 da `frontend-design`): **é a marca**; a página compensa
  com os 8 temas (cada faixa de recurso acende num fósforo diferente) e com o produto de verdade na tela.

## Imagens

Todas são telas reais do app (capturadas com Playwright a partir do build local, dados de exemplo do
próprio app) ou fragmentos HTML marcados com `data-ui`. Nenhuma foto de banco, nenhum depoimento ou
número inventado.

## Verificação (16/10/2026)

| Checagem | Resultado |
|---|---|
| `lint.mjs` (taste-skill) | 0 FAIL. 9 avisos de contorno de 1px, todos em fragmentos `data-ui` (tags, tarefas, interruptores), que é como o app desenha. |
| `inspect.mjs --allow mono,covered-text` a 1440, 768 e 390 px | 0 FAIL, 1 aviso (abaixo). |
| CSP de produção (`netlify.toml`) servida localmente | 0 bloqueios. |
| Teste funcional (Playwright) | 28/28: prompt, temas, Ctrl+K, interruptores, tarefa viva, copiar, lista de espera (sucesso, 409, e-mail inválido, armadilha), sem JS, movimento reduzido, vídeo. |

Liberações do inspetor, com motivo:

- **`mono`**: identidade da marca (seção "Exceção de marca").
- **`covered-text`**: a única coisa "por cima" do texto é a camada de scanlines do CRT, uma textura
  translúcida em tela cheia que o visitante desliga numa das faixas. Rodando o inspetor numa cópia sem
  essa camada, `covered-text` dá 0 ocorrências.
- Aviso `pinned-over-picture`: o "quadro" atrás da frase fixa é o canvas da chuva (fundo). Nenhuma
  imagem do carrossel cruza a frase.

Ajustes feitos na crítica das capturas: espaço entre seções reduzido (havia duas telas vazias), 11
tamanhos de fonte reduzidos a 7, contraste do texto secundário de 5,9:1 para 7:1, máscara de revelação
movida para dentro do elemento observado (as imagens PC + celular não apareciam), vídeo regravado sem o
modal escurecendo o app, frase do CTA quebrando antes do campo.

## Para confirmar antes de divulgar

- Texto do Sync Pro ("plano pago que estamos preparando, com mais espaço para anexos"): confirme se é isso.
- Dados de exemplo nos fragmentos (`lancamento-beta`, tarefas e tags) são ilustrativos.
- Página de privacidade: o contato é por resposta ao e-mail ou issue no GitHub.
