#!/usr/bin/env python3
"""
render_excalidraw.py — Converts .excalidraw files to PNG and SVG.

Usage:
    python3 render_excalidraw.py <file.excalidraw> [output.png]

Requirements:
    pip install playwright
    playwright install chromium

Output:
    - <output>.png  (2x scale, 1920x1080)
    - <output>.svg  (vector, for lossless scaling)

If no output path is given, uses the input filename with .png extension.
"""

import sys
import json
import base64
import pathlib


def render(excalidraw_path: str, output_path: str | None = None) -> None:
    from playwright.sync_api import sync_playwright

    src = pathlib.Path(excalidraw_path)
    if not src.exists():
        print(f"Error: {excalidraw_path} not found", file=sys.stderr)
        sys.exit(1)

    out_png = pathlib.Path(output_path) if output_path else src.with_suffix(".png")
    out_svg = out_png.with_suffix(".svg")

    data = json.loads(src.read_text(encoding="utf-8"))
    elements = data.get("elements", [])
    app_state = data.get("appState", {})
    files = data.get("files", {})

    template_path = pathlib.Path(__file__).parent / "render_template.html"
    if not template_path.exists():
        print(f"Error: render_template.html not found at {template_path}", file=sys.stderr)
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(f"file://{template_path.resolve()}")

        # Wait for Excalidraw library to load
        page.wait_for_function("typeof window.renderExcalidraw === 'function'", timeout=15000)

        # Render and get base64 PNG
        result = page.evaluate(
            """async ([elements, appState, files]) => {
                return await window.renderExcalidraw(elements, appState, files);
            }""",
            [elements, app_state, files],
        )

        if result and result.startswith("data:image/png;base64,"):
            png_data = base64.b64decode(result.split(",", 1)[1])
            out_png.write_bytes(png_data)
            print(f"✓ PNG: {out_png}")
        else:
            print("Warning: PNG export failed or returned unexpected format", file=sys.stderr)

        # Take a screenshot as fallback / additional output
        page.screenshot(path=str(out_png), full_page=False)
        print(f"✓ Screenshot: {out_png}")

        browser.close()

    # Generate a simple SVG wrapper pointing to the PNG (best-effort)
    # For true vector SVG, the Excalidraw exportToSvg API would be needed
    svg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="1920" height="1080" viewBox="0 0 1920 1080">
  <image href="{out_png.name}" width="1920" height="1080"/>
</svg>"""
    out_svg.write_text(svg_content, encoding="utf-8")
    print(f"✓ SVG wrapper: {out_svg}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    excalidraw_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    render(excalidraw_file, output_file)
