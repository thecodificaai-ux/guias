import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {GIZ, semente, useT} from './QuadroNegro';
import {tokens} from './paleta';

// Variante 3 do buraco negro vivo (bancada de provas): estratégia CINEMA, o plano manda.
//
// Três atos dentro de t0..t0+dur: (1) revelação na vista clássica, teleobjetiva de longe (disco quase de lado,
// 9°, subindo para a direita), anel de fótons acende primeiro, o gás entra de dentro para fora; (2) órbita lenta
// com push-in de focal (a sombra cresce, a câmera quase não anda) e paralaxe: o lado de cá passa, o de lá
// dobra por cima da sombra; (3) mergulho: a câmera cai até dentro do disco, cruza o plano (clarão breve de giz)
// e sai do outro lado, com o que passa perto virando riscos enormes e rápidos.
//
// Material: ~18 mil fios de giz em anéis quantizados (estrias), cada um uma polilinha ao longo da própria órbita
// mais o deslocamento da câmera no obturador (rastro = velocidade), alfa baixo que acumula (brilho por sobreposição,
// cor converge para o giz da paleta, nunca passa dele) e duas camadas de glow (desfocada + nítida) por cima.
// Lente gravitacional por ângulo: o lado de trás vira um arco largo colado ao anel (imagem primária) e um arco
// fino por baixo (secundária); Doppler forte em alfa, largura e cor (creme → salmão → laranja → ocre, com dither;
// sem verde no gás). Sombra preta, anel de fótons pontilhado com glow e Doppler, planeta em silhueta preso a uma
// órbita, nave em anel a traço cruzando o quadro, estrelas em duas camadas com paralaxe.
// Determinístico: semente() e só o frame; nada de Math.random/Date. Cores só via GIZ (ficha quadro-negro R2).

const P = tokens.paleta;
const TAU = Math.PI * 2;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type PropsVariante = {largura: number; altura: number; t0: number; dur: number};

// ---------- constantes (R = raio da sombra no mundo = 1) ----------
const RHO_IN = 1.05, RHO_OUT = 7.0; // disco em R
const N = 18000;                   // fios de gás
const ANEIS = 120;                 // anéis quantizados (estrias)
const W_IN = 0.55;                 // rad/s no bordo interno (Kepler para fora)
const K = 6;                       // pontos por rastro
const TAU_ORB = 0.75;              // s de órbita que o rastro cobre
const OBTURADOR = 0.1;             // s de movimento de câmera dentro do rastro
const CX = 0.6, CY = 0.36;         // centro da sombra na área da cena (alto, à direita)
const U_MERGULHO = 0.55, U_CRUZA = 0.86; // atos: órbita até 0.55, cruza o plano em 0.86
const ESTRELAS = 260;
const CORES = [GIZ.ocre, GIZ.laranja, GIZ.salmao, GIZ.creme] as const;
const corIdx = (b: number) => (b > 0.8 ? 3 : b > 0.55 ? 2 : b > 0.3 ? 1 : 0);

// ---------- câmera: três atos ----------
export type Cam = {yaw: number; incl: number; roll: number; dist: number; rs: number};
export const camera = (u0: number): Cam => {
  const u = clamp01(u0);
  const s = suave(0, U_MERGULHO, u);
  let yaw = -0.25 + 0.6 * s, incl = 0.15 + 0.05 * s, dist = 18 - 7 * s, rs = 0.21 + 0.05 * s, roll = -0.4;
  if (u > U_MERGULHO) {
    const m = (u - U_MERGULHO) / (1 - U_MERGULHO);
    const p = suave(U_MERGULHO, U_CRUZA, u), q = suave(U_CRUZA, 1, u);
    const mi = Math.pow(clamp01((u - U_MERGULHO) / (U_CRUZA - U_MERGULHO)), 2);
    dist = u <= U_CRUZA ? 11 - 8 * mi : 3 - (u - U_CRUZA) / (1 - U_CRUZA);
    rs = 0.26 + 0.2 * mi + 0.06 * q;
    incl = 0.2 * Math.pow(1 - p, 1.5) - 0.1 * q; // cruza o plano em U_CRUZA: o disco passa de chão a teto
    yaw = 0.35 + 0.25 * m;
    roll = -0.4 + 0.22 * suave(0.8, 1, u); // a câmera tomba no fim
  }
  return {yaw, incl, roll, dist, rs};
};

