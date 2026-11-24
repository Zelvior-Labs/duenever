#!/usr/bin/env python3
"""Process chroma-key game sprites into transparent, web-ready assets."""
from PIL import Image
import numpy as np
import os

PUB = os.path.join(os.path.dirname(__file__), '..', 'public', 'games')

# game dir -> [(name, max_dim, jpeg_quality or None)]
JOBS = {
    'rocket-rampage': [
        ('rocket', 168, None),
        ('asteroid', 184, None),
        ('enemy', 168, None),
        ('banner', 1600, 84),
    ],
    'rune-bastion': [
        ('tower-mage', 150, None),
        ('tower-ranger', 150, None),
        ('tower-frost', 150, None),
        ('enemy-goblin', 104, None),
        ('enemy-brute', 140, None),
        ('enemy-dragon', 176, None),
        ('enemy-wolf', 110, None),
        ('enemy-shaman', 130, None),
        ('banner', 1600, 84),
    ],
}


def key_out(game: str, name: str, max_dim: int, jpeg_quality: int | None) -> None:
    game_dir = os.path.join(PUB, game)
    src = os.path.join(game_dir, 'raw', name + '.png') if os.path.isdir(os.path.join(game_dir, 'raw')) else os.path.join(game_dir, name + '.png')
    img = Image.open(src).convert('RGB')
    arr = np.array(img).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    mx = np.maximum(r, b)
    diff = g - mx  # green dominance

    hard = (g > 90) & (diff > 60)
    soft = (~hard) & (diff > 22) & (g > 70)

    alpha = np.where(hard, 0, 255).astype(np.uint8)
    alpha[soft] = 110

    keep = alpha > 0
    excess = np.clip(diff, 0, None)
    g2 = np.where(keep, g - excess, g)

    out = np.dstack([arr[..., 0], g2, arr[..., 2]]).astype(np.uint8)
    im = Image.fromarray(np.dstack([out, alpha]), 'RGBA')

    bbox = im.getchannel('A').getbbox()
    if bbox:
        im = im.crop(bbox)

    w, h = im.size
    scale = max_dim / max(w, h)
    if scale < 1:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

    if jpeg_quality:  # opaque banner -> jpg
        dst = os.path.join(game_dir, name + '.jpg')
        im.convert('RGB').save(dst, 'JPEG', quality=jpeg_quality, optimize=True, progressive=True)
    else:
        dst = os.path.join(game_dir, name + '.png')
        im.save(dst, optimize=True)
    kb = os.path.getsize(dst) // 1024
    print(f'{game}/{name}: {im.size} -> {dst} ({kb} KB)')


for game, jobs in JOBS.items():
    raw_dir = os.path.join(PUB, game, 'raw')
    if not os.path.isdir(raw_dir):
        print(f'skip {game} (no raw/ source directory — already processed)')
        continue
    for name, max_dim, q in jobs:
        src = os.path.join(raw_dir, name + '.png')
        if not os.path.exists(src):
            print(f'skip {game}/{name} (missing raw)')
            continue
        key_out(game, name, max_dim, q)
