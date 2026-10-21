// Troque pelas cores da SUA marca. A técnica usa 3 gizes (claro, quente, frio), o preto da lousa e misturas deles.
export const tokens = {
  paleta: {
    creme: '#F8F0E2', // giz claro
    'terracota-clara': '#E8743D', // giz quente
    'verde-suave': '#9DB8A8', // giz frio
    preto: '#050505', // lousa
  },
} as const;

// Fontes: Caveat (giz) e JetBrains Mono (rótulos). Instale com @remotion/google-fonts se quiser carregar de verdade:
//   import {loadFont} from '@remotion/google-fonts/Caveat'; loadFont();
export const FONTE = {manuscrita: "'Caveat', 'Comic Sans MS', cursive", mono: "'JetBrains Mono', Consolas, monospace"} as const;
export const fonteCarregada = Promise.resolve();
