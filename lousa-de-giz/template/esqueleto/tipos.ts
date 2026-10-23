import type React from 'react';
import type {Ritmo} from './ritmo';

// Contrato de um desenho vivo: quantas partículas, onde cada uma está e o componente de tela cheia.
export type PropsVivo = {
  largura: number; altura: number; t0: number; dur: number;
  chegada?: number[]; saida?: {a: number; b: number; ids: number[]}; ritmo?: Ritmo | null; op?: Record<string, string[]>;
};
export type Vivo = {
  n: () => number;
  posicao: (i: number, tempo: number, W: number, H: number) => {x: number; y: number; b: number; cor: string} | null;
  ancora: [number, number]; // centro do desenho na tela, em fração da largura e da altura
  Componente: React.FC<PropsVivo>;
};
