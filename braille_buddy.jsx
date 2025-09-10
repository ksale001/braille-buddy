const { useMemo, useState } = React;

// --- Grade‑1 Braille translator + STL export (no emoji support) ---
// One-button download hardened for sandboxed previews:
// 1) Try direct <a download> programmatic click (synchronous to keep user activation)
// 2) Fallback: open blob in new tab (still triggered by same click)
// 3) Fallback: navigate current tab to blob (Save As)
// UI only shows a single "Download .STL" button; an ephemeral hint explains any fallback.

// -----------------------------------------------------
// Translator (text → Grade‑1 Braille)
// -----------------------------------------------------
const LETTERS = {
  a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑",
  f: "⠋", g: "⠛", h: "⠓", i: "⠊", j: "⠚",
  k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕",
  p: "⠏", q: "⠟", r: "⠗", s: "⠎", t: "⠞",
  u: "⠥", v: "⠧", w: "⠺", x: "⠭", y: "⠽", z: "⠵",
};

const PUNCT = {
  ",": "⠂", ".": "⠲", "?": "⠦", "!": "⠖",
  ";": "⠆", ":": "⠒", "'": "⠄", "-": "⠤", '"': "⠶",
};

const CAPITAL = "⠠"; // capitalization indicator (dot‑6)
const NUMBER  = "⠼"; // number sign (dots 3‑4‑5‑6)

const DIGIT_TO_AJ = {
  "1": "a", "2": "b", "3": "c", "4": "d", "5": "e",
  "6": "f", "7": "g", "8": "h", "9": "i", "0": "j",
};

function toBrailleWithMeta(input) {
  const codepoints = Array.from(input);
  let out = "";
  const nodes = [];
  const unsupportedSet = new Set();

  for (let i = 0; i < codepoints.length; ) {
    const ch = codepoints[i];

    // Newlines (CRLF or single CR/LF)
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && codepoints[i + 1] === "\n") i += 2; else i += 1;
      out += "\n"; nodes.push("\n");
      continue;
    }
    // Tabs → two spaces
    if (ch === "\t") { out += "  "; nodes.push("  "); i++; continue; }
    if (ch === " ")   { out += " ";  nodes.push(" ");  i++; continue; }

    // Numbers: one NUMBER sign, then a–j cells
    if (/^[0-9]$/.test(ch)) {
      out += NUMBER; nodes.push(NUMBER);
      while (i < codepoints.length && /^[0-9]$/.test(codepoints[i])) {
        const d = codepoints[i];
        const aj = DIGIT_TO_AJ[d];
        const cell = aj ? LETTERS[aj] : "";
        out += cell; nodes.push(cell);
        i++;
      }
      continue;
    }

    // Letters
    if (/^[A-Z]$/.test(ch)) {
      const lower = ch.toLowerCase();
      const cell = LETTERS[lower];
      if (cell) { out += CAPITAL + cell; nodes.push(CAPITAL, cell); }
      i++;
      continue;
    }
    if (/^[a-z]$/.test(ch)) {
      const cell = LETTERS[ch];
      if (cell) { out += cell; nodes.push(cell); }
      i++;
      continue;
    }

    // Punctuation
    if (PUNCT[ch]) {
      const cell = PUNCT[ch];
      out += cell; nodes.push(cell); i++; continue;
    }

    // Unsupported (emoji, non‑ASCII symbols) → skip
    unsupportedSet.add(ch);
    i++;
  }

  return { braille: out, nodes, unsupported: Array.from(unsupportedSet).slice(0, 8) };
}

function toBraille(input) {
  return toBrailleWithMeta(input).braille;
}

// ==========================
//  STL EXPORTER (ASCII STL)
// ==========================
// Units: millimeters (mm)

const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };

function facet(n, a, b, c) {
  return `  facet normal ${n[0]} ${n[1]} ${n[2]}\n    outer loop\n      vertex ${a[0]} ${a[1]} ${a[2]}\n      vertex ${b[0]} ${b[1]} ${b[2]}\n      vertex ${c[0]} ${c[1]} ${c[2]}\n    endloop\n  endfacet`;
}

