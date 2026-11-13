# Transplant

A thirty-three-sheet web edition of Bradley's *Pre-liver poetic transplant manual*, held in a two-page book of ink, paper, and care. Each sheet has its own ribbon colours, wet cancellations, pooled ink, abrasion, lifted fibres, and quieter passages of visible type. Edition 1.3 reprints every front and reverse without the added water stains.

The web reader is **index.html**, served together with `assets/`. Its small opening document loads nearby full-resolution images as needed. The separate **standalone.html** is an approximately 70 MB offline edition with all fronts, reverses, source comparisons, the font, and page-turn code embedded. Both use exactly the same printed images and turning code.

## The complete manuscript

The [complete source PDF](text/full-manual/pre-liver%20poetic%20manual.pdf) has 33 letter-sized pages. It is preserved unchanged, alongside 300 dpi raster plates at 2550 by 3300 in `text/full-manual/`.

- Sheets 01 to 13 and 15 carry forward the compositions from the fifteen-page edition.
- Sheet 14 is rebuilt from the complete, correctly proportioned PDF page. Its heading, overlapping poet's message, lower treatment passage, and marginal poem are retained without the earlier vertical compression.
- Sheets 16 to 33 each have an individually composed treatment in `src/profiles.json`.
- The source PDF's last page contains only a heading. Its open space remains the closing leaf; no table or additional writing has been invented.
- **Source page** now shows the corresponding page from the full PDF for every sheet.

All original PNG and JPEG files in `text/`, and the three references in `reference/`, remain unchanged. The complete PDF sequence has a one-to-one page mapping. The print renderer uses original glyph silhouettes, preserving indents, columns, ASCII marks, rules, cross-outs, rotation, overlaps, and literal HTML. It does not typeset OCR or reflow the writing. Sheet 01 retains its approved manually positioned type.

The first sheet's verified reading transcript remains available. Other sheets have descriptive image alternatives. Working OCR and PDF text extraction are unverified and excluded from the reader. The PDF extractions are local review intermediates, not published transcriptions.

## Reading

- Use **Next** and **Previous**, or the left and right arrow keys.
- Pull the right page leftward across the spine to turn forward. Pull the left page rightward to go back. A short pull settles back, and a corner click completes a turn.
- The first poem starts on the right, with no left leaf. Each turn leaves the preceding sheet's weathered reverse on the left, with faint mirrored ink showing through, and reveals the next poem on the right.
- The numbered menu opens any of the 33 sheets. The URL fragment records the current sheet. Home and End open the first and last sheets.
- **Source page** shows the full manuscript page without the added material treatment.
- **Closer** enlarges the book for panning. Next and Previous change spreads directly while enlarged. **Fit book** returns to the complete spread.
- Reduced-motion preferences skip the automatic curl. When WebGL is unavailable, the reader still changes spreads.

The page turn uses a locally authored WebGL surface bending around a moving cylindrical fold. It has a printed front, transferred reverse, directional lighting, and a moving shadow. The reverse remains on the left in the orientation it had while curling. Pointer capture keeps the pull attached to the page, with drawing coalesced to animation frames.

Nearby images and GPU textures are prepared ahead of gestures in a bounded five-leaf working set. The size of this working set does not grow with the manuscript. Rendering stops when the turn settles. No runtime libraries or remote asset requests are required.

## Build and print sources

Rebuild the web reader and the self-contained offline edition from the saved prints using the Python standard library:

```sh
python3 build.py
```

`build-manifest.json` records the PDF hash, page mapping, printed source, normalized plate, full-PDF comparison, front, reverse, renderer, profiles, reader, and complete HTML hashes.

To regenerate source plates and the print workbench, use Poppler and a Python installation with Pillow:

```sh
pdftoppm -r 300 -png 'text/full-manual/pre-liver poetic manual.pdf' text/full-manual/page
python3.11 prepare.py
```

Open `render.html`, select a sheet, and use **Save front** and **Save reverse** to replace its files in `assets/prints/`. Then run `build.py`.

The material renderer is `src/edition-renderer.js`; each composition is in `src/profiles.json`. The reader uses `src/book.html` and `src/book.js`. The first sheet's canonical positions remain in `page-01.json`.

For local preview:

```sh
python3 -m http.server 8767 --bind 127.0.0.1
```

Open [the local reader](http://127.0.0.1:8767/). Host or distribute `index.html` with `assets/` for the lighter web edition. Open or distribute `standalone.html` for the single-file offline edition. No image recompression is used to make the web reader smaller.

## Editions and verification

The four first-sheet impressions remain in `archive/`. Git preserves the [initial complete fifteen-page reader](https://github.com/doctorillumination/poetic-transplant/commit/5d332ba6442c2ac753d9aa4fce75863b88d18d32), the [two-page edition](https://github.com/doctorillumination/poetic-transplant/commit/9b2039c4ad722dfa00ca4e2d82f99eac1f6fe946), and the [first complete 33-page edition](https://github.com/doctorillumination/poetic-transplant/commit/f896fc41ba05a7789d9c8dff75948aaf3e8e68bb).

`qa/full-manual/` contains source and print contact sheets, the PDF provenance record, and checks for the first complete 33-page edition. `qa/validation.json` records their scope and limits. Earlier checks and previews remain in `qa/`.

Browser verification covers all 33 impressions and source comparisons, facing reverses, the repaired fourteenth page, navigation beyond sheet 15, corner drags and cancellation, keyboard boundaries, bookmarks, and enlarged reading. Frame timings are observations in the preview browser, not performance guarantees for other devices. Physical phone, Safari-specific, and direct-file-navigation checks remain unverified.

[Special Elite](https://github.com/google/fonts/tree/main/apache/specialelite) is bundled under the Apache License 2.0. Its license is in `assets/SpecialElite-LICENSE.txt` and embedded in the reader. Implementation references: [MDN WebGL lighting](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Lighting_in_WebGL) and [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events).
