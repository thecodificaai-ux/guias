import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {GIZ, semente, useT} from '../QuadroNegro';
import {energiaEm, pulsoEm, type Ritmo} from './ritmo';
import type {PropsVivo, Vivo} from './tipos';

// Desenho vivo por ESQUELETO 3D (protótipo, 22/10; ideia do Ayrton): o Claude de quem usa olha uma imagem e escreve
// um esqueleto em texto (volumes, linhas, nós e uma animação mínima); este algoritmo "aumenta a escala": junta os
// volumes numa superfície lisa, espalha N partículas sobre ela, passa as linhas para giz, acende com a luz do cérebro
// e do Gargantua e anima pelo cardápio. Sem IA generativa no render: tudo é conta, determinística, função do tempo.
// Mesma técnica do cérebro em partículas do Reel do @ayrton.vercosa, generalizada.
//
// Esqueleto (JSON), unidades em que o objeto cabe em ~[-1, 1]; x para a direita, y para baixo, z para longe da câmera:
//   volumes: [{c: [x,y,z], r: [rx,ry,rz], giro?: [ax,ay,az] (rad), parte?: "nome", relevo?: 0..1 (sulcos), peso?: n, cor?: giz}]
//   (cor: a peça usa esse giz fixo, a luz só mexe no brilho; sem cor, a escada de luz.cores)
//   linhas:  [{pontos: [[x,y,z], ...], parte?, brilho?: 0..1, fechada?: bool}]
//   (linha perto de um volume gruda na pele dele e vira curva suave: 4 pontos já dão um sulco curvo)
//   tubos:   [{pontos: [[x,y,z], ...], raio: r | [r inicial, r final], parte?, relevo?, cor?}] (vaso, aorta, tronco,
//            galho, cauda: o algoritmo enche a curva de volumes e emenda no resto)
//   malha:   {pontos?: 700, vizinhos?: 3, brilho?: 0..1} (rede de arame presa à superfície, o visual "wireframe")
//   nos:     {pontos: [[x,y,z], ...], parte?, vizinhos?: 2}
//   densidade (partículas da superfície, padrão 60000) · suavidade (união dos volumes, padrão 4.2) · escala (fração da
//   largura por unidade, padrão 0.38) · centro ([fx, fy] da tela, padrão [0.5, 0.45])
//   luz: {cores?: [3 gizes, do escuro ao claro], quentes?: [3 gizes da onda], borda?: 0..1}
//   anima: {girar?: {eixo?: "y"|"x", amplitude?: rad (0 = gira sem parar), velocidade?: rad/s, base?: rad},
//           inclinar?: rad, rolar?: rad, aproxima?: 0..0.3, nasce?: s,
//           orbitas?: [{parte, centro?, eixo: [x,y,z], velocidade}], pulsar?: [{parte, centro?, amplitude, velocidade?, batida?}],
//           oscilar?: [{parte, centro?, eixo, amplitude (rad), velocidade, fase?}] (vai e volta preso ao eixo: asa, porta, pêndulo),
//           onda?: {batida?: true, velocidade?, largura?}}

type V3 = [number, number, number];
type CorGiz = keyof typeof GIZ;
export type Esqueleto = {
  nome: string;
  volumes: Array<{c: V3; r: V3; giro?: V3; parte?: string; relevo?: number; peso?: number; cor?: CorGiz}>;
  linhas?: Array<{pontos: V3[]; parte?: string; brilho?: number; fechada?: boolean; cor?: CorGiz}>;
  tubos?: Array<{pontos: V3[]; raio: number | [number, number]; parte?: string; relevo?: number; cor?: CorGiz}>;
  malha?: {pontos?: number; vizinhos?: number; brilho?: number};
  nos?: {pontos: V3[]; parte?: string; vizinhos?: number};
  densidade?: number; suavidade?: number; escala?: number; centro?: [number, number];
  luz?: {cores?: CorGiz[]; quentes?: CorGiz[]; borda?: number};
  anima?: {
    girar?: {eixo?: 'x' | 'y'; amplitude?: number; velocidade?: number; base?: number};
    inclinar?: number; rolar?: number; aproxima?: number; nasce?: number;
    orbitas?: Array<{parte: string; centro?: V3; eixo: V3; velocidade: number}>;
    oscilar?: Array<{parte: string; centro?: V3; eixo: V3; amplitude: number; velocidade: number; fase?: number}>;
    pulsar?: Array<{parte: string; centro?: V3; amplitude: number; velocidade?: number; batida?: boolean}>;
    onda?: {batida?: boolean; velocidade?: number; largura?: number};
  };
};