type CamS = {D: number; f: number; Rs: number; ci: number; si: number; cy: number; sy: number; cr: number; sr: number; sinal: number; roll: number; yaw: number; incl: number; rs: number};
const monta = (c: Cam, W: number): CamS => {
  const Rs = c.rs * W; // raio da sombra na tela: fixo pela focal, não pela distância
  return {
    D: c.dist, f: c.dist * Rs, Rs, ci: Math.cos(c.incl), si: Math.sin(c.incl), cy: Math.cos(c.yaw), sy: Math.sin(c.yaw),
    cr: Math.cos(c.roll), sr: Math.sin(c.roll), sinal: c.incl >= 0 ? 1 : -1, roll: c.roll, yaw: c.yaw, incl: c.incl, rs: c.rs,
  };
};

// ---------- partículas ----------
type Part = {rho: number; fi0: number; w: number; h: number; g: number; tam: number; a: number; cj: number; atraso: number; sel: number; f1: number; f2: number; f3: number};
const geraParticulas = (sem: number): Part[] => {
  const r = semente(sem);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  // peso por anel (ruído 1D suavizado): uns fios cheios, outros quase vazios
  const bruto = Array.from({length: ANEIS}, () => 0.15 + 0.85 * r());
  const peso = bruto.map((v, k) => 0.5 * v + 0.25 * (bruto[(k + ANEIS - 1) % ANEIS] + bruto[(k + 1) % ANEIS]));
  const logK = Math.log(RHO_OUT / RHO_IN);
  const lista: Part[] = [];
  while (lista.length < N) {
    const rn = Math.pow(r(), 2.6); // metade dos fios abaixo de ~2 R
    const rhoC = RHO_IN + (RHO_OUT - RHO_IN) * rn;
    const k = Math.min(ANEIS - 1, Math.round((ANEIS * Math.log(rhoC / RHO_IN)) / logK));
    if (r() > peso[k]) continue;
    const rhoK = RHO_IN * Math.exp((logK * k) / ANEIS);
    const rho = rhoK * (1 + ((r() - 0.5) * 0.24 * logK) / ANEIS);
    const braco = r() < 0.4;
    const fi0 = braco ? (Math.floor(r() * 3) * TAU) / 3 + gauss() * 0.5 + 0.5 * Math.log(rho) : r() * TAU;
    const g = gauss();
    const grosso = r() < 0.15;
    lista.push({
      rho, fi0, w: W_IN * Math.pow(RHO_IN / rho, 1.5),
      h: g * (0.012 + 0.03 * Math.sqrt(RHO_IN / rho)) * rho, g,
      tam: grosso ? 1.5 + r() * 1.0 : 0.7 + r() * r() * 0.9,
      a: 0.35 + r() * 0.65, cj: (r() - 0.5) * 0.14,
      atraso: 0.4 + 1.6 * Math.pow((rho - RHO_IN) / (RHO_OUT - RHO_IN), 0.8) + r() * 0.15,
      sel: r(), f1: r() * TAU, f2: r() * TAU, f3: r() * TAU,
    });
  }
  return lista;
};

type PontoAnel = {ang: number; dr: number; r: number; ordem: number; cor: number};
const geraAnel = (sem: number): PontoAnel[] => {
  const r = semente(sem);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  const lista: PontoAnel[] = [];
  for (let i = 0; i < 1200; i++) lista.push({ang: r() * TAU, dr: 1.03 + gauss() * 0.012, r: 0.6 + r() * 0.5, ordem: r(), cor: 0});
  for (let i = 0; i < 320; i++) lista.push({ang: r() * TAU, dr: 1.065 + gauss() * 0.016, r: 0.6 + r() * 0.4, ordem: r(), cor: 1});
  for (let i = 0; i < 120; i++) lista.push({ang: r() * TAU, dr: 1.0 + r() * 0.02, r: 0.5 + r() * 0.4, ordem: r(), cor: 2}); // mordida preta
  return lista;
};

