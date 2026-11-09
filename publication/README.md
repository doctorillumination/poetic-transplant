# Transplant gallery publication

Primary address: https://fieldworks.space/transplant/
Mirror address: https://cyberdelic.space/fieldworks/transplant/

This addition publishes the exact 33-page web edition from source commit `f896fc41ba05a7789d9c8dff75948aaf3e8e68bb`. The runtime contains the book program, 33 fronts, 33 stained reverses, 33 PDF comparison plates, and the bundled font licence. The large single-file export remains a local edition. Host presentation and page bookmark synchronization are separate files.

`release.json` binds all 101 runtime files and both gallery media files to their SHA-256 hashes. `capture-method.json` and `capture-frames.json` document an eight-second recording of the actual browser composition. The book clock advances at 60 frames per second. All moving frames are captured individually; 180 resting frames repeat verified identical screenshots. The first and last settled spreads match. This recording method is not a claim about device performance.

`install.py` appends Transplant to isolated worktrees based on the current gallery branches. It archives the ten-work overview, retains the original ten artworks in order, and preserves source text and earlier editions. `transplant.md` supplies the introduction. The approved Studio Kokoro workflow prepares its source-bound Lewis reading and the revised gallery overview. `finish.py` appends only the two new recordings to the existing offline audio parts and rebuilds the verified core mirror. The complete book is included across three bounded artwork download parts on the press mirror.

## Release verification

- `npm run check` passes in the Fieldworks worktree, including all existing artwork checks.
- The Studio narration validator passes for all 86 press recordings and their offline packages.
- Earlier source texts, artwork runtime files, covers, moving previews, MP3s, and download parts retain their original bytes. The archived ten-work overview keeps its original audio and receives the archived source binding.
- Browser checks verify forward clicking, dragging a facing leaf back, page bookmarks, page 33 and its original source, interface visibility, introduction playback, and both gallery route prefixes.

Local preview uses `scripts/serve.py` from Fieldworks so the actual route security headers apply. The source book preview on port 8767 is independent and is left running.

Both public editions are verified in `live-verification.json`: 122 exact resources on Fieldworks and 132 on Cyberdelic, including every runtime asset and the complete new artwork download parts. The public book opens at its bookmarked page, turns by click and drag, and plays its introduction. Gallery changes are merged in [Fieldworks PR 11](https://github.com/doctorillumination/fieldworks/pull/11) and [Cyberdelic PR 93](https://github.com/doctorillumination/cyberdelic-space/pull/93).