const GIZES = Object.keys(GIZ) as CorGiz[];
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (a: number, b: number, x: number) => { const u = c01((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ---------- matriz de giro (euler x, y, z) ----------
const matGiro = (g: V3 = [0, 0, 0]) => {
  const [a, b, c] = g, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // R = Rz * Ry * Rx
  return [
    cc * cb, cc * sb * sa - sc * ca, cc * sb * ca + sc * sa,
    sc * cb, sc * sb * sa + cc * ca, sc * sb * ca - cc * sa,
    -sb, cb * sa, cb * ca,
  ];
};

// ---------- modelo: superfície, linhas, nós (calculado uma vez por esqueleto) ----------
type Modelo = {
  n: number; nS: number; nL: number; nN: number; // superfície, linhas, nós (nessa ordem nos arrays)
  X: Float32Array; Y: Float32Array; Z: Float32Array; NX: Float32Array; NY: Float32Array; NZ: Float32Array;
  tipo: Uint8Array; // 0 miolo, 1 sulco (traço), 2 linha do esqueleto, 3 nó, 4 linha solta (sem volume perto)
  parte: Int16Array; corF: Int8Array; a0: Float32Array; tam: Float32Array; atraso: Float32Array; cj: Float32Array;
  arestas: Int32Array; malha: Int32Array; partes: string[];
};

// curva de Catmull-Rom pelos pontos, amostrada a cada `passo` (unidades do objeto)
const curva = (pts: V3[], fechada: boolean, passo: number): V3[] => {
  if (pts.length < 2) return pts.slice();
  const P = fechada ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const out: V3[] = [];
  for (let s = 1; s + 2 < P.length; s++) {
    const p0 = P[s - 1], p1 = P[s], p2 = P[s + 1], p3 = P[s + 2];
    const m = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) / passo));
    for (let j = 0; j < m; j++) {
      const u = j / m, u2 = u * u, u3 = u2 * u;
      out.push([0, 1, 2].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3)) as V3);
    }
  }
  if (!fechada) out.push(pts[pts.length - 1]);
  return out;
};
// tubo → cadeia de esferas pela curva (as metabolas emendam umas nas outras e no resto do objeto)
const volumesDoTubo = (T: NonNullable<Esqueleto["tubos"]>[number], id: number) => {
  const [r0, r1] = typeof T.raio === 'number' ? [T.raio, T.raio] : T.raio;
  const passo = Math.max(0.01, Math.min(r0, r1) * 0.55);
  const C = curva(T.pontos, false, passo);
  return C.map((c, k) => {
    const r = r0 + (r1 - r0) * (k / Math.max(1, C.length - 1));
    const a = C[Math.max(0, k - 1)], b = C[Math.min(C.length - 1, k + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
    // anel: a esfera só serve ao campo; as partículas nascem na parede do tubo, num anel em volta da tangente
    return {c, r: [r, r, r] as V3, parte: T.parte, relevo: T.relevo, cor: T.cor, anel: {t: [(b[0] - a[0]) / tl, (b[1] - a[1]) / tl, (b[2] - a[2]) / tl] as V3, passo, tubo: id}};
  });
};
const cache = new Map<string, Modelo>();

const construir = (E: Esqueleto): Modelo => {
  const r = semente(9001 + E.nome.length * 31);
  const KB = E.suavidade ?? 4.2;
  const vols = [...E.volumes, ...(E.tubos ?? []).flatMap((T, id) => volumesDoTubo(T, id))].map((v) => ({...v, M: matGiro((v as {giro?: V3}).giro), anel: (v as {anel?: {t: V3; passo: number; tubo: number}}).anel}));
  const partes: string[] = ['_'];
  const idParte = (p?: string) => { if (!p) return 0; let k = partes.indexOf(p); if (k < 0) { partes.push(p); k = partes.length - 1; } return k; };
  // campo implícito: soma de exp(-KB (q - 1)); superfície em F = 1; F decresce para fora
  const q = (k: number, x: number, y: number, z: number) => {
    const v = vols[k], M = v.M, dx = x - v.c[0], dy = y - v.c[1], dz = z - v.c[2];
    // coordenadas locais = M^T * d
    const lx = (M[0] * dx + M[3] * dy + M[6] * dz) / v.r[0], ly = (M[1] * dx + M[4] * dy + M[7] * dz) / v.r[1], lz = (M[2] * dx + M[5] * dy + M[8] * dz) / v.r[2];
    return lx * lx + ly * ly + lz * lz;
  };
  const F = (x: number, y: number, z: number, sem = -1) => { let s = 0; for (let k = 0; k < vols.length; k++) if (k !== sem) s += Math.exp(-KB * (q(k, x, y, z) - 1)); return s; };
  const grad = (x: number, y: number, z: number): V3 => {
    const h = 1e-3;
    return [(F(x + h, y, z) - F(x - h, y, z)) / (2 * h), (F(x, y + h, z) - F(x, y - h, z)) / (2 * h), (F(x, y, z + h) - F(x, y, z - h)) / (2 * h)];
  };
  // relevo: linhas de nível de uma soma de ondas com domínio torcido (labirinto contínuo que dobra no volume)
  const ondas = Array.from({length: 4}, () => {
    const t = r() * Math.PI * 2, p = Math.acos(2 * r() - 1);
    return {d: [Math.sin(p) * Math.cos(t), Math.sin(p) * Math.sin(t), Math.cos(p)] as V3, f: 15 + r() * 8, ph: r() * 6.28};
  });
  const labirinto = (x: number, y: number, z: number) => {
    const ux = x + 0.22 * Math.sin(3.1 * y + 1.7), uy = y + 0.22 * Math.sin(2.7 * z + 0.4), uz = z + 0.22 * Math.sin(3.3 * x + 2.2);
    let s = 0;
    for (const o of ondas) s += Math.sin(o.f * (ux * o.d[0] + uy * o.d[1] + uz * o.d[2]) + o.ph);
    return s / ondas.length;
  };

  const P: number[] = [], Nn: number[] = [], tipo: number[] = [], parte: number[] = [], corF: number[] = [], a0: number[] = [], tam: number[] = [], cj: number[] = [];
  // área aproximada de cada elipsoide (Thomsen) para repartir as partículas
  // (anel de tubo: a faixa da parede entre um anel e o próximo)
  const area = vols.map((v) => { if (v.anel) return 2 * Math.PI * v.r[0] * v.anel.passo; const [a, b, c] = v.r, p = 1.6; return 4 * Math.PI * Math.pow((Math.pow(a * b, p) + Math.pow(a * c, p) + Math.pow(b * c, p)) / 3, 1 / p) * ((v as {peso?: number}).peso ?? 1); });
  const somaA = area.reduce((s, a) => s + a, 0) || 1;
  const N = E.densidade ?? 60000;
  // campo sem o próprio tubo: o anel só some por dentro do corpo ou de outro tubo, não dentro das esferas vizinhas dele
  const Fsem = (x: number, y: number, z: number, tubo: number) => { let s = 0; for (let j = 0; j < vols.length; j++) if (vols[j].anel?.tubo !== tubo) s += Math.exp(-KB * (q(j, x, y, z) - 1)); return s; };
  vols.forEach((v, k) => {
    const nk = Math.max(v.anel ? 6 : 40, Math.round((N * area[k]) / somaA));
    let e1: V3 = [1, 0, 0], e2: V3 = [0, 1, 0];
    if (v.anel) {
      const t = v.anel.t, a: V3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const c1: V3 = [t[1] * a[2] - t[2] * a[1], t[2] * a[0] - t[0] * a[2], t[0] * a[1] - t[1] * a[0]], l1 = Math.hypot(...c1) || 1;
      e1 = [c1[0] / l1, c1[1] / l1, c1[2] / l1]; e2 = [t[1] * e1[2] - t[2] * e1[1], t[2] * e1[0] - t[0] * e1[2], t[0] * e1[1] - t[1] * e1[0]];
    }
    for (let i = 0; i < nk; i++) {
      let x: number, y: number, z: number;
      if (v.anel) {
        const th = r() * Math.PI * 2, u = (r() - 0.5) * v.anel.passo, R = v.r[0], ct = Math.cos(th), st = Math.sin(th), t = v.anel.t;
        x = v.c[0] + R * (ct * e1[0] + st * e2[0]) + u * t[0]; y = v.c[1] + R * (ct * e1[1] + st * e2[1]) + u * t[1]; z = v.c[2] + R * (ct * e1[2] + st * e2[2]) + u * t[2];
        if (Fsem(x, y, z, v.anel.tubo) > 0.8) continue;
      } else {
        // direção de Fibonacci com um sopro de acaso: cobre por igual sem desenhar grade
        const yy = Math.max(-1, Math.min(1, 1 - (2 * (i + 0.5 + (r() - 0.5) * 0.9)) / nk)), rad = Math.sqrt(1 - yy * yy), th = i * 2.399963 + k + (r() - 0.5) * 0.9 / Math.sqrt(nk) * 6;
        const lx = Math.cos(th) * rad * v.r[0], ly = yy * v.r[1], lz = Math.sin(th) * rad * v.r[2], M = v.M;
        x = v.c[0] + M[0] * lx + M[1] * ly + M[2] * lz; y = v.c[1] + M[3] * lx + M[4] * ly + M[5] * lz; z = v.c[2] + M[6] * lx + M[7] * ly + M[8] * lz;
        if (F(x, y, z, k) > 0.8) continue; // por dentro de outro volume: não aparece
      }
      // Newton até a superfície F = 1 da união
      for (let it = 0; it < 5; it++) {
        const f = F(x, y, z) - 1, g = grad(x, y, z), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1e-9;
        const s = Math.max(-0.08, Math.min(0.08, f / g2));
        x -= s * g[0]; y -= s * g[1]; z -= s * g[2];
      }
      const g = grad(x, y, z), gl = Math.hypot(g[0], g[1], g[2]) || 1;
      const nx = -g[0] / gl, ny = -g[1] / gl, nz = -g[2] / gl;
      let tp = 0, prof = 0;
      const rel = v.relevo ?? 0;
      if (rel > 0) {
        const s = labirinto(x, y, z);
        if (Math.abs(s) < (0.075 + 0.03 * r()) * rel) tp = 1;
        prof = rel * 0.035 * (1 - Math.min(1, Math.abs(s) / 0.5)); // o sulco afunda
      } else if (r() < 0.12) tp = 1; // sem relevo: um pouco de traço para dar desenho
      P.push(x - nx * prof, y - ny * prof, z - nz * prof); Nn.push(nx, ny, nz);
      tipo.push(tp); parte.push(idParte(v.parte)); corF.push(v.cor ? GIZES.indexOf(v.cor) : -1);
      a0.push(tp === 1 ? 0.8 + 0.2 * r() : 0.28 + 0.2 * r()); tam.push(tp === 1 ? 1.25 + 0.75 * r() : 0.7 + 0.45 * r()); cj.push((r() - 0.5) * 0.14);
    }
  });
  const nS = tipo.length;
  // linhas: curva suave pelos pontos; perto de um volume, cada ponto é puxado até a pele (Newton) e fica um fio acima
  // dela, então o sulco acompanha a curvatura em vez de cortar reto por cima
  for (const L of E.linhas ?? []) {
    for (const [x0, y0, z0] of curva(L.pontos, !!L.fechada, 0.007)) {
      let x = x0 + (r() - 0.5) * 0.006, y = y0 + (r() - 0.5) * 0.006, z = z0 + (r() - 0.5) * 0.006;
      const perto = F(x, y, z) > 0.3;
      let nx = 0, ny = 0, nz = -1;
      if (perto) {
        for (let it = 0; it < 6; it++) {
          const f = F(x, y, z) - 1, g = grad(x, y, z), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1e-9;
          const s = Math.max(-0.08, Math.min(0.08, f / g2));
          x -= s * g[0]; y -= s * g[1]; z -= s * g[2];
        }
        const g = grad(x, y, z), gl = Math.hypot(g[0], g[1], g[2]) || 1; nx = -g[0] / gl; ny = -g[1] / gl; nz = -g[2] / gl;
        x += nx * 0.006; y += ny * 0.006; z += nz * 0.006;
      }
      P.push(x, y, z); Nn.push(nx, ny, nz); tipo.push(perto ? 2 : 4); parte.push(idParte(L.parte)); corF.push(L.cor ? GIZES.indexOf(L.cor) : -1);
      a0.push((L.brilho ?? 0.9) * (0.75 + 0.25 * r())); tam.push(1.1 + 0.6 * r()); cj.push((r() - 0.5) * 0.1);
    }
  }
  const nL = tipo.length - nS;
  const nosP = E.nos?.pontos ?? [];
  for (const p of nosP) { P.push(p[0], p[1], p[2]); Nn.push(0, 0, -1); tipo.push(3); parte.push(idParte(E.nos?.parte)); corF.push(-1); a0.push(0.9); tam.push(1.8 + r()); cj.push(0); }
  const nN = nosP.length, n = tipo.length;
  const arestas: number[] = [];
  const viz = E.nos?.vizinhos ?? 2;
  nosP.forEach((a, i) => {
    const ordem = nosP.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])] as [number, number]).filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]);
    for (const [j] of ordem.slice(0, viz)) arestas.push(nS + nL + i, nS + nL + j);
  });
  // malha de arame: pontos da superfície espalhados por igual, cada um ligado aos vizinhos mais perto na pele
  const malha: number[] = [];
  if (E.malha) {
    const K = Math.min(nS, E.malha.pontos ?? 700), vz = E.malha.vizinhos ?? 3, esc: number[] = [];
    const passoM = nS / K;
    for (let k = 0; k < K; k++) esc.push(Math.min(nS - 1, Math.floor((k + r()) * passoM)));
    const d = (a: number, b: number) => Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]);
    const viz1 = esc.map((a) => esc.reduce((m, b) => (b !== a ? Math.min(m, d(a, b)) : m), 9));
    const limite = 3 * [...viz1].sort((u, v) => u - v)[Math.floor(viz1.length / 2)];
    const ja = new Set<number>();
    esc.forEach((a) => {
      const ordem = esc.filter((b) => b !== a).map((b) => [b, d(a, b)] as [number, number]).sort((u, v) => u[1] - v[1]);
      for (const [b, l] of ordem.slice(0, vz)) {
        const ch = Math.min(a, b) * nS + Math.max(a, b);
        if (l < limite && !ja.has(ch)) { ja.add(ch); malha.push(a, b); }
      }
    });
  }
  // atraso de nascimento: do centro para fora, com ruído
  const atraso = new Float32Array(n);
  for (let i = 0; i < n; i++) atraso[i] = 0.55 * c01(Math.hypot(P[3 * i], P[3 * i + 1], P[3 * i + 2]) / 1.3) + 0.35 * r();
  const F32 = (a: number[], o: number) => Float32Array.from({length: n}, (_, i) => a[3 * i + o]);
  return {
    n, nS, nL, nN, X: F32(P, 0), Y: F32(P, 1), Z: F32(P, 2), NX: F32(Nn, 0), NY: F32(Nn, 1), NZ: F32(Nn, 2),
    tipo: Uint8Array.from(tipo), parte: Int16Array.from(parte), corF: Int8Array.from(corF), a0: Float32Array.from(a0), tam: Float32Array.from(tam), atraso, cj: Float32Array.from(cj),
    arestas: Int32Array.from(arestas), malha: Int32Array.from(malha), partes,
  };
};
export const modeloDe = (E: Esqueleto) => { let m = cache.get(E.nome); if (!m) { m = construir(E); cache.set(E.nome, m); } return m; };

