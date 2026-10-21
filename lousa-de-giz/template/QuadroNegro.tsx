import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTE, fonteCarregada} from './paleta';
import {tokens} from './paleta';

// Visual `quadro-negro` (receitas/visuais/quadro-negro.md): lousa preta, gizes da paleta,
// traço de giz que escreve no tempo, hachura, estrelas/poeira, pontilhado de foto e uma câmera só.
// Provas em referencias/internas/2026-10-21_visual_quadro-negro-provas/ (HTML); aqui é o mesmo desenho por frame.

void fonteCarregada; // Caveat (manuscrita) e JetBrains Mono carregam antes do 1º quadro

const P = tokens.paleta;
export const mix = (cor: string, pct: number, com = 'transparent') => `color-mix(in srgb, ${cor} ${pct}%, ${com})`;

// R2: gizes = paleta e misturas por color-mix; nenhum hex novo
export const GIZ = {
  creme: P.creme,
  laranja: P['terracota-clara'],
  verde: P['verde-suave'],
  salmao: mix(P['terracota-clara'], 45, P.creme),
  menta: mix(P['verde-suave'], 50, P.creme),
  ocre: mix(P['terracota-clara'], 50, P['verde-suave']),
} as const;
export type CorGiz = keyof typeof GIZ;
const corDe = (c: CorGiz | string) => (c in GIZ ? GIZ[c as CorGiz] : c);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const useT = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {t: frame / fps, frame, fps};
};
const easeGiz = Easing.bezier(0.3, 0.7, 0.3, 1);
export const progresso = (t: number, t0: number, dur: number, easing: (x: number) => number = easeGiz) =>
  interpolate(t, [t0, t0 + dur], [0, 1], {...clamp, easing});
export const entre = (t: number, a: number, b: number, fade = 0.25) =>
  interpolate(t, [a - fade, a, b, b + fade], [0, 1, 1, 0], clamp);

// gerador determinístico (mulberry32): o mesmo quadro sai igual em todo render
export const semente = (s: number) => {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------- a lousa (R1): preto puro, apagador fraco, poeira ≤ 7 %, moldura e calha ----------
const POEIRA = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2' seed='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const Lousa: React.FC<{moldura?: boolean; children?: React.ReactNode}> = ({moldura = true, children}) => (
  <AbsoluteFill
    style={{
      background: [
        `linear-gradient(100deg, transparent 0 18%, ${mix(P.creme, 4)} 20% 34%, transparent 36% 58%, ${mix(P.creme, 3)} 60% 72%, transparent 74%)`,
        `radial-gradient(ellipse at 30% 70%, ${mix(P.creme, 4)}, transparent 45%)`,
        P.preto,
      ].join(', '),
      boxShadow: moldura ? `inset 0 0 0 14px ${mix(P['terracota-clara'], 22, P.preto)}, inset 0 0 120px ${mix(P.preto, 80)}` : undefined,
      overflow: 'hidden',
    }}
  >
    {children}
    <AbsoluteFill style={{backgroundImage: POEIRA, opacity: 0.07, mixBlendMode: 'screen', pointerEvents: 'none'}} />
    {moldura ? (
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 22, background: mix(P['terracota-clara'], 16, P.preto), boxShadow: `0 -3px 10px ${mix(P.preto, 70)}`}} />
    ) : null}
  </AbsoluteFill>
);

// ---------- filtro de giz e hachura (R3, R8): ficam FORA do grupo da câmera ----------
export const FiltroGiz: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id="giz-filtro" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" result="r" />
        <feDisplacementMap in="SourceGraphic" in2="r" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 .55 .85 1" />
        </feComponentTransfer>
      </filter>
      <pattern id="giz-hachura" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(-32)">
        <line x1="0" y1="2" x2="7" y2="2" stroke={P.creme} strokeWidth=".9" opacity=".3" />
      </pattern>
      <filter id="giz-brilho" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>
  </svg>
);

// ---------- a cena: um SVG com a câmera (R7: um mundo, uma câmera) ----------
export type Camera = {x: number; y: number; k: number};
export const cameraEm = (t: number, a: number, b: number, de: Camera, para: Camera, easing: (x: number) => number = Easing.bezier(0.55, 0, 0.25, 1)): Camera => {
  const f = (p: number, q: number) => interpolate(t, [a, b], [p, q], {...clamp, easing});
  return {x: f(de.x, para.x), y: f(de.y, para.y), k: f(de.k, para.k)};
};

