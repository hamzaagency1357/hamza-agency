# PWA Icons — Placeholder Notice

This folder contains the icon.svg as a design reference.

## Required PNG icons to generate:

Before going to production, generate these PNGs from `icon.svg`:

| File         | Size     | Purpose            |
|--------------|----------|--------------------|
| icon-72.png  | 72×72    | Android legacy     |
| icon-96.png  | 96×96    | Shortcuts          |
| icon-128.png | 128×128  | Chrome Web Store   |
| icon-144.png | 144×144  | Windows tile       |
| icon-152.png | 152×152  | iOS home screen    |
| icon-192.png | 192×192  | Android + maskable |
| icon-384.png | 384×384  | PWA splash         |
| icon-512.png | 512×512  | PWA splash maskable|

## How to generate

### Option A — Free online tool
Upload `icon.svg` to https://realfavicongenerator.net and download the package.

### Option B — Using sharp (Node.js)
```bash
npm install -g sharp-cli
sharp -i icon.svg -o icon-192.png resize 192
sharp -i icon.svg -o icon-512.png resize 512
# ...repeat for each size
```

### Option C — Using Figma / Sketch
Export the SVG at each required size as PNG.

## After generating
Place all PNG files in this `/public/icons/` folder and commit them.
