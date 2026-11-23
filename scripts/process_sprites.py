#!/usr/bin/env python3
"""Process chroma-key game sprites into transparent, web-ready assets."""
from PIL import Image
import numpy as np
import os

DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'games', 'rocket-rampage')


def key_out(name: str, max_dim: int, jpeg_quality: int | None = None) -> None:
    src = os.path.join(DIR, name + '.png')
    img = Image.open(src).convert('RGB')
    arr = np.array(img).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    mx = np.maximum(r, b)
    diff = g - mx  # green dominance

    # Hard key: strong pure-green background
    hard = (g > 90) & (diff > 60)
    # Soft edge: greenish fringe -> partial alpha (kills jaggies)
    soft = (~hard) & (diff > 22) & (g > 70)

    alpha = np.where(hard, 0, 255).astype(np.uint8)
    alpha[soft] = 110

    # Despill: clamp green channel to max(r,b) on kept pixels (removes green fringe)
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
        dst = os.path.join(DIR, name + '.jpg')
        im.convert('RGB').save(dst, 'JPEG', quality=jpeg_quality, optimize=True, progressive=True)
        os.remove(src)
    else:
        dst = os.path.join(DIR, name + '.png')
        im.save(dst, optimize=True)
    kb = os.path.getsize(dst) // 1024
    print(f'{name}: {im.size} -> {dst} ({kb} KB)')


key_out('rocket', 168)
key_out('asteroid', 184)
key_out('enemy', 168)
key_out('banner', 1600, jpeg_quality=84)