function tri(a, b, c) {
  const n = norm(cross(sub(b,a), sub(c,a)));
  return facet(n, a, b, c);
}

function addBox(w, h, t) {
  const v = (x,y,z) => [x,y,z];
  const faces = [];
  faces.push(facet([0,0,-1], v(0,0,0), v(w,0,0), v(w,h,0)));
  faces.push(facet([0,0,-1], v(0,0,0), v(w,h,0), v(0,h,0)));
  faces.push(facet([0,0,1], v(0,0,t), v(0,h,t), v(w,h,t)));
  faces.push(facet([0,0,1], v(0,0,t), v(w,h,t), v(w,0,t)));
  faces.push(facet([1,0,0], v(w,0,0), v(w,0,t), v(w,h,t)));
  faces.push(facet([1,0,0], v(w,0,0), v(w,h,t), v(w,h,0)));
  faces.push(facet([-1,0,0], v(0,0,0), v(0,h,0), v(0,h,t)));
  faces.push(facet([-1,0,0], v(0,0,0), v(0,h,t), v(0,0,t)));
  faces.push(facet([0,1,0], v(0,h,0), v(w,h,0), v(w,h,t)));
  faces.push(facet([0,1,0], v(0,h,0), v(w,h,t), v(0,h,t)));
  faces.push(facet([0,-1,0], v(0,0,0), v(0,0,t), v(w,0,t)));
  faces.push(facet([0,-1,0], v(0,0,0), v(w,0,t), v(w,0,0)));
  return faces.join("\n");
}

function addCylinder(cx, cy, z0, r, h, seg=24) {
  const parts = [];
  const z1 = z0 + h;
  const centerTop = [cx, cy, z1];
  for (let i=0;i<seg;i++) {
    const a0 = (i/seg)*Math.PI*2;
    const a1 = ((i+1)/seg)*Math.PI*2;
    const x0 = cx + r*Math.cos(a0), y0 = cy + r*Math.sin(a0);
    const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
    const p00 = [x0,y0,z0];
    const p01 = [x1,y1,z0];
    const p10 = [x0,y0,z1];
    const p11 = [x1,y1,z1];
    parts.push(tri(p00,p01,p11));
    parts.push(tri(p00,p11,p10));
    parts.push(facet([0,0,1], centerTop, p11, p10));
  }
  return parts.join("\n");
}

function brailleCharMask(ch) {
  if (!ch) return 0;
  const cp = ch.codePointAt(0);
  if (cp != null && cp >= 0x2800 && cp <= 0x28FF) return cp - 0x2800; // standard Braille block
  if (ch === " ") return 0; // blank cell
  return 0; // unsupported → blank
}

function buildBraillePlaqueSTL(
  braille,
  opts
) {
  const p = {
    totalThicknessInch: 0.2,
    dotHeightMM: 0.6,
    dotDiaMM: 1.5,
    seg: 24,
    marginMM: 4,
    cellWMM: 6.0,
    cellHMM: 10.0,
    intraXMM: 2.5,
    intraYMM: 2.5,
    ...opts,
  };

  const totalMM = p.totalThicknessInch * 25.4;
  const dotR = p.dotDiaMM / 2;
  const baseMM = Math.max(totalMM - p.dotHeightMM, 2.0);

  const lines = braille.split(/\r?\n/);
  const cols = Math.max(1, ...lines.map(l => l.length));
  const rows = Math.max(1, lines.length);
  const widthMM = p.marginMM*2 + cols * p.cellWMM;
  const heightMM = p.marginMM*2 + rows * p.cellHMM;

  const leftColXOffset = (p.cellWMM - p.intraXMM) / 2;
  const topRowYOffset = (p.cellHMM - 2*p.intraYMM) / 2;

  const parts = [];
  parts.push("solid braille_plaque_units_mm");
  parts.push(addBox(widthMM, heightMM, baseMM));

  for (let r=0; r<rows; r++) {
    const line = lines[r] || "";
    for (let c=0; c<cols; c++) {
      const ch = line[c] || " ";
      const m = brailleCharMask(ch);
      if (m === 0) continue;

      const xLeft = p.marginMM + c * p.cellWMM;
      const yTop = heightMM - p.marginMM - r * p.cellHMM;

      const xL = xLeft + leftColXOffset;
      const xR = xL + p.intraXMM;
      const yTopRow = yTop - topRowYOffset;
      const yMidRow = yTopRow - p.intraYMM;
      const yBotRow = yMidRow - p.intraYMM;

      const DOTS = [
        { on: !!(m & 0x01), x: xL, y: yTopRow },
        { on: !!(m & 0x02), x: xL, y: yMidRow },
        { on: !!(m & 0x04), x: xL, y: yBotRow },
        { on: !!(m & 0x08), x: xR, y: yTopRow },
        { on: !!(m & 0x10), x: xR, y: yMidRow },
        { on: !!(m & 0x20), x: xR, y: yBotRow },
      ];

      for (const d of DOTS) {
        if (!d.on) continue;
        parts.push(addCylinder(d.x, d.y, baseMM, dotR, p.dotHeightMM, p.seg));
      }
    }
  }

  parts.push("endsolid braille_plaque_units_mm");
  const stl = parts.join("\n");
  return { stl, widthMM, heightMM, totalMM };
}

