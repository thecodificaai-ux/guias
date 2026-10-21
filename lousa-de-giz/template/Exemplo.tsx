import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import {Cena, Estrelas, FiltroGiz, Giz, Lousa, TextoGiz} from './QuadroNegro';
import {Variante as BuracoNegro} from './BuracoNegro';

// Exemplo mínimo: 0–5 s o prisma se escreve a giz; 5–15 s o buraco negro vivo (câmera revela, orbita e mergulha).
const W = 1080, H = 1920, FPS = 30;

const Lousinha: React.FC = () => (
  <AbsoluteFill>
    <FiltroGiz />
    <Lousa>
      <Estrelas largura={W} altura={H} />
      <div style={{position: 'absolute', left: 135, top: 300, width: 810, height: 1012}}>
        <Cena largura={540} altura={675} style={{width: 810, height: 1012}}>
          <Giz d="M270 220 L380 420 L160 420 Z" largura={4} t0={0.3} dur={1.1} ate={5} />
          <Giz d="M40 330 C 120 326, 180 324, 222 318" largura={5} t0={1.4} dur={0.8} ate={5} />
          <Giz d="M330 330 C 400 300, 450 280, 505 262" cor="laranja" largura={5} t0={2.2} dur={0.8} ate={5} />
          <Giz d="M330 336 C 400 328, 450 326, 505 322" cor="salmao" largura={5} t0={2.35} dur={0.8} ate={5} />
          <Giz d="M330 342 C 400 356, 450 374, 505 392" cor="verde" largura={5} t0={2.5} dur={0.8} ate={5} />
          <TextoGiz x={60} y={312} texto="ideia" tamanho={24} t0={1.8} ate={5} />
        </Cena>
      </div>
      <div style={{position: 'absolute', left: 135, top: 300, width: 810, height: 1012, overflow: 'hidden'}}>
        <BuracoNegro largura={810} altura={1012} t0={5} dur={10} />
      </div>
    </Lousa>
  </AbsoluteFill>
);

export const LousaExemplo: React.FC = () => (
  <Composition id="LousaExemplo" component={Lousinha} width={W} height={H} fps={FPS} durationInFrames={15 * FPS} />
);
