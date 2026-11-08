# Transplant: first-sheet study

A static web study of the first sheet of Bradley's *Pre-liver poetic transplant manual*. The source's indents, line breaks, bracket counts, and cancellations guide the composition. Uneven ink absorption, rubbed impressions, flaking paper, felt-tip cancellations, pooled drips, faint graph ruling, and handling marks interpret the supplied visual references.

Open [index.html](index.html) in a browser. It is a self-contained file with its font and original-page comparison embedded. It also works on a static web server.

- **Impression** shows the experimental sheet.
- **Source page** shows the untouched first PNG at the same scale.
- **Closer** enlarges the sheet for reading and allows horizontal scrolling. **Fit sheet** restores the whole-page view.

This is the first-sheet study, v0.4, dated November 8, 2026. The fourth impression adds surface decay to the third impression's ink treatment. A shared abrasion field removes portions of the ink and paper ruling, revealing rough, pale fibres underneath. Some words remain dark while rubbed passages survive as faint, broken remnants. Small chips lift from saturated marks, dirt collects around handled edges, and the drips gather into uneven pools with residual pigment and tide marks.

Each text line still has a single deposit. Type and felt marks pass through the same paper-tooth and absorption treatment, so they have porous edges, irregular wicking, dry gaps, and pools where colours meet. The wording and all its position data are unchanged from v0.1. Its texture is deterministic and stays still. The original files in `text/` and `reference/` remain the source archive. Only the first text PNG is included in the web work.

The earlier treatments are preserved as standalone pages in `archive/v0.1-first-impression/index.html`, `archive/v0.2-second-impression/index.html`, and `archive/v0.3-third-impression/index.html`, together with their templates, text positions, previews, and validation records.

## Rebuild

```sh
python3 build.py
```

The build uses the Python standard library. Edit `src/study.html` for the interface, `src/physical.js` for the material rendering, and `page-01.json` for the transcribed text and positions, measured against the 1700 by 2200 source image. The generated `build-manifest.json` records source, font, renderer, and output hashes.

The visible impression is drawn at the source resolution on canvas. The single set of SVG text records retains the primary text and its positions for verification. A separate transcript supports assistive reading. There are no runtime libraries or remote asset requests.

## Font

[Special Elite](https://github.com/google/fonts/tree/main/apache/specialelite), from the Google Fonts repository, is bundled locally under the Apache License 2.0. Its license is in `assets/SpecialElite-LICENSE.txt`. Paper and ink are drawn procedurally for this study. The three reference PNGs inform the treatment and are not used as page textures.
