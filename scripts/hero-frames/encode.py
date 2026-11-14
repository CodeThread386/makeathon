#!/usr/bin/env python3
"""Crops the poses from capture.mjs to one shared box and writes them as alpha WebP: hero/board-00 ... board-13.

    python3 scripts/hero-frames/encode.py <poses-dir> <output-dir> [width]

The page expects 14 poses: azimuth -0.6975 rad (board-00) to +0.31 rad (board-13) in 0.0775 steps, with the home pose
at board-09. Those are poses 3..16 of the 25 captured (beyond +0.31 rad the plate washes out in the scene's lighting).
It prints the aspect ratio; keep ASPECT in the hero script, and the poster <img> width/height and aspect-ratio rules in
P-Breadboard.dc.html, in step with it.
"""
import glob, os, sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 960
files = sorted(glob.glob(os.path.join(src, 'f*.png')))
if len(files) != 25:
    sys.exit(f'expected 25 poses, found {len(files)}')
files = files[3:17]
images = [Image.open(f).convert('RGBA') for f in files]
boxes = [im.split()[-1].point(lambda v: 255 if v > 5 else 0).getbbox() for im in images]
box = (min(b[0] for b in boxes) - 8, min(b[1] for b in boxes) - 8, max(b[2] for b in boxes) + 8, max(b[3] for b in boxes) + 8)
os.makedirs(out, exist_ok=True)
total = 0
for n, im in enumerate(images):
    crop = im.crop(box)
    crop = crop.resize((width, round(crop.height * width / crop.width)), Image.LANCZOS)
    path = os.path.join(out, f'board-{n:02d}.webp')
    crop.save(path, 'WEBP', quality=68, alpha_quality=80, method=6)
    total += os.path.getsize(path)
print(f'{len(images)} frames, {crop.width}x{crop.height} (aspect {crop.width / crop.height:.4f}), {total // 1024} KB in total')