// ---------- movimento: partes (órbita, pulso) e câmera (giro, inclinação, aproximação) ----------
const rodar = (x: number, y: number, z: number, c: V3, e: V3, a: number): V3 => {
  // Rodrigues em volta do eixo e (normalizado) passando por c
  const l = Math.hypot(e[0], e[1], e[2]) || 1, ux = e[0] / l, uy = e[1] / l, uz = e[2] / l;
  const px = x - c[0], py = y - c[1], pz = z - c[2], ca = Math.cos(a), sa = Math.sin(a), d = ux * px + uy * py + uz * pz;
  return [
    c[0] + px * ca + (uy * pz - uz * py) * sa + ux * d * (1 - ca),
    c[1] + py * ca + (uz * px - ux * pz) * sa + uy * d * (1 - ca),
    c[2] + pz * ca + (ux * py - uy * px) * sa + uz * d * (1 - ca),
  ];
};
type Cam = {yaw: number; pitch: number; roll: number; S: number; cx: number; cy: number; D: number};
const camera = (E: Esqueleto, tempo: number, W: number, H: number): Cam => {
  const g = E.anima?.girar ?? {}, amp = g.amplitude ?? 0.55, vel = g.velocidade ?? 0.3;
  const giro = (g.base ?? 0) + (amp > 0 ? amp * Math.sin(vel * tempo) : vel * tempo);
  const ap = 1 + (E.anima?.aproxima ?? 0.08) * suave(0, 8, tempo);
  const [fx, fy] = E.centro ?? [0.5, 0.45];
  return {yaw: g.eixo === 'x' ? 0 : giro, pitch: (E.anima?.inclinar ?? 0.18) + (g.eixo === 'x' ? giro : 0), roll: E.anima?.rolar ?? 0, S: (E.escala ?? 0.38) * W * ap, cx: fx * W, cy: fy * H, D: 4};
};
// posição da partícula i (modelo + partes) e projeção; saída em variáveis de módulo para não alocar
let sX = 0, sY = 0, sZ = 0, sEsc = 1, nx_ = 0, ny_ = 0, nz_ = 0;
const pose = (E: Esqueleto, M: Modelo, i: number, tempo: number, cam: Cam, pulso = 0) => {
  let x = M.X[i], y = M.Y[i], z = M.Z[i], nx = M.NX[i], ny = M.NY[i], nz = M.NZ[i];
  const pn = M.partes[M.parte[i]];
  if (pn !== '_') {
    for (const o of E.anima?.orbitas ?? []) if (o.parte === pn) {
      const c = o.centro ?? [0, 0, 0], a = o.velocidade * tempo;
      [x, y, z] = rodar(x, y, z, c, o.eixo, a); [nx, ny, nz] = rodar(nx, ny, nz, [0, 0, 0], o.eixo, a);
    }
    for (const o of E.anima?.oscilar ?? []) if (o.parte === pn) {
      const c = o.centro ?? [0, 0, 0], a = o.amplitude * Math.sin(o.velocidade * tempo + (o.fase ?? 0));
      [x, y, z] = rodar(x, y, z, c, o.eixo, a); [nx, ny, nz] = rodar(nx, ny, nz, [0, 0, 0], o.eixo, a);
    }
    for (const p of E.anima?.pulsar ?? []) if (p.parte === pn) {
      const c = p.centro ?? [0, 0, 0], k = 1 + p.amplitude * (p.batida ? pulso : Math.sin((p.velocidade ?? 1.2) * tempo));
      x = c[0] + (x - c[0]) * k; y = c[1] + (y - c[1]) * k; z = c[2] + (z - c[2]) * k;
    }
  }
  // câmera: giro (y), inclinação (x), rolagem (z)
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
  let x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
  let mx = nx * cy + nz * sy, mz = -nx * sy + nz * cy, my = ny * cp - mz * sp, mz2 = ny * sp + mz * cp;
  const x2 = x1 * cr - y1 * sr, y2 = x1 * sr + y1 * cr;
  const mx2 = mx * cr - my * sr, my2 = mx * sr + my * cr;
  x1 = x2; y1 = y2; mx = mx2; my = my2;
  const k = cam.D / (cam.D + z2);
  sX = cam.cx + x1 * cam.S * k; sY = cam.cy + y1 * cam.S * k; sZ = z2; sEsc = k;
  nx_ = mx; ny_ = my; nz_ = mz2;
};
// luz presa à câmera (de cima, da esquerda, da frente) + brilho de borda
const L = (() => { const v = [-0.5, -0.6, -0.62], l = Math.hypot(v[0], v[1], v[2]); return v.map((a) => a / l); })();
const brilho = (borda: number) => {
  const fac = -nz_; // > 0: virada para a câmera
  const lamb = c01(nx_ * L[0] + ny_ * L[1] + nz_ * L[2]); // L aponta para a luz (frente, cima, esquerda)
  const rim = Math.pow(1 - Math.min(1, Math.abs(nz_)), 1.6);
  return {fac, b: c01(0.2 + 0.55 * lamb + borda * rim)};
};