export const Cena: React.FC<{largura: number; altura: number; camera?: Camera; filtro?: boolean; style?: React.CSSProperties; children?: React.ReactNode}> = ({
  largura, altura, camera, filtro = true, style, children,
}) => {
  const cam = camera ?? {x: 0, y: 0, k: 1};
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width={largura} height={altura} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}>
      <g filter={filtro ? 'url(#giz-filtro)' : undefined}>
        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k}) translate(${-cam.x} ${-cam.y})`}>{children}</g>
      </g>
    </svg>
  );
};

// ---------- traço de giz que escreve (R3): pathLength=1 e dashoffset por frame ----------
export const Giz: React.FC<{
  d: string; cor?: CorGiz | string; largura?: number; t0: number; dur?: number; ate?: number; opacidade?: number;
  fill?: string; fillT0?: number; fillDur?: number; fino?: boolean;
}> = ({d, cor = 'creme', largura = 4, t0, dur = 0.9, ate, opacidade = 0.92, fill, fillT0, fillDur = 1, fino = false}) => {
  const {t} = useT();
  const p = progresso(t, t0, dur);
  if (p <= 0) return null;
  const op = ate === undefined ? opacidade : opacidade * entre(t, t0, ate, 0.3);
  const fo = fill ? progresso(t, fillT0 ?? t0 + dur, fillDur, Easing.inOut(Easing.quad)) : 0;
  return (
    <path
      d={d}
      pathLength={1}
      fill={fill ?? 'none'}
      fillOpacity={fill ? fo : 0}
      stroke={corDe(cor)}
      strokeWidth={largura}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={1}
      strokeDashoffset={1 - p}
      opacity={op}
      vectorEffect={fino ? 'non-scaling-stroke' : undefined}
    />
  );
};

// hachura de giz dentro de uma forma (R8)
export const Hachura: React.FC<{d: string; t0: number; dur?: number; ate?: number; opacidade?: number}> = ({d, t0, dur = 1, ate, opacidade = 1}) => {
  const {t} = useT();
  const p = progresso(t, t0, dur, Easing.inOut(Easing.quad));
  if (p <= 0) return null;
  const op = ate === undefined ? p : p * entre(t, t0, ate, 0.3);
  return <path d={d} fill="url(#giz-hachura)" stroke="none" opacity={op * opacidade} />;
};

// texto a giz (Caveat) ou rótulo em mono, com fade
export const TextoGiz: React.FC<{
  x: number; y: number; texto: string; tamanho?: number; cor?: CorGiz | string; t0: number; dur?: number; ate?: number;
  mono?: boolean; ancora?: 'start' | 'middle' | 'end'; halo?: boolean; opacidade?: number;
}> = ({x, y, texto, tamanho = 64, cor = 'creme', t0, dur = 0.5, ate, mono = false, ancora = 'start', halo = false, opacidade = 0.92}) => {
  const {t} = useT();
  const p = progresso(t, t0, dur, Easing.out(Easing.quad));
  if (p <= 0) return null;
  const op = (ate === undefined ? 1 : entre(t, t0, ate, 0.3)) * p * opacidade;
  return (
    <text
      x={x}
      y={y}
      fill={corDe(cor)}
      fontFamily={mono ? FONTE.mono : FONTE.manuscrita}
      fontWeight={mono ? 500 : 600}
      fontSize={tamanho}
      textAnchor={ancora}
      letterSpacing={mono ? tamanho * 0.08 : 0}
      opacity={op}
      style={mono && halo ? ({paintOrder: 'stroke', stroke: P.preto, strokeWidth: tamanho * 0.5, strokeLinejoin: 'round'} as React.CSSProperties) : undefined}
    >
      {texto}
    </text>
  );
};

// ponto de luz com halo (R11: uma vez por peça)
export const PontoDeLuz: React.FC<{x: number; y: number; t0: number; r?: number}> = ({x, y, t0, r = 10}) => {
  const {t} = useT();
  const p = progresso(t, t0, 0.8, Easing.out(Easing.quad));
  if (p <= 0) return null;
  const resp = 1 + 0.18 * (0.5 + 0.5 * Math.sin((t - t0) * 2.6));
  return (
    <>
      <circle cx={x} cy={y} r={r * 4.3} fill={P['terracota-clara']} opacity={0.55 * p} filter="url(#giz-brilho)" />
      <circle cx={x} cy={y} r={r * resp} fill={P.creme} opacity={p} />
    </>
  );
};

// ---------- estrelas ou poeira (R9): ambíguas de propósito, cinco gizes ----------
type Estrela = {x: number; y: number; r: number; a: number; f: number; ph: number; vx: number; vy: number; c: string};
const CORES_ESTRELA: Array<[CorGiz, number]> = [['creme', 0.4], ['laranja', 0.14], ['verde', 0.14], ['salmao', 0.12], ['menta', 0.1], ['ocre', 0.1]];

export const Estrelas: React.FC<{largura: number; altura: number; alturaUtil?: number; densidade?: number; sementeN?: number; escala?: number; origem?: [number, number]}> = ({
  largura, altura, alturaUtil, densidade = 1000, sementeN = 11, escala = 1, origem,
}) => {
  const {t} = useT();
  const lista = useMemo<Estrela[]>(() => {
    const r = semente(sementeN);
    const sorteia = () => { let x = r(); for (const [c, p] of CORES_ESTRELA) { if ((x -= p) <= 0) return GIZ[c]; } return GIZ.creme; };
    const n = Math.round((largura * (alturaUtil ?? altura)) / densidade);
    return Array.from({length: n}, () => ({
      x: r() * largura, y: r() * (alturaUtil ?? altura), c: sorteia(),
      r: 0.6 + Math.pow(r(), 3) * 2.6, a: 0.08 + r() * 0.55,
      f: r() < 0.25 ? 0.4 + r() * 1.2 : 0, ph: r() * Math.PI * 2,
      vx: r() < 0.08 ? (r() - 0.5) * 1.2 : 0, vy: r() < 0.08 ? (r() - 0.5) * 1.2 : 0,
    }));
  }, [largura, altura, alturaUtil, densidade, sementeN]);
  const [ox, oy] = origem ?? [largura / 2, altura / 2];
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width={largura} height={altura} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(${ox} ${oy}) scale(${escala}) translate(${-ox} ${-oy})`}>
        {lista.map((e, i) => {
          const tw = e.f ? 0.5 + 0.5 * Math.sin(t * e.f + e.ph) : 1;
          const x = (((e.x + e.vx * t) % largura) + largura) % largura;
          const y = (((e.y + e.vy * t) % altura) + altura) % altura;
          return <circle key={i} cx={x} cy={y} r={e.r} fill={e.c} opacity={e.a * tw} />;
        })}
      </g>
    </svg>
  );
};