// -----------------
// Utility: filename sanitizer & export helpers
// -----------------
function sanitizeFileBase(s) {
  const base = s.trim().slice(0, 24).replace(/[^A-Za-z0-9_-]+/g, "_");
  return base || "braille_plaque";
}

function exportSTLFile(
  filename,
  stlText
) {
  // Keep synchronous to preserve user activation in Chrome/macOS
  const blob = new Blob([stlText], { type: "model/stl" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);

  try {
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    return "download";
  } catch {}

  try {
    a.target = "_blank";
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    return "newtab";
  } catch {}

  try {
    window.location.href = url;
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 15000);
    return "navigate";
  } catch {
    URL.revokeObjectURL(url);
    a.remove();
    return "failed";
  }
}

// -----------------
// React UI Component
// -----------------
function BrailleBuddyPreviewSafe() {
  const [text, setText] = useState("Hello, world! 123");
  const [fontPx, setFontPx] = useState(64);

  // 3D print settings
  const [thicknessIn, setThicknessIn] = useState(0.2);
  const [dotHeightMM, setDotHeightMM] = useState(0.6);
  const [dotDiaMM, setDotDiaMM] = useState(1.5);
  const [segments, setSegments] = useState(24);

  // ephemeral hint shown only when preview forces fallback
  const [dlHint, setDlHint] = useState(null);

  const meta = useMemo(() => toBrailleWithMeta(text), [text]);
  const braille = meta.braille;

  const dims = useMemo(() => {
    const tmp = buildBraillePlaqueSTL(braille, {
      totalThicknessInch: thicknessIn,
      dotHeightMM,
      dotDiaMM,
      seg: segments,
    });
    return { w: tmp.widthMM, h: tmp.heightMM, t: tmp.totalMM };
  }, [braille, thicknessIn, dotHeightMM, dotDiaMM, segments]);

  const sizeLabelMM = `${dims.w.toFixed(1)} × ${dims.h.toFixed(1)} × ${dims.t.toFixed(2)} mm`;
  const sizeLabelIN = `${(dims.w/25.4).toFixed(2)} × ${(dims.h/25.4).toFixed(2)} × ${(dims.t/25.4).toFixed(2)} in`;

  function copyOut() {
    navigator.clipboard.writeText(braille).catch(() => {});
  }

  function clearAll() {
    setText("");
  }

  function downloadSTL() {
    const { stl } = buildBraillePlaqueSTL(braille, {
      totalThicknessInch: thicknessIn,
      dotHeightMM,
      dotDiaMM,
      seg: segments,
    });
    const name = sanitizeFileBase(text) + ".stl";
    const mode = exportSTLFile(name, stl);
    if (mode !== "download") {
      const msg = mode === "newtab"
        ? "Opened STL in a new tab (use File → Save As if it doesn’t auto-download)."
        : mode === "navigate"
          ? "Navigated to STL blob (use Save As if needed)."
          : "Your browser blocked the download in this preview. Try running outside the preview.";
      setDlHint(msg);
      setTimeout(() => setDlHint(null), 5000);
    }
  }

  // -----------------
  // Runtime unit tests
  // -----------------
  const unitTests = [
    { name: "lowercase letters", input: "abc", expected: "⠁⠃⠉" },
    { name: "capital A", input: "A", expected: "⠠⠁" },
    { name: "capital Z", input: "Z", expected: "⠠⠵" },
    { name: "digits run (123)", input: "123", expected: "⠼⠁⠃⠉" },
    { name: "punctuation !", input: "!", expected: "⠖" },
    { name: "newline passthrough", input: "a\nb", expected: "⠁\n⠃" },
    { name: "CRLF newline", input: "a\r\nb", expected: "⠁\n⠃" },
    { name: "tab → two spaces", input: "a\tb", expected: "⠁  ⠃" },
    { name: "unsupported emoji skipped", input: "a🙂b", expected: "⠁⠃" },
    { name: "unsupported © skipped", input: "a©b", expected: "⠁⠃" },
    { name: "double quote punctuation", input: '"', expected: "⠶" },
    { name: "hyphen punctuation", input: "-", expected: "⠤" },
    { name: "digits then letter", input: "2025a", expected: "⠼⠃⠚⠃⠑⠁" },
    { name: "space handling", input: "a b", expected: "⠁ ⠃" },
    { name: "sanitize filename", input: "Hello🙂 World!", expected: /Hello__World_/ },
  ];

  const testResults = useMemo(() => {
    return unitTests.map(t => {
      const got = toBraille(t.input);
      const pass = typeof t.expected === "string" ? (got === t.expected) : (t.expected).test(sanitizeFileBase(t.input));
      return { ...t, got, pass };
    });
  }, []);

  const stlSmokeTest = useMemo(() => {
    const { stl } = buildBraillePlaqueSTL("⠠⠓⠊", { totalThicknessInch: 0.2, dotHeightMM: 0.6, dotDiaMM: 1.5 });
    const starts = stl.startsWith("solid ");
    const ends = stl.trim().endsWith("endsolid braille_plaque_units_mm");
    return starts && ends;
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-100 via-white to-sky-100 text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Header */}
        <header className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Braille Buddy</h1>
            <p className="text-sm md:text-base text-zinc-600">Type below. The screen above shows your text in Grade‑1 Braille.</p>
          </div>
          <div className="hidden sm:block text-xs text-zinc-500">A→⠠⠁ • 1→⠼⠁</div>
        </header>

        {/* Output Screen */}
        <section className="relative rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_20%,rgba(47,228,171,0.12),transparent_40%),_radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.12),transparent_40%)]" />
          <div className="relative p-5 md:p-8">
            <div
              className="whitespace-pre-wrap break-words leading-tight text-zinc-900 selection:bg-emerald-200/60"
              style={{ fontSize: `${fontPx}px` }}
              aria-live="polite"
            >
              {meta.nodes.length ? meta.nodes : "⠠⠞⠗⠽ ⠞⠽⠏⠊⠝⠛ ⠞⠑⠭⠞"}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="relative border-t border-zinc-200 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-700" htmlFor="size">Size</label>
              <input
                id="size"
                type="range"
                min={32}
                max={100}
                value={fontPx}
                onChange={(e) => setFontPx(parseInt(e.target.value))}
                className="w-48 accent-emerald-500"
              />
              <span className="tabular-nums text-xs text-zinc-500">{fontPx}px</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-700">
              <div title="3D model size based on current text and settings">
                <span className="font-medium">Model size:</span> {sizeLabelMM} <span className="text-zinc-400">({sizeLabelIN})</span>
              </div>
              {meta.unsupported.length > 0 && (
                <div className="text-amber-700" title="Unsupported characters are skipped in Braille and STL. Remove them to export.">
                  ⚠️ Unsupported skipped: {meta.unsupported.join(" ")}
                </div>
              )}
              <button
                onClick={downloadSTL}
                className="ml-auto inline-flex items-center justify-center rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100 active:scale-[0.99]"
                title="Export as .STL"
              >
                Download .STL
              </button>
              {dlHint && <div className="text-sky-800">💾 {dlHint}</div>}
            </div>
          </div>
        </section>

        {/* Input Area */}
        <section className="mt-6">
          <label htmlFor="input" className="mb-2 block text-sm font-medium text-zinc-800">Type here</label>
          <textarea
            id="input"
            className="h-40 w-full resize-y rounded-2xl border border-zinc-300 bg-white/90 p-4 shadow-sm outline-none ring-emerald-400/30 focus:ring-4"
            placeholder="Letters, numbers, and basic punctuation only. Emojis/special symbols are not supported."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </section>

        {/* 3D Print Settings */}
        <section className="mt-6 text-sm">
          <details className="rounded-2xl border border-zinc-200 bg-white/70 p-4">
            <summary className="cursor-pointer list-none font-medium text-zinc-800">3D print settings & sizing</summary>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs text-zinc-600">Total thickness (inches)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.12}
                  value={thicknessIn}
                  onChange={(e)=>setThicknessIn(parseFloat(e.target.value)||0.2)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                />
                <div className="mt-1 text-[11px] text-zinc-500">≈ {(thicknessIn*25.4).toFixed(2)} mm</div>
              </div>
              <div>
                <label className="block text-xs text-zinc-600">Dot height (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0.3}
                  value={dotHeightMM}
                  onChange={(e)=>setDotHeightMM(parseFloat(e.target.value)||0.6)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600">Dot diameter (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1.0}
                  value={dotDiaMM}
                  onChange={(e)=>setDotDiaMM(parseFloat(e.target.value)||1.5)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs text-zinc-600">Smoothness (segments)</label>
                <input
                  type="number"
                  min={8}
                  max={64}
                  value={segments}
                  onChange={(e)=>setSegments(Math.max(8, Math.min(64, parseInt(e.target.value)||24)))}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                />
              </div>
              <div className="md:col-span-2 flex items-end text-[12px] text-zinc-600">
                Estimated plaque size: <span className="ml-1 font-medium">{dims.w.toFixed(1)} × {dims.h.toFixed(1)} mm</span> • Thickness: <span className="ml-1 font-medium">{dims.t.toFixed(2)} mm</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-zinc-500">STL exports in millimeters. For tactile clarity, try layer height ≤ 0.2 mm and slow outer walls.</p>
          </details>
        </section>

        {/* Helper Notes & Tests */}
        <section className="mt-4 text-sm text-zinc-600">
          <details className="rounded-xl border border-zinc-200 bg-white/60 p-4">
            <summary className="cursor-pointer list-none font-medium text-zinc-800">How this works (Grade‑1 basics)</summary>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>Capital letters use a prefix <span className="font-semibold">⠠</span> (e.g., <span className="font-semibold">A</span> → <span className="font-semibold">⠠⠁</span>).</li>
              <li>Numbers use a prefix <span className="font-semibold">⠼</span> then a‑j (e.g., <span className="font-semibold">2025</span> → <span className="font-semibold">⠼⠃⠚⠃⠑</span>).</li>
              <li>Supported punctuation: <code className="rounded bg-zinc-100 px-1">, . ? ! ; : ' - "</code></li>
              <li>No contractions yet (Grade‑1 only).</li>
            </ul>
          </details>

          <details className="mt-3 rounded-xl border border-zinc-200 bg-white/60 p-4">
            <summary className="cursor-pointer list-none font-medium text-zinc-800">Developer self‑tests</summary>
            <div className="mt-3 space-y-1 font-mono text-xs">
              {testResults.map(t => (
                <div key={t.name}>
                  {t.pass ? "✅" : "❌"} <span className="font-semibold">{t.name}:</span> input="{t.input}" → got="{t.got}" {typeof t.expected === 'string' ? `expected="${t.expected}"` : ""}
                </div>
              ))}
              <div className="mt-2">STL smoke test: {stlSmokeTest ? "✅" : "❌"}</div>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}

// Expose for in-browser mounting when using Babel standalone
;(window).BrailleBuddyPreviewSafe = BrailleBuddyPreviewSafe;
