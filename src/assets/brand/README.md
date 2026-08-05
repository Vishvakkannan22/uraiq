# Brand assets — drop-in slot

Save your logo files **into this folder** with these names. They are picked up
automatically at build time; no code change is needed. Until then the app draws
a vector stand-in.

| Filename | Where it appears |
|---|---|
| `wordmark.svg` (or `.png` / `.webp`) | Login & signup hero |
| `icon.svg` (or `.png` / `.webp`) | Nav rail, app mark |

Any of `.svg`, `.png`, `.webp`, `.jpg` will be matched — the name is what
matters, not the extension.

## Which of your two logos goes where

- **Light wordmark** (gradient U + Q, navy "rai") → `wordmark.svg`.
  Export with a **transparent background**, not the light-grey one — it sits on
  a dark aurora panel on the auth screen, so a baked-in grey box will show as a
  rectangle around the logo.

- **Neon icon mark** (glowing U + speech bubble on black) → this one is a raster
  render whose highlights disappear at nav-rail and favicon sizes. It works
  beautifully as a splash or marketing image, but for `icon.svg` you want a
  simplified square mark instead.

## Export guidance

- **SVG** is strongly preferred — stays crisp on every display and at every size.
- If exporting **PNG**, use 3× the display size on a transparent background:
  `wordmark.png` ≥ 1200 px wide, `icon.png` at 512 × 512.
