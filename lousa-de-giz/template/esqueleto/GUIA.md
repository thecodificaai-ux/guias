# Guia: como escrever um esqueleto que fica bonito

Guia do @ayrton.vercosa (Thecodifica) para o seu assistente de IA. O algoritmo (`esqueleto.tsx`) faz a conta; o que decide se o desenho fica bonito são as escolhas do esqueleto. Este guia é o que se aprendeu fazendo o cérebro, o átomo e o coração do Reel. Leia antes de escrever um `.esq.json`.

## Antes de tudo (para o assistente)
1. Monte o template da lousa (`../LEIA-ME.md`) e copie esta pasta `esqueleto/` para `src/esqueleto/`.
2. No `src/Root.tsx`, importe e coloque `<EsqueletoExemplo />` (`import {EsqueletoExemplo} from './esqueleto/Exemplo';`). Abra **EsqCoracao** e mostre funcionando antes de criar um objeto novo.
3. Para o objeto da pessoa: peça uma imagem de referência (só a forma; ela não entra no vídeo), escreva `src/esqueleto/exemplos/<nome>.esq.json` seguindo as seções abaixo e crie uma composição igual às do `Exemplo.tsx`.
4. O formato completo do arquivo está no comentário do começo do `esqueleto.tsx` (volumes, linhas, tubos, malha, nós, luz e o cardápio de animação).

## 1. Forma: comece pela silhueta
- Olhe a referência e descreva a silhueta com 6 a 15 **volumes** grandes. Pergunte: em miniatura, de longe, dá para saber o que é?
- Volumes vizinhos se sobrepõem uns 30% do raio. Separados demais, viram bolas soltas; o algoritmo só emenda o que se toca.
- Coisa comprida (vaso, aorta, tronco, galho, cauda, tentáculo) é **tubo**, nunca um elipsoide esticado: `tubos: [{pontos, raio: [r inicial, r final]}]`. O tubo começa dentro do volume de onde sai, para emendar.
- Nada flutua: cada peça encosta em outra. Peça solta é o defeito que mais aparece.
- Três quartos (`anima.girar.base` perto de -0.35, `inclinar` 0.15 a 0.2) lê melhor que perfil puro.

## 2. Superfície e luz
- **Densidade** 60 a 80 mil no desenho principal de tela cheia (o padrão é 60 mil). Com 36 mil a superfície fica rala e vira massa.
- **Relevo** (sulcos) só onde o objeto tem sulco de verdade, e então forte: 1,0 (cérebro, coral, noz). Meio-termo (0,5 a 0,75) fica nem liso nem sulcado.
- **Luz**: deixe a padrão (`verde`, `menta`, `creme`, borda 0,7 a 0,8). Giz frio sobre o preto é o que dá profundidade; pintar o objeto inteiro de quente (`ocre`, `salmao`) achata tudo num tom só.
- O quente (`laranja`, `salmao`) é acento: as linhas que importam (coronárias, sinapses, a órbita do elétron) e a onda na batida. Um acento por desenho.
- `cor` fixa numa peça só quando ela é outra coisa (a veia em menta ao lado da artéria em laranja). Não existe amarelo no giz.

## 3. Linhas, malha e rede
- **Linhas** perto de um volume grudam na pele e viram curva suave: use várias linhas curtas de 4 a 6 pontos, nunca uma linha longa reta. Fissuras, sulcos principais, veias, nervuras.
- Linha longe de tudo (órbita, rastro) fica no ar: aí ela pode ser longa e fechada.
- **Malha** (`malha: {pontos: 700, vizinhos: 3, brilho: 0.5}`) é o visual de arame de holograma (referência de "tecnologia"). Use em objeto liso; num objeto com relevo forte ela briga com os sulcos.
- **Nós** (`nos`) são a rede em volta do objeto, 30 a 40 pontos, só quando o assunto é rede ou dado (o cérebro como inteligência artificial). Objeto físico não leva.

## 4. Vida
- `girar` com amplitude 0,4 a 0,6 (vai e volta) mostra o volume sem virar de costas.
- Órgão que bate ou respira: `pulsar` da parte com `batida: true`, amplitude 0,03 a 0,06.
- Parte que gira (elétron, roda, planeta): `orbitas`. Parte que vai e volta (asa, porta, cabeça): `oscilar`.
- `onda` na batida fica ligada por padrão: é ela que faz o desenho reagir à música.

## 5. Conferir
Renderize os quadros 30, 150 e 240 da composição do objeto (`npx remotion still <IdDaComposicao> saida.png --frame=150`), olhe as imagens e responda:
1. A silhueta diz o que é em miniatura?
2. Alguma peça está solta ou parece bola colada?
3. As linhas estão na pele, curvas, sem risco reto por cima?
4. Tem um acento quente só, e o resto em giz frio?
No máximo 3 rodadas. Se na terceira ainda não lê, o objeto é detalhado demais para o esqueleto (bicho com pena e pelo fino sai esquisito): avise a pessoa em vez de insistir.

## Exemplos
- `exemplos/cerebro.esq.json`: relevo forte, luz padrão, linhas curtas, rede de nós.
- `exemplos/atomo.esq.json`: objeto simples, órbitas no ar, elétron em órbita.
- `exemplos/cerebro-v2.esq.json`: feito do zero seguindo este guia (cerca de 141 mil tokens e 12 minutos, com três rodadas de conferência).
- `exemplos/coracao.esq.json`: tubos para os vasos, malha de arame, coronárias quentes, pulso na batida (cerca de 145 mil tokens e 13 minutos).
