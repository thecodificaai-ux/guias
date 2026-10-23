// Ritmo da música (opcional): energia e batidas de uma trilha, para o desenho pulsar e acender na batida.
// energia: volume suavizado 0..1 a cada `passo` s; batidas e compassos (segundos) medidos de uma trilha, por exemplo com um detector de batidas. Sem ritmo, bate a cada 0,62 s.
// As partículas dançam com a trilha: o avanço de cada transição segue um "relógio da música" (anda mais na batida
// e na energia alta, menos no vale) e sempre termina no tempo marcado; os desenhos respiram com a energia.
export type Ritmo = {passo: number; energia: number[]; batidas: number[]; compassos: number[]; bpm: number};

export const energiaEm = (r: Ritmo | null, t: number) => {
  if (!r || t < 0) return 0.4;
  const i = t / r.passo, i0 = Math.floor(i);
  if (i0 >= r.energia.length - 1) return r.energia[r.energia.length - 1] ?? 0.4;
  const f = i - i0;
  return r.energia[i0] * (1 - f) + r.energia[i0 + 1] * f;
};

// pulso: 1 na batida, decai em ~0,25 s; k = índice da última batida
export const pulsoEm = (r: Ritmo | null, t: number) => {
  const bs = r?.batidas;
  if (!bs || !bs.length) {
    const per = 0.62, k = Math.floor(t / per);
    return {pulso: Math.exp(-(t - k * per) / 0.25), k, forte: k % 4 === 0};
  }
  let lo = 0, hi = bs.length - 1;
  if (t < bs[0]) return {pulso: 0, k: -1, forte: false};
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (bs[m] <= t) lo = m; else hi = m - 1; }
  const forte = (r?.compassos ?? []).some((c) => Math.abs(c - bs[lo]) < 0.02);
  return {pulso: Math.exp(-(t - bs[lo]) / 0.25), k: lo, forte};
};

// relógio da música entre a e b: 0 em a, 1 em b, andando mais na batida e na energia
const cache = new Map<string, {tab: Float64Array; a: number; b: number}>();
export const relogio = (r: Ritmo | null, a: number, b: number, t: number) => {
  if (t <= a) return 0;
  if (t >= b) return 1;
  if (!r) return (t - a) / (b - a);
  const chave = `${a}|${b}`;
  let c = cache.get(chave);
  if (!c) {
    const n = Math.max(2, Math.ceil((b - a) / 0.01));
    const tab = new Float64Array(n + 1);
    for (let i = 1; i <= n; i++) {
      const tt = a + ((b - a) * i) / n;
      const w = 0.45 + 0.6 * energiaEm(r, tt) + 0.9 * pulsoEm(r, tt).pulso;
      tab[i] = tab[i - 1] + w;
    }
    for (let i = 1; i <= n; i++) tab[i] /= tab[n];
    c = {tab, a, b};
    cache.set(chave, c);
  }
  const x = ((t - a) / (b - a)) * (c.tab.length - 1), i0 = Math.floor(x), f = x - i0;
  // mistura com o tempo linear: a música dá o impulso, o tempo garante a forma
  const m = c.tab[i0] * (1 - f) + c.tab[Math.min(c.tab.length - 1, i0 + 1)] * f;
  return 0.35 * ((t - a) / (b - a)) + 0.65 * m;
};
