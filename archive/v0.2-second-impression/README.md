# Transplant: first impression

A static web study of the first sheet of Bradley's *Pre-liver poetic transplant manual*. The source's indents, line breaks, bracket counts, and cancellations guide the composition. Dense, misregistered ribbon impressions, wet transfers, porous ink, drips, faint graph ruling, and handling marks interpret the supplied visual references.

Open [index.html](index.html) in a browser. It is a self-contained file with its font and original-page comparison embedded. It also works on a static web server.

- **Impression** shows the experimental sheet.
- **Source page** shows the untouched first PNG at the same scale.
- **Closer** enlarges the sheet for reading and allows horizontal scrolling. **Fit sheet** restores the whole-page view.

This is the first-sheet study, v0.2, dated November 8, 2026. The second impression builds density inside the typed passages: overlapping red, green, and blue passes, swollen glyphs, dragged wet ink, and partial occlusion. The primary text and all its position data are unchanged from v0.1. Its texture is deterministic and stays still. The original files in `text/` and `reference/` remain the source archive. Only the first text PNG is included in the web work.

The earlier, cleaner treatment is preserved as a standalone page in `archive/v0.1-first-impression/index.html`, together with its template, text positions, preview, and validation record.

## Rebuild

```sh
python3 build.py
```

The build uses the Python standard library. Edit `src/study.html` for the treatment and interface, and `page-01.json` for the transcribed text and positions, measured against the 1700 by 2200 source image. The generated `build-manifest.json` records source, font, and output hashes.

The poem remains text in SVG. A separate transcript supports assistive reading. Horizontal marks from the source are drawn as rules. There are no runtime libraries or remote asset requests.

## Font

[Special Elite](https://github.com/google/fonts/tree/main/apache/specialelite), from the Google Fonts repository, is bundled locally under the Apache License 2.0. Its license is in `assets/SpecialElite-LICENSE.txt`. Paper and ink are drawn procedurally for this study. The three reference PNGs inform the treatment and are not used as page textures.
