# Transplant

A fifteen-sheet web edition of Bradley's *Pre-liver poetic transplant manual*, made from the original PNGs and the three supplied visual references. Each sheet has its own fixed print treatment: quiet ribbon ink, dense cancellations, wet marker, pooled drips, stains, abrasion, and lifted paper fibres. The approved fourth impression remains the first sheet. The reader opens as a two-page book, beginning with the first poem on the right.

Open **index.html** in a browser. It is a self-contained file, approximately 27 MB, with every print, source plate, reverse, font, and the page-turn code embedded. It can also be served by any static web host.

## Reading

- Use **Next** and **Previous**, or the left and right arrow keys.
- Pull the right page leftward, across the spine, to turn forward. Pull the left page rightward to go back. A short pull settles back onto the same spread, and a corner click completes a turn.
- Each poem is printed on the right side of a leaf. Turning it leaves its stained reverse on the left, with faint mirrored ink showing through, and reveals the next poem on the right. The opening has no left leaf.
- Use the numbered menu to choose any of the fifteen sheets. The URL fragment records the current sheet.
- **Source page** shows the source composition without the new ink and wear.
- **Closer** enlarges the book for panning and reading. Corner dragging is reserved for the fitted view. Next and Previous change the spread directly while enlarged.
- Home and End open the first and last sheets. Reduced-motion preferences skip automatic curl animation.

The page turn is a locally authored WebGL surface that bends around a moving cylindrical fold across the full spread. It has two sides, a faint transferred reverse, directional shading, and a shadow on the next leaf. The reverse remains on the left after the turn, in the same orientation it had while curling. The surface follows the horizontal drag across both pages, with vertical movement changing its bend. Pointer capture and touch handling keep the pull attached to the page.

Nearby fronts and reverses are decoded and uploaded to a bounded GPU cache before a gesture. The turn reuses those textures, with no image decoding, texture upload, or canvas resize inside its animation loop. Pointer movement is drawn once per animation frame. Rendering stops when the sheet settles. When WebGL is unavailable, the reader still changes spreads.

## Source fidelity and editions

The original files in `text/` and `reference/` are unchanged. Input images use the PNGs, including the unusual wide fourteenth image. Normalized source plates fit inside a 1700 by 2200 sheet without stretching or reflow. The wide image stays wide at the top of its leaf.

Sheet 01 retains the established, manually positioned type from `page-01.json`. Sheets 02 to 15 use the original ink silhouettes directly, preserving columns, ASCII marks, superscripts, underlines, cross-outs, the cyan inset, existing overlaps, and the source's own cropping. Colour and material effects are applied to those marks. No OCR is used to typeset the poem.

The first sheet's verified reading transcript is retained. Later sheets have descriptive image alternatives. Working OCR in `qa/ocr/` is unverified and is excluded from the book; a full accessible transcription of those sheets remains future work.

The four earlier first-sheet studies remain in `archive/`, including the approved `archive/v0.4-approved-first-sheet/index.html`.

The complete single-page reader is preserved in Git at [5d332ba](https://github.com/doctorillumination/poetic-transplant/commit/5d332ba6442c2ac753d9aa4fce75863b88d18d32). The open-book revision changes presentation and interaction; all fifteen printed fronts, reverses, and normalized source plates retain their established hashes.

## Build

To rebuild the book from the saved prints, run inside this folder:

```sh
python3 build.py
```

This uses only the Python standard library. `build-manifest.json` records the original source, normalized plate, front, reverse, renderer, profiles, reader, and complete HTML hashes.

The material source is `src/edition-renderer.js`, and the fifteen curated compositions are in `src/profiles.json`. To regenerate their plates and print workbench, use a Python installation with Pillow:

```sh
python3.11 prepare.py
```

Open `render.html`, select a sheet, and use **Save front** and **Save reverse** to replace the matching files in `assets/prints/`. Then run `build.py`. The standalone reader uses `src/book.html` and `src/book.js`.

For local browser preview, run from this folder:

```sh
python3 -m http.server 8767 --bind 127.0.0.1
```

Open [the local reader](http://127.0.0.1:8767/). Only `index.html` is required to distribute or host the finished book.

## Validation and resources

`qa/open-book-checks.json` contains the observed spread, gesture, and frame-timing checks. `qa/validation.json` records their scope and limits. `qa/reader-checks.json` preserves the earlier single-page checks. `qa/book-contact.jpg` shows all fifteen prints; the open-book and page-curl previews are also in `qa/`.

Browser checks cover all fifteen spreads and source comparisons, the first right-hand leaf, correct facing reverses, page boundaries, button and keyboard navigation, forward and reverse drags, cancelled pulls, corner clicks, narrow layout, and enlarged reading. Frame timing is measured in the preview browser and does not establish performance on other devices. Physical phone performance, Safari-specific rendering, and direct file navigation have not been verified.

[Special Elite](https://github.com/google/fonts/tree/main/apache/specialelite) is bundled under the Apache License 2.0; its license is in `assets/SpecialElite-LICENSE.txt`. There are no runtime libraries or remote asset requests. Implementation references: [MDN WebGL lighting](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Lighting_in_WebGL) and [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events).