const CORES_PADRAO: CorGiz[] = ['verde', 'menta', 'creme'];
const QUENTES_PADRAO: CorGiz[] = ['laranja', 'salmao', 'creme'];

const batidas = (ritmo: Ritmo | null | undefined, t: number, janela: number) => {
  const bs = ritmo?.batidas ?? Array.from({length: 400}, (_, k) => k * 0.62), out: Array<{tb: number; k: number; forte: boolean}> = [];
  for (let k = 0; k < bs.length; k++) if (bs[k] <= t && bs[k] > t - janela) out.push({tb: bs[k], k, forte: (ritmo?.compassos ?? []).some((c) => Math.abs(c - bs[k]) < 0.02) || (!ritmo && k % 4 === 0)});
  return out;
};

export const criarVivo = (E: Esqueleto): Vivo => {
  const posicao: Vivo['posicao'] = (i, tempo, W, H) => {
    const M = modeloDe(E);
    if (i < 0 || i >= M.n) return null;
    pose(E, M, i, tempo, camera(E, tempo, W, H));
    const solta = M.tipo[i] >= 3;
    const {fac, b} = brilho(E.luz?.borda ?? 0.7);
    if (!solta && fac < 0) return null;
    const cores = E.luz?.cores ?? CORES_PADRAO;
    const bb = M.tipo[i] === 0 ? b * 0.45 : b;
    return {x: sX, y: sY, b: bb, cor: M.corF[i] >= 0 ? GIZ[GIZES[M.corF[i]]] : GIZ[cores[bb > 0.72 ? 2 : bb > 0.42 ? 1 : 0]]};
  };

  const Componente: React.FC<PropsVivo> = ({largura, altura, t0, chegada, saida, ritmo}) => {
    const {t} = useT();
    const W = Math.round(largura), H = Math.round(altura);
    const ref = useRef<HTMLCanvasElement>(null);
    const off = useRef<HTMLCanvasElement[] | null>(null);
    const M = useMemo(() => modeloDe(E), []);
    const veio = useMemo(() => { if (!chegada) return null; const f = new Uint8Array(M.n); for (const i of chegada) if (i < M.n) f[i] = 1; return f; }, [M, chegada]);
    const vai = useMemo(() => { if (!saida) return null; const f = new Uint8Array(M.n); for (const i of saida.ids) if (i < M.n) f[i] = 1; return f; }, [M, saida]);

    useLayoutEffect(() => {
      const cv = ref.current; if (!cv) return;
      const ctx = cv.getContext('2d'); if (!ctx) return;
      if (!off.current) off.current = [0, 1, 2, 3, 4].map(() => document.createElement('canvas'));
      const W2 = Math.ceil(W / 2), H2 = Math.ceil(H / 2);
      off.current.forEach((o, k) => { const w = k < 3 ? W : W2, h = k < 3 ? H : H2; if (o.width !== w) o.width = w; if (o.height !== h) o.height = h; });
      const [cvB, cvA, cvR, cvG, cvH] = off.current;
      const ctB = cvB.getContext('2d'), ctA = cvA.getContext('2d'), ctR = cvR.getContext('2d'), ctG = cvG.getContext('2d'), ctH = cvH.getContext('2d');
      if (!ctB || !ctA || !ctR || !ctG || !ctH) return;
      ctx.clearRect(0, 0, W, H);
      for (const ct of [ctB, ctA, ctR]) ct.clearRect(0, 0, W, H);
      ctG.clearRect(0, 0, W2, H2);
      const tempo = t - t0;
      if (tempo < 0) return;
      const fora = saida ? c01((t - saida.a) / Math.max(0.01, (saida.b - saida.a) * 0.5)) : 0, vivoA = 1 - fora;
      if (vivoA <= 0.002) return;
      const sumiu = !!(saida && vai && t >= saida.a);
      const kW = W / 1080, NASCE = E.anima?.nasce ?? 0.7;
      const cam = camera(E, tempo, W, H), camQ = camera(E, tempo - 0.03, W, H);
      const e = energiaEm(ritmo ?? null, t), {pulso} = pulsoEm(ritmo ?? null, t);
      const borda = E.luz?.borda ?? 0.7;
      const cores = (E.luz?.cores ?? CORES_PADRAO).map((c) => GIZ[c]), quentes = (E.luz?.quentes ?? QUENTES_PADRAO).map((c) => GIZ[c]);

      // ondas na batida: nascem num ponto do traço e correm pela superfície
      const ondas: Array<{x: number; y: number; z: number; ts: number; v: number; w: number; vida: number; amp: number}> = [];
      let clarao = 0;
      if ((E.anima?.onda?.batida ?? true) && tempo > 0.8) {
        for (const {tb, k, forte} of batidas(ritmo, t, 1.5)) {
          if (tb < t0 + 0.8) continue;
          const i = (((k + 7) * 2654435761) >>> 0) % Math.max(1, M.nS + M.nL);
          ondas.push({x: M.X[i], y: M.Y[i], z: M.Z[i], ts: tb, v: E.anima?.onda?.velocidade ?? 1.6, w: E.anima?.onda?.largura ?? 0.06, vida: forte ? 1.3 : 0.8, amp: forte ? 1 : 0.7});
          if (forte) clarao += c01((t - tb) / 0.06) * Math.exp(-(t - tb) / 0.38);
        }
      }
      const brilhoMus = (0.85 + 0.6 * e) * (1 + 0.15 * clarao);

      // projeção (agora e 0,03 s antes, para o rastro curto) e z-buffer grosso
      const n = M.n, SX = new Float32Array(n), SY = new Float32Array(n), QX = new Float32Array(n), QY = new Float32Array(n), DP = new Float32Array(n), SC = new Float32Array(n), FAC = new Float32Array(n), BR = new Float32Array(n), EV = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        FAC[i] = -9;
        if (sumiu && vai![i]) continue;
        const ev = veio && veio[i] ? 1 : 1 - (1 - c01((tempo - M.atraso[i]) / NASCE)) ** 3;
        if (ev <= 0) continue;
        pose(E, M, i, tempo - 0.03, camQ, pulso); QX[i] = sX; QY[i] = sY;
        pose(E, M, i, tempo, cam, pulso);
        const {fac, b} = brilho(borda);
        const solta = M.tipo[i] >= 3;
        if (!solta && fac < -0.05) continue;
        // nasce soprado: o ponto vem de fora do lugar dele
        const k = (1 - ev) * (1 - ev) * 60 * kW;
        SX[i] = sX + nx_ * k; SY[i] = sY + ny_ * k; DP[i] = sZ; SC[i] = sEsc; FAC[i] = solta ? 1 : fac; BR[i] = b; EV[i] = ev;
        const rx = SX[i] - QX[i], ry = SY[i] - QY[i], rl = Math.hypot(rx, ry), rMax = 12 * kW;
        if (rl > rMax) { QX[i] = SX[i] - (rx * rMax) / rl; QY[i] = SY[i] - (ry * rMax) / rl; }
      }
      const CEL = 6, GW = Math.ceil(W / CEL) + 2, GH = Math.ceil(H / CEL) + 2, zb = new Float32Array(GW * GH).fill(1e9);
      const cel = (x: number, y: number) => { const gx = Math.floor(x / CEL) + 1, gy = Math.floor(y / CEL) + 1; return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gx + gy * GW; };
      for (let i = 0; i < M.nS + M.nL; i++) { if (FAC[i] < 0.25 || EV[i] < 0.5 || M.tipo[i] === 4) continue; const k = cel(SX[i], SY[i]); if (k >= 0 && DP[i] < zb[k]) zb[k] = DP[i]; }
      const oclusao = (i: number) => { const k = cel(SX[i], SY[i]); if (k < 0 || zb[k] > 1e8) return 1; return 1 - suave(0.08, 0.22, DP[i] - zb[k]); };

      // desenho: traço nítido por cor, fonte do brilho em meia resolução, onda na camada quente
      ctB.lineCap = 'round'; ctG.lineCap = 'round'; ctA.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        if (FAC[i] < -0.05 || M.tipo[i] === 3) continue;
        const vis = (M.tipo[i] >= 3 ? 1 : suave(-0.05, 0.2, FAC[i])) * oclusao(i);
        if (vis <= 0.01) continue;
        let g = 0;
        for (const o of ondas) {
          const dt = t - o.ts; if (dt < 0 || dt > o.vida) continue;
          const R = o.v * dt, d = Math.hypot(M.X[i] - o.x, M.Y[i] - o.y, M.Z[i] - o.z);
          g = Math.max(g, (Math.exp(-(((d - R) / o.w) ** 2)) + (d < R ? 0.12 * Math.exp(-(R - d) / o.v / 0.3) : 0)) * o.amp * (1 - suave(o.vida * 0.55, o.vida, dt)));
        }
        const linha = M.tipo[i] !== 0, b = (linha ? Math.min(1, 0.3 + BR[i] * 1.15) : BR[i]) + M.cj[i]; // o traço é a luz: nunca apaga
        const persp = Math.min(1.6, Math.max(0.7, Math.pow(SC[i], 0.85)));
        const a = Math.min(1, M.a0[i] * (0.15 + 0.85 * Math.pow(c01(linha ? Math.min(1, 0.3 + BR[i] * 1.15) : BR[i]), 1.2)) * vis * EV[i] * vivoA * brilhoMus * (1 + 0.5 * g));
        if (a <= 0.004) continue;
        const lw = 2 * M.tam[i] * persp * kW * (1 + 0.3 * g);
        ctB.strokeStyle = M.corF[i] >= 0 ? GIZ[GIZES[M.corF[i]]] : cores[b > 0.72 ? 2 : b > 0.42 ? 1 : 0]; ctB.globalAlpha = a; ctB.lineWidth = lw;
        ctB.beginPath(); ctB.moveTo(QX[i], QY[i]); ctB.lineTo(SX[i] + 0.01, SY[i]); ctB.stroke();
        if (linha || (i & 1)) {
          ctG.strokeStyle = M.corF[i] >= 0 ? GIZ[GIZES[M.corF[i]]] : cores[1]; ctG.globalAlpha = a * (linha ? 0.55 : 0.45); ctG.lineWidth = lw * 1.3 + 1.6 * kW;
          ctG.beginPath(); ctG.moveTo(SX[i] * 0.5, SY[i] * 0.5); ctG.lineTo(SX[i] * 0.5 + 0.01, SY[i] * 0.5); ctG.stroke();
        }
        if (linha && g > 0.06) {
          ctA.strokeStyle = quentes[g > 0.78 ? 2 : g > 0.42 ? 1 : 0]; ctA.globalAlpha = Math.min(1, 0.95 * g * vivoA); ctA.lineWidth = lw * (1 + 0.5 * g);
          ctA.beginPath(); ctA.moveTo(QX[i], QY[i]); ctA.lineTo(SX[i] + 0.01, SY[i]); ctA.stroke();
        }
      }
      // malha de arame: só a parte virada para a câmera e não escondida
      ctR.lineCap = 'round';
      if (M.malha.length) {
        ctR.strokeStyle = cores[2]; ctR.lineWidth = 1.2 * kW;
        const bm = E.malha?.brilho ?? 0.5;
        for (let k = 0; k < M.malha.length; k += 2) {
          const a = M.malha[k], b = M.malha[k + 1];
          if (FAC[a] < 0.05 || FAC[b] < 0.05) continue;
          const vis = Math.min(suave(0.05, 0.3, FAC[a]), suave(0.05, 0.3, FAC[b])) * oclusao(a) * oclusao(b);
          if (vis < 0.02) continue;
          ctR.globalAlpha = bm * 0.55 * vis * Math.min(EV[a], EV[b]) * vivoA * (0.9 + 0.3 * e);
          ctR.beginPath(); ctR.moveTo(SX[a], SY[a]); ctR.lineTo(SX[b], SY[b]); ctR.stroke();
        }
      }
      // rede: arestas e nós, pulso correndo na batida
      const n0 = M.nS + M.nL;
      ctR.strokeStyle = cores[1];
      for (let k = 0; k < M.arestas.length; k += 2) {
        const a = M.arestas[k], b = M.arestas[k + 1];
        if (FAC[a] < -1 || FAC[b] < -1) continue;
        ctR.globalAlpha = 0.3 * Math.min(EV[a], EV[b]) * vivoA * (0.9 + 0.4 * e); ctR.lineWidth = 1.1 * kW;
        ctR.beginPath(); ctR.moveTo(SX[a], SY[a]); ctR.lineTo(SX[b], SY[b]); ctR.stroke();
      }
      for (let j = 0; j < M.nN; j++) {
        const i = n0 + j; if (FAC[i] < -1) continue;
        ctR.strokeStyle = cores[2]; ctR.globalAlpha = 0.8 * EV[i] * vivoA; ctR.lineWidth = 2 * M.tam[i] * kW * (1 + 0.5 * pulso);
        ctR.beginPath(); ctR.moveTo(QX[i], QY[i]); ctR.lineTo(SX[i] + 0.01, SY[i]); ctR.stroke();
      }
      for (const {tb, k} of batidas(ritmo, t, 0.5)) {
        if (!M.arestas.length || tb < t0 + 0.8) continue;
        const kk = 2 * ((((k + 3) * 2654435761) >>> 0) % (M.arestas.length / 2)), a = M.arestas[kk], b = M.arestas[kk + 1];
        const u = c01((t - tb) / 0.35); if (u >= 1 || FAC[a] < -1 || FAC[b] < -1) continue;
        ctA.strokeStyle = quentes[2]; ctA.globalAlpha = vivoA; ctA.lineWidth = 5 * kW;
        const x = SX[a] + (SX[b] - SX[a]) * u, y = SY[a] + (SY[b] - SY[a]) * u;
        ctA.beginPath(); ctA.moveTo(x, y); ctA.lineTo(x + 0.01, y); ctA.stroke();
      }
      // composição: brilho largo em meia resolução, giz nítido, rede, onda quente
      const meia = (src: HTMLCanvasElement, raio: number, a: number) => {
        if (a <= 0.003) return;
        ctH.clearRect(0, 0, W2, H2); ctH.filter = `blur(${(raio * 0.5).toFixed(1)}px)`; ctH.globalAlpha = 1;
        ctH.drawImage(src, 0, 0, W2, H2); ctH.filter = 'none';
        ctx.globalAlpha = Math.min(1, a); ctx.drawImage(cvH, 0, 0, W, H); ctx.globalAlpha = 1;
      };
      const glow = brilhoMus * (1 + 0.6 * clarao) * (1 + 0.1 * pulso);
      meia(cvG, 26, 0.75 * glow); meia(cvG, 7, 0.7 * glow);
      ctx.drawImage(cvB, 0, 0);
      meia(cvR, 8, 0.4); ctx.drawImage(cvR, 0, 0);
      meia(cvA, 22, 0.9); meia(cvA, 6, 0.7); ctx.drawImage(cvA, 0, 0);
    }, [t, t0, W, H, M, veio, vai, saida, ritmo]);

    return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, width: largura, height: altura}} />;
  };
  return {n: () => modeloDe(E).n, posicao, ancora: E.centro ?? [0.5, 0.45], Componente};
};
