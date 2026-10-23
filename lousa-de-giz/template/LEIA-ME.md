# Template: lousa de giz + buraco negro + foto em pontilhado (Remotion)

O mesmo código do Reel do @ayrton.vercosa, separado para você usar. Nada de ferramenta paga de imagem.

## Montar (uns 10 minutos)
1. Instale o Node.js (nodejs.org) e crie um projeto Remotion: `npx create-video@latest` (escolha o modelo em branco).
2. Copie para a pasta `src/` do projeto: `paleta.ts`, `QuadroNegro.tsx`, `BuracoNegro.tsx` e `Exemplo.tsx`.
3. No `src/Root.tsx`, importe e coloque `<LousaExemplo />` junto das composições: `import {LousaExemplo} from './Exemplo';`
4. Rode `npm run dev` e abra a composição **LousaExemplo**: 0–5 s o prisma se escreve a giz; 5–15 s o buraco negro acende, orbita e mergulha.
5. Troque as cores em `paleta.ts` pelas da sua marca (3 gizes + o preto da lousa).

## Foto em pontilhado (o "Einstein")
1. Python 3 com `pip install numpy pillow`.
2. `python pontilhar.py sua-foto.jpg pontos.json --largura 1080 --altura 1350 --cel 4`
3. Coloque o `pontos.json` em `src/` e use no vídeo:
   `import pontos from './pontos.json';` e `<PontilhadoFoto dados={pontos as any} x={0} y={0} largura={810} t0={1} dur={3} />` (de `QuadroNegro.tsx`).
4. Para os pontos virarem o disco do buraco negro, passe `colapso={{t0: 5, dur: 1.7, cx: 486, cy: 364, raio: 60}}`.
Use foto sua ou de domínio público.

## Peças de `QuadroNegro.tsx`
`Lousa` (fundo), `FiltroGiz` (borda de giz), `Giz` (traço que escreve), `TextoGiz`, `Hachura`, `Estrelas`, `PontilhadoFoto`, `PontoDeLuz`, `cameraEm` (câmera).
Tudo é função do quadro: o mesmo vídeo sai igual em todo render.

Licença: uso livre, inclusive comercial. Um crédito ao @ayrton.vercosa é bem-vindo.

## Desenho vivo por esqueleto 3D (o algoritmo do Reel do cérebro e do coração)
A pasta `esqueleto/` transforma um esqueleto em texto (`.esq.json`: volumes, linhas, tubos e animação) em milhares de partículas de giz com luz, girando e pulsando. O assistente escreve o esqueleto olhando uma imagem; o código faz o resto, igual toda vez.
1. Copie a pasta `esqueleto/` inteira para `src/esqueleto/`.
2. No `src/Root.tsx`: `import {EsqueletoExemplo} from './esqueleto/Exemplo';` e coloque `<EsqueletoExemplo />` junto das composições.
3. Abra **EsqCoracao**, **EsqCerebro** ou **EsqAtomo**.
4. Para um objeto seu, mande o assistente ler `esqueleto/GUIA.md` antes de escrever o arquivo.
