# Braille Buddy

Browser-based Grade‑1 Braille translator with one‑click export to 3D‑printable STL plaques. Runs entirely in your browser—no installs, no data leaves your device.

## Why it matters

Tactile access changes lives. With Braille Buddy, allies, educators, makers, and community groups can quickly produce labels, learning aids, and signage to support blind and low‑vision people. The goal is to reduce friction: type text, preview Braille, export a printable plaque.

## Features

- Grade‑1 Braille translation (letters a–z, capitals, numbers, and common punctuation)
- Capital indicator (⠠) and number sign (⠼) handling
- Highlights unsupported characters (e.g., emoji) so you can adjust
- Live size estimates (mm/in) from your current text and settings
- Adjustable geometry: total thickness, dot height, dot diameter, cylinder smoothness
- Exports ASCII STL in millimeters for direct slicing/printing
- 100% client‑side: open `index.html` in a modern browser and go

## Quick start

1) Open `index.html` in a modern desktop browser (Chrome, Edge, Firefox, Safari).
2) Type your text (letters, numbers, basic punctuation). The Braille preview updates live.
3) Click “Download .STL” to export a printable plaque.
4) Slice and print as usual.

No build tools required; this project uses React UMD + Babel Standalone for a smooth, zero‑setup preview.

## 3D printing tips

- Units: STL exports in millimeters.
- Layer height: ≤ 0.20 mm for clearer dots; ≤ 0.16 mm is even better.
- Materials: PLA is fine for learning aids; PETG/ABS for higher durability.
- Speed: slow outer walls for crisp dot edges (e.g., 20–35 mm/s).
- Orientation: print face‑up so dots are cylinders standing on the base.
- Contrast: consider dual‑color or paint‑fill grooves to improve visual contrast for mixed‑audience labels.
- Defaults: dot Ø ≈ 1.5 mm, dot height ≈ 0.6 mm, total thickness ≈ 0.2 in (~5.1 mm) are reasonable starting points.

## Accessibility and impact

- Consult local standards (e.g., UEB, signage regulations) if making public signage.
- Involve blind users when deciding placement, scale, and context.
- Ensure consistent dot quality and spacing; poor prints hinder readability.
- Use respectfully—avoid token Braille; prioritize true usability.

## Limitations

- Grade‑1 only (no contractions/Grade‑2 yet).
- Basic ASCII punctuation support; emoji and complex symbols are skipped.
- Layout is monospaced by Braille cell; advanced word‑wrapping and hyphenation are not implemented.

## Contributing

Ideas and pull requests are welcome. Useful directions:

- Grade‑2 contractions and rules (UEB)
- Multi‑language tables and locale‑aware punctuation
- Better multi‑line layout and word‑wrap controls
- Additional export formats (e.g., 3MF) and embossed/engraved variants
- A11y improvements in the UI (screen reader text, keyboard focus, high‑contrast themes)
- Packaging as a PWA for offline use
- Automated tests for translation and STL geometry

## Tech notes

- Core UI: `index.html` + `braille_buddy.jsx` using React UMD and Babel Standalone
- Translator: simple Grade‑1 mapping with capitalization and number handling
- Geometry: ASCII STL generator in mm; dots are cylinders on a rectangular base
- Privacy: all work happens locally in your browser

## License

No license specified yet. If you plan to accept contributions or encourage broad use, consider adding a permissive license such as MIT or Apache‑2.0. I can add one on request.

