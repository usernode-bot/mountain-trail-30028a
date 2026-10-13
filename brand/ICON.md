# Mountain Trail icon

The mark is a bold black mountain peak with a dotted trail winding up to its
summit — the same trail line the app's Trail tab draws. It follows the
[Homeroom brand framework](https://baked.design/brand/homeroom/): one simple
mark on a flat tile, no text, no gradient, only the brand pairings.

| File | Size | Colours |
| --- | --- | --- |
| `icon.svg` / `icon.png` | 1024 × 1024 | Yellow `#FFEE6F` tile, Black `#000000` mountain, Yellow trail dots (Black + Yellow) |
| `featured-light.svg` / `featured-light.png` | 1600 × 900 | Cream `#FFFEEA` ground, Black mountain and trail dots (Cream + Black) |
| `featured-dark.svg` / `featured-dark.png` | 1600 × 900 | Black `#000000` ground, Yellow mountain, Black trail dots (Black + Yellow) |

`dapp.json` points `icon.image` at `icon.png` (the platform rounds the corners
into a tile); the ⛰️ emoji stays as the fallback. The featured pictures have no
`dapp.json` field yet — they wait for the directory's featured slot.

Render (any SVG rasteriser, e.g. `rsvg-convert`):

```sh
rsvg-convert -w 1024 -h 1024 brand/icon.svg -o brand/icon.png
rsvg-convert -w 1600 -h 900 brand/featured-light.svg -o brand/featured-light.png
rsvg-convert -w 1600 -h 900 brand/featured-dark.svg -o brand/featured-dark.png
```