// véu: gás que passa pela câmera no cruzamento do plano (riscos radiais em tela, perspectiva por s²)
type Veu = {ang: number; r0: number; vel: number; cor: number; tam: number};
const geraVeu = (sem: number): Veu[] => {
  const r = semente(sem);
  return Array.from({length: 700}, () => ({ang: r() * TAU, r0: r(), vel: 0.6 + r() * 0.8, cor: r() < 0.4 ? 3 : r() < 0.75 ? 2 : 1, tam: 0.6 + r() * 1.2}));
};

type Estrela = {x: number; y: number; r: number; a: number; cor: string; camada: number};
const geraEstrelas = (sem: number, W: number, H: number): Estrela[] => {
  const r = semente(sem);
  const cores = [GIZ.creme, GIZ.creme, GIZ.creme, GIZ.menta, GIZ.laranja, GIZ.salmao];
  return Array.from({length: ESTRELAS}, () => ({
    x: (r() - 0.5) * 2.6 * W, y: (r() - 0.5) * 2.6 * H, r: 0.5 + Math.pow(r(), 3) * 1.8, a: 0.1 + r() * 0.45,
    cor: cores[Math.floor(r() * cores.length)], camada: r() < 0.5 ? 0 : 1,
  }));
};

type Traco = {i0: number; n: number; a: number; lw: number; c: number; prof: number};