// ---------- pontilhado de foto (R5, R6): pontos vêm do tools/pontilhar.py, soprados no tempo ----------
export type Ponto = [number, number, number, CorGiz, number];
export type Pontilhado = {largura: number; altura: number; cel: number; pontos: Ponto[]};

// colapso: os pontos entram em órbita espiral em volta de (cx, cy) e achatam num disco (vira o buraco negro)
export type Colapso = {t0: number; dur: number; cx: number; cy: number; raio: number; achata?: number; giro?: number};

export const PontilhadoFoto: React.FC<{
  dados: Pontilhado; x: number; y: number; largura: number; t0: number; dur?: number; ate?: number; opacidade?: number; esfumar?: number;
  colapso?: Colapso;
}> = ({dados, x, y, largura, t0, dur = 3, ate, opacidade = 1, esfumar, colapso}) => {
  const {t} = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const k = largura / dados.largura;
  const altura = dados.altura * k;
  const f = dur > 0 ? interpolate(t, [t0, t0 + dur], [0, 1], clamp) : t >= t0 ? 1 : 0;
  const n = Math.floor(dados.pontos.length * f);
  const op = (ate === undefined ? 1 : entre(t, t0, ate, 0.4)) * opacidade;
  const kc = colapso ? interpolate(t, [colapso.t0, colapso.t0 + colapso.dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 0;
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const maxR = Math.hypot(largura, altura) * 0.6;
    for (let i = 0; i < n; i++) {
      const [px, py, pr, pc, pa] = dados.pontos[i];
      let X = px * k, Y = py * k;
      if (colapso && kc > 0) {
        const dx = X - colapso.cx, dy = Y - colapso.cy;
        const r0 = Math.hypot(dx, dy), a0 = Math.atan2(dy, dx);
        const h = ((i * 2654435761) % 1000) / 1000; // espalhamento estável por ponto
        const rAlvo = colapso.raio * (1.15 + 1.9 * h);
        const r = r0 + (rAlvo - r0) * kc;
        const ang = a0 + kc * (colapso.giro ?? 5) * (0.6 + 0.8 * (1 - Math.min(1, r0 / maxR)));
        const ach = 1 - (1 - (colapso.achata ?? 0.22)) * kc; // o anel achata num disco visto de lado
        X = colapso.cx + Math.cos(ang) * r;
        Y = colapso.cy + Math.sin(ang) * r * ach;
      }
      ctx.fillStyle = GIZ[pc] ?? GIZ.creme;
      ctx.globalAlpha = pa * (1 - 0.5 * kc);
      ctx.beginPath();
      ctx.arc(X, Y, pr * k * (1 - 0.3 * kc), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [n, dados, k, kc, colapso, largura, altura]);
  if (op <= 0) return null;
  // fumaça (R10): a imagem dissolve em preto por baixo; máscara no próprio canvas, não um retângulo por cima
  const mascara = esfumar !== undefined && kc === 0 ? `linear-gradient(to bottom, black ${Math.round(esfumar * 100)}%, transparent 100%)` : undefined;
  return (
    <canvas
      ref={ref}
      width={Math.round(largura)}
      height={Math.round(altura)}
      style={{position: 'absolute', left: x, top: y, width: largura, height: altura, opacity: op, maskImage: mascara, WebkitMaskImage: mascara}}
    />
  );
};

// fumaça preta entre a imagem e o texto (R10)
export const Fumaca: React.FC<{y: number; altura: number; largura: number}> = ({y, altura, largura}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: largura, height: altura, background: `linear-gradient(to bottom, transparent, ${P.preto})`}} />
);
