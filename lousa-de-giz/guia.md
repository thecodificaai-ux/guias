# Lousa de giz em código: a técnica inteira

Guia do @ayrton.vercosa (Thecodifica) para o seu assistente de IA. Leia de cima a baixo e conduza a pessoa um passo de cada vez.

## Como usar este guia (para o assistente)
0. **Comece pelo template**: https://thecodificaai-ux.github.io/guias/lousa-de-giz/template/ tem o código exato do Reel (`QuadroNegro.tsx`, `BuracoNegro.tsx`, `Exemplo.tsx`, `paleta.ts`, `pontilhar.py`) e o `LEIA-ME.md` com a montagem. Baixe os arquivos, monte, rode o exemplo e mostre à pessoa antes de adaptar. Não reescreva o buraco negro do zero: a descrição abaixo explica o código, não o substitui.
1. Comece pela prova `provas/prisma-pico-lua.html` (abra no navegador): é um arquivo HTML só, com SVG e CSS. Recrie algo parecido no projeto da pessoa, mostre funcionando e só então siga.
2. Depois o pontilhado: `provas/foto-em-pontilhado.html` mostra o algoritmo inteiro em JavaScript (brilho por célula, curva em S, difusão de erro com ruído no limiar, cor por faixa de luz).
3. Para vídeo, use o Remotion (https://www.remotion.dev): cada traço vira função do quadro (`useCurrentFrame`), nada aleatório sem semente.
4. Pergunte à pessoa as cores da marca dela antes de começar; use só elas (3 gizes e misturas).
5. Não use ferramenta paga de imagem. Pessoa com volume: só foto (dela ou de domínio público) virada em pontilhado.

Provas: https://thecodificaai-ux.github.io/guias/lousa-de-giz/provas/

---

## Para que serve
Cara de aula na lousa: fundo preto de verdade, gizes coloridos da paleta, e duas técnicas que convivem no mesmo quadro. **Traço de giz** para o que é linha (objeto, ícone, diagrama, seta, montanha, lua, prisma, texto), escrito na tela no tempo da fala. **Pontilhado** para o que tem volume (pessoa, rosto, cena real), feito de uma foto do acervo ou de um still de IA, soprado na lousa ponto a ponto. Bom para explicação com diagrama, metáfora visual (prisma, montanha, fios), "isso já aconteceu" com foto de época e capa de Reel. Pedido do Ayrton em 2026-10-21; provas em as provas desta página (`provas/`).

## Regras
- R1: Fundo **preto puro** (`--paleta-preto`), nunca o noite. Poeira (ruído SVG) com opacidade ≤ 0,07 e marca de apagador em faixas de creme a 3–4 %; moldura e calha de giz em terracota-clara misturada ao preto (`color-mix` ≤ 22 %). 
- R2: Gizes = paleta e só paleta: creme (giz branco), terracota-clara (laranja), verde-suave (verde) e as misturas por `color-mix` (salmão = terracota-clara 45 % + creme; menta = verde-suave 50 % + creme; ocre = terracota-clara 50 % + verde-suave). Nenhum hex novo. 
- R3: Traço de giz é `path` SVG com o filtro de giz (`feTurbulence` 1,4 + `feDisplacementMap` escala 2,4 + alfa quebrado) e escreve com `stroke-dashoffset` (0,9 s por traço, em sequência). O filtro fica **fora** do grupo da câmera, senão o deslocamento escala junto. Texto em `var(--fonte-manuscrita)` (Caveat 600) com o mesmo filtro; rótulo e número em `var(--fonte-mono)`. 
- R4: **O que é traço:** objeto, ícone Lucide do kit com o filtro, diagrama, seta, círculo torto, sublinhado, montanha, lua, prisma, cena geométrica e texto. Figura humana só como figura de linha simples, poucas linhas, proporção de croqui (cabeça 1,4:1), sem volume (prova 02). 
- R5: **Pessoa com volume é pontilhado de foto ou still, nunca mapa de luz desenhado.** Fonte: foto do acervo com origem e licença (`receitas/estilos/acervo-real.md`) ou still de IA (`broll-ia`, só o still, ~2 créditos, com aprovação do gasto). A garota do pico feita de gradientes desenhados foi reprovada. 
- R6: Pontilhado = Floyd–Steinberg com ruído no limiar (±0,11), célula de 2 px, ponto do mesmo tamanho (raio 0,42 da célula, ±20 %), brilho vira densidade. Antes: níveis esticados, curva em S (centro 0,45, inclinação 9) para foto desbotada, vinheta centrada no rosto, piso de 5 %. Cor por faixa de luz: no **foco quente** em volta do rosto (elipse com borda esfumada) creme > salmão > terracota-clara > verde-suave; fora dele creme > menta > verde-suave. 
- R7: **Um mundo, uma câmera.** Tudo o que vai aparecer já está desenhado desde o início; a câmera é um `scale` no grupo e o que é pequeno aparece quando ela chega (a lua é um ponto de 3 px). O traço pode engrossar com o zoom quando vira massa (as arestas do prisma viram o cume e o corpo ganha hachura); o que não deve engrossar leva `vector-effect: non-scaling-stroke`. Nada de "ato 2" (apagar e redesenhar). 
- R8: Hachura de giz para massa e sombra (corpo da montanha, sombra sob o queixo, lado escuro da roupa): `pattern` de linhas curtas inclinadas em creme, opacidade ≤ 0,3, `userSpaceOnUse` para escalar com a câmera. 
- R9: Estrelas ou poeira, de propósito ambíguas: canvas com um ponto a cada 900–1100 px², tamanho em distribuição cúbica (quase tudo minúsculo), cinco cores de giz (creme 40–50 %, o resto repartido), 25 % piscam devagar, 8 % derivam. 
- R10: Fumaça preta (gradiente para `--paleta-preto`) entre a imagem e o texto. Título em Caveat no terço de baixo, uma palavra acesa em `--cor-destaque-texto`; rótulo do pilar em mono com halo preto (`paint-order: stroke`) para não sumir nos pontos. Etiqueta do pilar, rodapé e logo seguem `carrossel/_tipo` (R2, R3) e `reel/_tipo`. 
- R11: Sem brilho nem glow (isso é `serigrafia`). A única luz é o ponto de luz de uma cena (o peito da prova 02), uma vez por peça, com halo desfocado em terracota-clara. 
- R12: Revelação no tempo da narração: traço escreve na palavra que ele ilustra; pontilhado é soprado em 3 s em ordem aleatória; no Remotion, delays e `scale` viram função do frame. 

## Elementos
- **Lousa:** `background: var(--paleta-preto)` + faixas de apagador (`linear-gradient(100deg, …, color-mix(in srgb, var(--paleta-creme) 4%, transparent) …)`) + mancha radial de creme a 4 %. Poeira: camada de ruído SVG (`feTurbulence` 0,9) em `mix-blend-mode: screen`, opacidade 0,07. Moldura `10px solid color-mix(in srgb, var(--paleta-terracota-clara) 22%, var(--paleta-preto))`; calha de 14 px embaixo em 16 %.
- **Filtro de giz:** `feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2"` → `feDisplacementMap scale="2.4"` → `feComponentTransfer` com `feFuncA tableValues="0 .55 .85 1"`. Aplicado no grupo pai, nunca no grupo que a câmera escala.
- **Traço:** `fill: none; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1` com `pathLength="1"` e `animation: escreve .9s cubic-bezier(.3,.7,.3,1) forwards` atrasada por traço. Grosso 3,5–5 px, fino 2–2,5 px, reforço a 35 % por cima.
- **Gizes:** `.creme { stroke: var(--paleta-creme) }`, `.laranja { stroke: var(--paleta-terracota-clara) }`, `.verde { stroke: var(--paleta-verde-suave) }`, `.mistura { stroke: color-mix(in srgb, var(--paleta-terracota-clara) 50%, var(--paleta-creme)) }`, `.menta { stroke: color-mix(in srgb, var(--paleta-verde-suave) 50%, var(--paleta-creme)) }`.
- **Hachura:** `<pattern patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(-32)">` com uma linha de 0,9 px creme a 0,22–0,32.
- **Pontilhado:** canvas; brilho por célula → curva em S → vinheta → Floyd–Steinberg com ruído → ponto igual com jitter de meia célula; cor por faixa de luz e foco quente; sopro em ordem aleatória. Código inteiro em `referencias/internas/2026-10-21_visual_quadro-negro-provas/midia/03_edison-pontilhado.html`.
- **Fio de luz:** linha de 2–3 px em creme na borda do lado da luz (só em traço; no pontilhado a luz já vem da foto).
- **Ponto de luz:** círculo creme de 6 px, `animation: respira` (escala 1 → 1,18), com halo `feGaussianBlur 14` em terracota-clara a 55 %.
- **Estrelas/poeira:** canvas, cores por sorteio ponderado, piscar por seno, deriva ≤ 0,04 px por quadro.
- **Fumaça:** `linearGradient` de transparente a `--paleta-preto` numa faixa de 90–100 px, mais um retângulo preto sob o texto.
- **Câmera:** `transform-box: view-box; transform-origin: <x>px <y>px` no grupo e `animation: aproxima 5.5s cubic-bezier(.55,0,.25,1) forwards` até `scale(12)`; canvas de estrelas com paralaxe menor (1,6).
- **Título:** Caveat 600, 38–40 px na lousa de 540, com o filtro de giz; rótulo em mono caixa-alta com `paint-order: stroke; stroke: var(--paleta-preto); stroke-width: 8px`.

## Composição
- Reel 1080×1920 e carrossel 1080×1350: a lousa é a tela inteira (moldura e calha nas bordas); texto dentro das faixas livres (`reel/_tipo` R1).
- Cena de traço: um assunto por plano, o traço escreve na palavra; objetos em volta de um centro (o peito, o prisma, o cume), fios ligando.
- Cena de pontilhado: a foto ocupa a metade de cima, foco quente no rosto, fumaça de 500 a 600, título embaixo; um risco de giz laranja (sublinhado, círculo) por cima do pontilhado liga as duas técnicas.
- Capa: a cena no momento mais cheio (fios desenhados, pontilhado completo) com a palavra acesa.
- Diferença para `arquivo`: lá a foto de época fica real e dessaturada; aqui vira pontos de giz. Diferença para `serigrafia`: lá é ilustração de IA com brilho; aqui é traço e ponto, sem brilho.

## Onde usar
Reel `motion` de explicação com diagrama ou metáfora (prisma, fios, montanha), Reel "isso já aconteceu" com foto de época pontilhada, carrossel de diagrama ou lista com um objeto a giz por slide, capa de Reel. Pilar aula. Fora do rodízio por enquanto: entra quando o Ayrton decidir, depois da primeira peça aprovada.

## O buraco negro (resumo para reproduzir)
- Canvas 2D, desenhado por quadro. Mundo em unidades do raio da sombra (R = 1).
- Disco de acreção: dezenas de milhares de partículas em órbita kepleriana (velocidade angular ∝ raio^-1,5), espessura pequena, estrias por modulação de densidade em filamentos.
- Câmera teleobjetiva: o tamanho da sombra na tela vem da distância focal, não de encostar a câmera (senão vira grande-angular e o disco abre como leque).
- Lente gravitacional aproximada: o que está atrás da sombra é remapeado por ângulo para um arco largo por cima, colado no anel, e um arco fino por baixo.
- Doppler: o lado que vem na direção da câmera fica muito mais claro; o que se afasta, mais escuro e quente.
- Cada partícula deixa um rastro no comprimento da velocidade projetada; glow em duas camadas (uma desfocada, uma nítida).
- Câmera em três atos: revelação de longe, órbita lenta com o disco escorrendo na diagonal, mergulho atravessando o plano do disco.
- Som (no Reel): grãos de giz batendo num vidro + um whoosh grave no mergulho.
