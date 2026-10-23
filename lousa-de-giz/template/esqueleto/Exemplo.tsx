import React from 'react';
import {AbsoluteFill, Composition, Folder} from 'remotion';
import {Estrelas, FiltroGiz, Lousa} from '../QuadroNegro';
import {criarVivo, type Esqueleto} from './esqueleto';
import cerebro from './exemplos/cerebro-v2.esq.json';
import coracao from './exemplos/coracao.esq.json';
import atomo from './exemplos/atomo.esq.json';

// Um esqueleto em texto (.esq.json) vira um desenho vivo de partículas de giz. Para o seu objeto: peça ao assistente
// o arquivo (siga o GUIA.md), importe aqui e copie uma das composições.
const W = 1080, H = 1920, FPS = 30, DUR = 9;
const Prova: React.FC<{e: unknown}> = ({e}) => {
  const C = React.useMemo(() => criarVivo(e as Esqueleto).Componente, [e]);
  return (
    <AbsoluteFill>
      <FiltroGiz />
      <Lousa>
        <Estrelas largura={W} altura={H} alturaUtil={1800} densidade={1600} />
        <C largura={W} altura={H} t0={0} dur={DUR} ritmo={null} />
      </Lousa>
    </AbsoluteFill>
  );
};
const Cerebro = () => <Prova e={cerebro} />, Coracao = () => <Prova e={coracao} />, Atomo = () => <Prova e={atomo} />;
export const EsqueletoExemplo: React.FC = () => (
  <Folder name="esqueleto">
    <Composition id="EsqCerebro" component={Cerebro} width={W} height={H} fps={FPS} durationInFrames={DUR * FPS} />
    <Composition id="EsqCoracao" component={Coracao} width={W} height={H} fps={FPS} durationInFrames={DUR * FPS} />
    <Composition id="EsqAtomo" component={Atomo} width={W} height={H} fps={FPS} durationInFrames={DUR * FPS} />
  </Folder>
);