export const Variante: React.FC<PropsVariante> = ({largura, altura, t0, dur}) => {
  const {t, fps} = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const off = useRef<HTMLCanvasElement[] | null>(null);
  const pts = useRef(new Float32Array(N * 2 * K * 2));
  const W = Math.round(largura), H = Math.round(altura);
  const particulas = useMemo(() => geraParticulas(21), []);
  const anel = useMemo(() => geraAnel(33), []);
  const veu = useMemo(() => geraVeu(71), []);
  const estrelas = useMemo(() => geraEstrelas(47, W, H), [W, H]);
  const haloNave = useMemo(() => { const r = semente(58); return Array.from({length: 26}, () => ({a: r() * TAU, d: 1.2 + r() * 0.7, o: 0.08 + r() * 0.12})); }, []);

  const tempo = t - t0;
  const u = clamp01(tempo / dur);

  useLayoutEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    if (!off.current) off.current = [document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')];
    const [cvT, cvF, cvA] = off.current;
    for (const c of off.current) { if (c.width !== W) c.width = W; if (c.height !== H) c.height = H; }
    const ctT = cvT.getContext('2d'), ctF = cvF.getContext('2d'), ctA = cvA.getContext('2d');
    if (!ctT || !ctF || !ctA) return;
    ctx.clearRect(0, 0, W, H); ctT.clearRect(0, 0, W, H); ctF.clearRect(0, 0, W, H); ctA.clearRect(0, 0, W, H);
    if (tempo < 0) return;

    const X0 = CX * W, Y0 = CY * H;
    const cams: CamS[] = [];
    for (let j = 0; j < K; j++) cams.push(monta(camera(u - ((j / (K - 1)) * OBTURADOR) / dur), W));
    const c0 = cams[0];
    const Rs = c0.Rs, sinal = c0.sinal;
    const buf = pts.current;
    const thv = new Float64Array(K), sxv = new Float64Array(K), syv = new Float64Array(K);
    // peso da imagem de cima (1 = câmera acima do plano): muda suave ao cruzar, sem pulo
    const cima = 0.5 + 0.5 * Math.max(-1, Math.min(1, c0.incl / 0.05));
    const labio = Math.min(1, Math.abs(c0.incl) / 0.08) * sinal; // o lábio some perto do plano, sem pulo

    // ---- ângulo (na tela) do lado que vem para a câmera: Doppler do anel ----
    let melhor = -2, aproxX = 1, aproxY = 0;
    for (let i = 0; i < 48; i++) {
      const fi = (i / 48) * TAU, cf = Math.cos(fi), sf = Math.sin(fi);
      const vcam = -(sf * c0.sy + cf * c0.ci * c0.cy);
      if (vcam > melhor) {
        melhor = vcam;
        const x = 1.25 * cf, z = 1.25 * sf;
        const y1 = -z * c0.si, z1 = z * c0.ci, x2 = x * c0.cy + z1 * c0.sy, z2 = -x * c0.sy + z1 * c0.cy, prof = z2 + c0.D;
        const sx = (c0.f * x2) / prof, sy = (c0.f * y1) / prof;
        aproxX = sx * c0.cr - sy * c0.sr; aproxY = sx * c0.sr + sy * c0.cr;
      }
    }
    const thetaAprox = Math.atan2(aproxY, aproxX);

    // ---- fios de gás: polilinha ao longo da órbita + obturador da câmera, lente por ponto ----
    const tras: Traco[] = [], frente: Traco[] = [];
    let ip = 0;
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i];
      const ap = tempo <= p.atraso ? 0 : Math.min(1, (tempo - p.atraso) / 0.8);
      if (ap <= 0) continue;
      const rho = p.rho * (1 + 0.025 * Math.sin(0.6 * tempo + p.f1));
      const rhoN = clamp01((rho - RHO_IN) / (RHO_OUT - RHO_IN));
      const fi = p.fi0 + p.w * tempo;
      const hy = p.h + 0.01 * Math.sin(0.9 * tempo + p.f2);
      const cf = Math.cos(fi), sf = Math.sin(fi);
      const x = rho * cf, z = rho * sf;
      const y1 = hy * c0.ci - z * c0.si, z1 = hy * c0.si + z * c0.ci;
      const x2 = x * c0.cy + z1 * c0.sy, z2 = -x * c0.sy + z1 * c0.cy;
      const prof = z2 + c0.D;
      if (prof < 0.08) continue; // passou pela câmera
      const atras = z2 > 0;
      // Doppler com inclinação: componente da velocidade orbital na direção da câmera
      const vcam = -(sf * c0.sy + cf * c0.ci * c0.cy);
      const k = clamp01((1 + vcam) / 2);
      if (k < 0.3 && p.sel < 0.25) continue; // o lado que vai embora fica mais ralo
      let b = Math.min(1, Math.pow(RHO_IN / rho, 0.9) * (0.4 + 0.95 * k)) * (0.82 + 0.18 * Math.sin(2.3 * tempo + p.f3)) * (1 - 0.5 * Math.min(1, Math.abs(p.g)));
      const perto = c0.D / prof;
      const delta = p.w * TAU_ORB * (1.6 - 0.6 * ap);
      const rl = Rs * (1.02 + 1.0 * Math.pow(rhoN, 0.75)); // imagem primária: arco largo, denso junto do anel
      const rl2 = Rs * (1.015 + 0.16 * Math.pow(rhoN, 1.2)); // secundária: arco fino colado ao anel
      const mRho = 1 - 0.55 * Math.pow(rhoN, 0.8);
      // posição real (com obturador) ponto a ponto
      let n = 0, mCab = 0;
      for (let j = 0; j < K; j++) {
        const s = j / (K - 1);
        const c = cams[j];
        const fj = fi - s * delta;
        const xj = rho * Math.cos(fj), zj = rho * Math.sin(fj);
        const y1j = hy * c.ci - zj * c.si, z1j = hy * c.si + zj * c.ci;
        const x2j = xj * c.cy + z1j * c.sy, z2j = -xj * c.sy + z1j * c.cy;
        const pj = z2j + c.D;
        if (pj < 0.05) break;
        sxv[j] = (c.f * x2j) / pj; syv[j] = (c.f * y1j) / pj;
        if (atras) {
          const th = Math.atan2(Math.max(z2j, 0), x2j); // 0..π: o lado de trás inteiro vira um arco em volta da sombra
          thv[j] = th;
          if (j === 0) mCab = Math.pow(Math.sin(th), 0.35) * mRho; // nas pontas (θ≈0, π) emenda com a posição real
        }
        n++;
      }
      if (n === 0) continue;
      const pertoF = Math.min(6, Math.max(0.6, Math.pow(perto, 0.85)));
      const lw0 = p.tam * (0.8 + 0.6 * k) * pertoF * (1 - 0.35 * Math.min(1, Math.abs(p.g)));
      const a0 = p.a * ap * 0.6 * (0.3 + 0.7 * Math.pow(k, 1.5)) * (0.3 + 0.7 * b) * suave(0.05, 0.3, prof);
      const emite = (lista: Traco[], f: (j: number) => [number, number], a: number, lw: number, c: number, profE: number) => {
        const i0 = ip; let L = 0, px = 0, py = 0;
        for (let j = 0; j < n; j++) {
          const [sx, sy] = f(j), cj = cams[j];
          const X = X0 + sx * cj.cr - sy * cj.sr, Y = Y0 + sx * cj.sr + sy * cj.cr;
          if (j > 0) L += Math.hypot(X - px, Y - py);
          buf[ip++] = X; buf[ip++] = Y; px = X; py = Y;
        }
        if (L > 100) a *= Math.max(0.45, Math.sqrt(100 / L)); // riscos longos ficam difusos
        lista.push({i0, n, a: Math.min(1, a), lw, c, prof: profE});
      };
      if (!atras) {
        const a = a0 * (1 + 0.5 * Math.min(2, Math.max(0, perto - 1)));
        emite(frente, (j) => {
          const sx = sxv[j]; let sy = syv[j];
          const rp = Math.hypot(sx, sy);
          if (rp < 1.6 * Rs) sy += (1.6 * Rs - rp) * 0.22 * labio; // lábio: o bordo de cá contorna a sombra por baixo
          return [sx, sy];
        }, a, lw0, corIdx(b + p.cj), prof);
        continue;
      }
      // lado de trás: imagem A (acima) e B (abaixo); quem é primária depende de que lado do plano a câmera está
      const acum = Math.max(0, 1 - (rl - Rs) / (1.2 * Rs));
      const aPri = a0 * (1 + 0.9 * acum * mCab), aSec = a0 * 0.45 * mCab;
      const lwPri = lw0 * (1 + 0.3 * mCab), lwSec = lw0 * 0.6;
      const bPri = Math.min(1, b * (0.9 + 0.5 * acum * mCab));
      const cPri = corIdx(bPri + p.cj), cSec = Math.max(0, cPri - 1);
      const rA = lerp(rl2, rl, cima), rB = lerp(rl, rl2, cima);
      const fA = 1 - cima * (1 - mCab), fB = 1 - (1 - cima) * (1 - mCab); // 1 = só no alvo, m = emenda com a posição real
      if (cima > 0.02 && (cima >= 0.5 || rho < 4.5)) {
        emite(tras, (j) => {
          const th = thv[j], tx = rA * Math.cos(th), ty = -rA * Math.sin(th);
          return [sxv[j] + (tx - sxv[j]) * fA, syv[j] + (ty - syv[j]) * fA];
        }, lerp(aSec, aPri, cima), lerp(lwSec, lwPri, cima), cima > 0.5 ? cPri : cSec, prof);
      }
      if (cima < 0.98 && (cima < 0.5 || rho < 4.5) && mCab > 0.05) {
        emite(tras, (j) => {
          const th = thv[j], tx = rB * Math.cos(th), ty = rB * Math.sin(th);
          return [sxv[j] + (tx - sxv[j]) * fB, syv[j] + (ty - syv[j]) * fB];
        }, lerp(aPri, aSec, cima), lerp(lwPri, lwSec, cima), cima < 0.5 ? cPri : cSec, prof + 1);
      }
    }

    const desenha = (ct: CanvasRenderingContext2D, lista: Traco[]) => {
      ct.lineCap = 'round'; ct.lineJoin = 'round';
      let corAtual = -1;
      for (const tr of lista) {
        if (tr.c !== corAtual) { ct.strokeStyle = CORES[tr.c]; corAtual = tr.c; }
        ct.globalAlpha = tr.a; ct.lineWidth = tr.lw;
        ct.beginPath();
        ct.moveTo(buf[tr.i0], buf[tr.i0 + 1]);
        if (tr.n === 1) ct.lineTo(buf[tr.i0] + 0.01, buf[tr.i0 + 1]);
        for (let j = 1; j < tr.n; j++) ct.lineTo(buf[tr.i0 + 2 * j], buf[tr.i0 + 2 * j + 1]);
        ct.stroke();
      }
      ct.globalAlpha = 1;
    };
    const esfuma = (ct: CanvasRenderingContext2D) => {
      // o disco sai pela borda da cena esfumando, não cortado a faca
      const B = 70;
      ct.globalCompositeOperation = 'destination-out'; ct.globalAlpha = 1;
      const faixas: Array<[number, number, number, number]> = [[0, 0, B, 0], [W, 0, W - B, 0], [0, 0, 0, B], [0, H, 0, H - B]];
      for (const [x0, y0, x1, y1] of faixas) {
        const g = ct.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ct.fillStyle = g;
        ct.fillRect(Math.min(x0, x1), Math.min(y0, y1), x1 === x0 ? W : B, y1 === y0 ? H : B);
      }
      ct.globalCompositeOperation = 'source-over';
    };
    tras.sort((p, q) => p.c - q.c || q.prof - p.prof);
    frente.sort((p, q) => p.c - q.c || q.prof - p.prof);
    desenha(ctT, tras); desenha(ctF, frente);
    // véu: ao cruzar o plano a câmera está dentro do gás; o que passa perto vira risco grande e rápido
    const intens = Math.exp(-Math.pow((u - U_CRUZA) / 0.075, 2));
    if (intens > 0.02) {
      const Rmax = Math.hypot(W, H) * 0.8;
      ctF.lineCap = 'round';
      for (const v of veu) {
        const s = (v.r0 + v.vel * tempo * 0.9) % 1;
        const r0 = Rmax * s * s, len = (14 + 240 * s * s) * (0.5 + 0.5 * intens);
        const cs = Math.cos(v.ang), sn = Math.sin(v.ang);
        ctF.strokeStyle = CORES[v.cor]; ctF.globalAlpha = intens * (0.06 + 0.4 * s); ctF.lineWidth = v.tam * (0.5 + 2.5 * s);
        ctF.beginPath(); ctF.moveTo(X0 + r0 * cs, Y0 + r0 * sn); ctF.lineTo(X0 + (r0 + len) * cs, Y0 + (r0 + len) * sn); ctF.stroke();
      }
      ctF.globalAlpha = 1;
    }
    esfuma(ctT); esfuma(ctF);

    // ---- estrelas em duas camadas com paralaxe e rastro de um quadro ----
    const cam00 = camera(0);
    const camAgora = camera(u);
    const camAnt = camera(u - 1 / (fps * dur));
    const posEstrela = (e: Estrela, c: Cam): [number, number] => {
      const par = e.camada === 0 ? 1 : 0.55;
      const zoom = Math.pow(c.rs / 0.21, e.camada === 0 ? 0.55 : 0.3);
      const x = e.x * zoom - 900 * Math.tan(c.yaw - cam00.yaw) * par, y = e.y * zoom + 900 * Math.tan(c.incl - cam00.incl) * par;
      const dr = c.roll - cam00.roll, cr = Math.cos(dr), sr = Math.sin(dr);
      return [X0 + x * cr - y * sr, Y0 + x * sr + y * cr];
    };
    ctx.lineCap = 'round';
    for (const e of estrelas) {
      const [x1, y1] = posEstrela(e, camAgora), [x0, y0] = posEstrela(e, camAnt);
      ctx.strokeStyle = e.cor; ctx.globalAlpha = e.a * suave(0, 0.6, tempo); ctx.lineWidth = e.r * 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + 0.01, y1); ctx.stroke();
    }

    // ---- lado de trás: glow em duas camadas + nítido; depois a sombra engole o que sobrou ----
    const compoe = (cv2: HTMLCanvasElement, a1: number, a2: number) => {
      ctx.filter = 'blur(16px)'; ctx.globalAlpha = a1; ctx.drawImage(cv2, 0, 0);
      ctx.filter = 'blur(5px)'; ctx.globalAlpha = a2; ctx.drawImage(cv2, 0, 0);
      ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.drawImage(cv2, 0, 0);
    };
    compoe(cvT, 0.6, 0.5);
    ctx.globalAlpha = 1; ctx.fillStyle = P.preto;
    ctx.beginPath(); ctx.arc(X0, Y0, Rs * 0.99, 0, TAU); ctx.fill();

    // ---- anel de fótons (canvas próprio, depois desfocado): fio fino por segmento com Doppler + pontilhado soprado ----
    const SEG = 90;
    const corAnel = (d: number) => (d > 0.7 ? GIZ.creme : d > 0.35 ? GIZ.salmao : GIZ.laranja);
    const anelOn = suave(0.2, 0.9, tempo);
    ctA.lineCap = 'butt';
    for (let sgm = 0; sgm < SEG; sgm++) {
      const a0 = (sgm / SEG) * TAU, a1 = ((sgm + 1.08) / SEG) * TAU;
      const d = 0.5 + 0.5 * Math.cos((a0 + a1) / 2 - thetaAprox);
      ctA.strokeStyle = corAnel(d); ctA.globalAlpha = (0.08 + 0.5 * d * d) * anelOn; ctA.lineWidth = Rs * (0.02 + 0.03 * d);
      ctA.beginPath(); ctA.arc(X0, Y0, Rs * 1.035, a0, a1); ctA.stroke();
    }
    for (const pt of anel) {
      if (tempo < 0.2 + 0.7 * pt.ordem) continue;
      const d = Math.max(0, Math.cos(pt.ang - thetaAprox));
      const rr = Rs * pt.dr, x = X0 + rr * Math.cos(pt.ang), y = Y0 + rr * Math.sin(pt.ang);
      if (pt.cor === 2) { ctA.fillStyle = P.preto; ctA.globalAlpha = 0.3; }
      else { ctA.fillStyle = pt.cor === 0 ? GIZ.creme : GIZ.salmao; ctA.globalAlpha = (0.3 + 0.7 * d) * (pt.cor === 0 ? 1 : 0.55); }
      const r = pt.r * (0.8 + 0.5 * d) * (pt.cor === 2 ? 1 : Math.max(1, Math.sqrt(Rs / 190)));
      ctA.beginPath(); ctA.arc(x, y, r, 0, TAU); ctA.fill();
    }
    esfuma(ctA);
    ctx.filter = 'blur(22px)'; ctx.globalAlpha = 0.9; ctx.drawImage(cvA, 0, 0);
    ctx.filter = 'blur(7px)'; ctx.globalAlpha = 0.7; ctx.drawImage(cvA, 0, 0);
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.drawImage(cvA, 0, 0);

    // ---- lado de cá por cima de tudo (com o próprio glow derramando na sombra) ----
    compoe(cvF, 0.5, 0.45);

    // ---- planeta em silhueta, preso a uma órbita do lado de cá, na borda da faixa clara ----
    {
      const rhoP = 2.6, wP = W_IN * Math.pow(RHO_IN / rhoP, 1.5), fiP = 3.3 + wP * tempo;
      const x = rhoP * Math.cos(fiP), z = rhoP * Math.sin(fiP);
      const y1 = -z * c0.si, z1 = z * c0.ci, x2 = x * c0.cy + z1 * c0.sy, z2 = -x * c0.sy + z1 * c0.cy, prof = z2 + c0.D;
      if (z2 < 0 && prof > 0.6) {
        let sx = (c0.f * x2) / prof, sy = (c0.f * y1) / prof;
        const rp = Math.hypot(sx, sy);
        if (rp < 1.6 * Rs) sy += (1.6 * Rs - rp) * 0.22 * labio;
        const X = X0 + sx * c0.cr - sy * c0.sr, Y = Y0 + sx * c0.sr + sy * c0.cr;
        const rP = Math.max(3.5, 0.038 * Rs * Math.min(2.5, c0.D / prof));
        const op = suave(1.6, 2.6, tempo) * suave(0.08, 0.5, prof);
        if (Math.hypot(X - X0, Y - Y0) > Rs * 1.15 && op > 0) {
          const angC = Math.atan2(Y0 - Y, X0 - X);
          ctx.globalAlpha = op; ctx.fillStyle = P.preto; ctx.beginPath(); ctx.arc(X, Y, rP, 0, TAU); ctx.fill();
          ctx.strokeStyle = GIZ.creme; ctx.globalAlpha = 0.9 * op; ctx.lineWidth = Math.max(1.2, rP * 0.14); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(X, Y, rP * 0.92, angC - 1.15, angC + 1.15); ctx.stroke();
        }
      }
    }

    // ---- nave: anel a traço, minúscula na órbita, cresce à frente da câmera no mergulho ----
    const posNave = (uu: number): [number, number, number] => {
      const ang = lerp(2.55, 1.95, suave(0, 1, uu));
      const c = camera(uu);
      const rad = c.rs * W * lerp(2.15, 1.45, suave(U_MERGULHO, 1, uu));
      return [X0 + rad * Math.cos(ang), Y0 + rad * Math.sin(ang), lerp(11, 32, suave(U_MERGULHO, 1, uu))];
    };
    const naveOn = suave(0.9, 1.6, tempo);
    if (naveOn > 0) {
      const giro = 0.35 * tempo;
      const traco = (x: number, y: number, s: number, al: number) => {
        ctx.strokeStyle = GIZ.creme; ctx.globalAlpha = al; ctx.lineWidth = Math.max(1, s * 0.07); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, s * 0.28, 0, TAU); ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = giro + (i * TAU) / 8; ctx.moveTo(x + s * 0.28 * Math.cos(a), y + s * 0.28 * Math.sin(a)); ctx.lineTo(x + s * Math.cos(a), y + s * Math.sin(a)); }
        ctx.stroke();
      };
      for (let g = 2; g >= 0; g--) {
        const [x, y, s] = posNave(u - (g / fps) / dur);
        traco(x, y, s, naveOn * (g === 0 ? 0.85 : g === 1 ? 0.22 : 0.1));
      }
      const [x, y, s] = posNave(u);
      ctx.fillStyle = GIZ.creme;
      for (const h of haloNave) { ctx.globalAlpha = h.o * naveOn; ctx.beginPath(); ctx.arc(x + s * h.d * Math.cos(h.a), y + s * h.d * Math.sin(h.a), 0.9, 0, TAU); ctx.fill(); }
    }

    // ---- clarão de giz ao cruzar o plano do disco ----
    const clarao = Math.exp(-Math.pow((u - U_CRUZA) / 0.012, 2));
    if (clarao > 0.01) { ctx.globalAlpha = 0.5 * clarao; ctx.fillStyle = GIZ.creme; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1; ctx.filter = 'none';
  }, [t, fps, u, tempo, dur, W, H, particulas, anel, veu, estrelas, haloNave]);

  if (tempo < 0) return null;
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, width: largura, height: altura}} />;
};
