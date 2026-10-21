"""Foto -> pontos de giz (visual quadro-negro, receitas/visuais/quadro-negro.md R6).

Mesmo algoritmo da prova 03 (referencias/internas/2026-10-21_visual_quadro-negro-provas):
brilho por celula -> niveis esticados -> curva em S -> vinheta no rosto -> piso ->
difusao de erro (Floyd-Steinberg) com ruido no limiar -> ponto igual com jitter ->
cor por faixa de luz, foco quente em volta do rosto com borda esfumada.
Deterministico (semente) para o render do Remotion ler o JSON.

uso: python tools/pontilhar.py <foto> <saida.json> [--largura 1080] [--altura 1350] [--cel 4]
      [--foco 0.5,0.32,0.34,0.42] [--vinheta 0.5,0.32,0.62,0.78] [--s 0.45,9] [--semente 7] [--so-creme]
"""
import argparse
import json
import math
import random

import numpy as np
from PIL import Image, ImageOps


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('foto')
    ap.add_argument('saida')
    ap.add_argument('--largura', type=int, default=1080)
    ap.add_argument('--altura', type=int, default=1350)
    ap.add_argument('--cel', type=float, default=4.0, help='tamanho da celula em px do quadro final')
    ap.add_argument('--foco', default='0.5,0.32,0.34,0.42', help='cx,cy,rx,ry do foco quente (fracao do quadro)')
    ap.add_argument('--vinheta', default='0.5,0.32,0.62,0.78', help='cx,cy,rx,ry da vinheta (fracao do quadro)')
    ap.add_argument('--s', default='0.45,9', help='centro,inclinacao da curva em S')
    ap.add_argument('--piso', type=float, default=0.05)
    ap.add_argument('--borda', type=float, default=0.14, help='largura (fracao) do esmaecimento ate a borda, para o recorte nao virar caixa')
    ap.add_argument('--semente', type=int, default=7)
    ap.add_argument('--so-creme', action='store_true')
    a = ap.parse_args()

    rnd = random.Random(a.semente)
    cols, rows = int(a.largura // a.cel), int(a.altura // a.cel)
    img = ImageOps.exif_transpose(Image.open(a.foto)).convert('L')
    # recorta no mesmo 4:5 do quadro antes de reduzir (centro)
    alvo = a.largura / a.altura
    w, h = img.size
    if w / h > alvo:
        nw = int(h * alvo); img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / alvo); img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    L = np.asarray(img.resize((cols, rows), Image.LANCZOS), dtype=np.float64) / 255.0

    mn, mx = float(L.min()), float(L.max())
    L = (L - mn) / ((mx - mn) or 1.0)
    sc, si = (float(x) for x in a.s.split(','))
    L = 1.0 / (1.0 + np.exp(-(L - sc) * si))
    vx, vy, vrx, vry = (float(x) for x in a.vinheta.split(','))
    ys, xs = np.mgrid[0:rows, 0:cols]
    dx = (xs / cols - vx) / vrx
    dy = (ys / rows - vy) / vry
    v = 1.0 - np.minimum(1.0, np.power(dx * dx + dy * dy, 1.4) * 0.9)
    if a.borda > 0:
        fx = np.clip(np.minimum(xs / cols, 1 - xs / cols) / a.borda, 0, 1)
        fy = np.clip(np.minimum(ys / rows, 1 - ys / rows) / a.borda, 0, 1)
        v = v * (fx * fy) ** 1.5
    L = np.minimum(1.0, (a.piso + (1 - a.piso) * L) * v)
    base = L.copy()

    fx0, fy0, frx, fry = (float(x) for x in a.foco.split(','))
    jit = a.cel * 0.5
    pontos = []
    E = L.copy()
    for y in range(rows):
        for x in range(cols):
            vv = E[y, x]
            on = 1 if vv >= 0.5 + (rnd.random() - 0.5) * 0.22 else 0
            err = vv - on
            if x + 1 < cols: E[y, x + 1] += err * 7 / 16
            if y + 1 < rows:
                if x > 0: E[y + 1, x - 1] += err * 3 / 16
                E[y + 1, x] += err * 5 / 16
                if x + 1 < cols: E[y + 1, x + 1] += err * 1 / 16
            if not on:
                continue
            b = float(base[y, x])
            fx = (x / cols - fx0) / frx
            fy = (y / rows - fy0) / fry
            dist = math.sqrt(fx * fx + fy * fy)
            quente = rnd.random() < 1 - min(1.0, max(0.0, (dist - 0.7) / 0.6))
            if a.so_creme:
                cor = 'creme'
            elif quente:
                cor = 'creme' if b > 0.8 else 'salmao' if b > 0.55 else 'laranja' if b > 0.3 else 'verde'
            else:
                cor = 'creme' if b > 0.8 else 'menta' if b > 0.45 else 'verde'
            pontos.append([
                round((x + 0.5) * a.cel + (rnd.random() - 0.5) * jit, 1),
                round((y + 0.5) * a.cel + (rnd.random() - 0.5) * jit, 1),
                round(a.cel * 0.42 * (0.8 + rnd.random() * 0.4), 2),
                cor,
                round(0.75 + rnd.random() * 0.25, 2),
            ])
    rnd.shuffle(pontos)  # ordem do sopro
    with open(a.saida, 'w', encoding='utf-8') as f:
        json.dump({'largura': a.largura, 'altura': a.altura, 'cel': a.cel, 'foto': a.foto, 'semente': a.semente, 'pontos': pontos}, f)
    print(f'{len(pontos)} pontos -> {a.saida}')


if __name__ == '__main__':
    main()
