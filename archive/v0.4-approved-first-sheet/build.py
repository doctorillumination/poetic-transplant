#!/usr/bin/env python3
"""Build the portable first-page study without third-party dependencies."""

import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def encode(path):
    return base64.b64encode(path.read_bytes()).decode("ascii")


def main():
    page = json.loads((ROOT / "page-01.json").read_text())
    source = ROOT / page["source"]
    font = ROOT / "assets/SpecialElite-Regular.ttf"
    replacements = {
        "@@RENDERER@@": (ROOT / "src/physical.js").read_text(),
        "@@FONT@@": encode(font),
        "@@SOURCE@@": encode(source),
        "@@PAGE@@": json.dumps(page, ensure_ascii=False),
    }
    html = (ROOT / "src/study.html").read_text()
    for placeholder, value in replacements.items():
        assert html.count(placeholder) == 1, placeholder
        html = html.replace(placeholder, value)
    assert "\u2014" not in html, "Use drawn rules for the source's horizontal marks."
    output = ROOT / "index.html"
    output.write_text(html)
    manifest = {
        "edition": "First-page study, v0.4, fourth impression",
        "page": page["source"],
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "font_sha256": hashlib.sha256(font.read_bytes()).hexdigest(),
        "renderer_sha256": hashlib.sha256((ROOT / "src/physical.js").read_bytes()).hexdigest(),
        "output_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "text_lines": len(page["lines"]),
        "seed": 241108,
        "dependencies": "None at runtime. Font and source comparison are embedded.",
    }
    (ROOT / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {output} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
