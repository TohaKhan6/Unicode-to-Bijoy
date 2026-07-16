# Unicode ⇄ Bijoy Converter

A premium, Apple-"Liquid Glass"-inspired Bangla Unicode ↔ Bijoy (legacy ANSI)
text converter. Pure AMOLED-black dark theme with a cyan neon accent, plus a
soft light theme. Static site — no build step, no backend, no framework.

## Folder structure

```
unicode-bijoy-converter/
├── index.html            Page structure
├── css/
│   ├── style.css         All styling (design tokens, glass panels, animations)
│   └── fonts.css         Self-hosted @font-face rules (Inter, Hind Siliguri, Space Grotesk)
├── js/
│   ├── vendor/
│   │   └── jquery.min.js  Self-hosted jQuery 3.7.1 — fontconverter.js needs it
│   ├── fontconverter.js  ⚠️ SUPPLIED FILE — untouched, byte-for-byte. This is
│   │                        the entire conversion engine (ConvertToUnicode,
│   │                        ConvertToASCII, the character maps, Insert, etc.)
│   └── app.js             New UI code only: theme toggle, counters, auto-grow,
│                           ripple, toast, swap, paste, keyboard shortcuts.
│                           Calls fontconverter.js's own functions rather than
│                           re-implementing anything.
├── fonts/
│   ├── inter/             Self-hosted Inter woff2 files (UI face)
│   ├── hind-siliguri/     Self-hosted Hind Siliguri woff2 files (Bangla face)
│   └── space-grotesk/     Self-hosted Space Grotesk woff2 (display face)
└── README.md
```

## Fully offline — no CDN, no internet required

Everything the page needs (jQuery, all three typefaces) is bundled in the
`js/vendor/` and `fonts/` folders and loaded with relative paths. Nothing is
fetched from Google Fonts, Fontshare, or cdnjs.

This matters more than it might seem: browsers treat every `<link
rel="stylesheet">` as render-blocking by default — the page won't paint
*anything* until all of them have loaded or failed. If a font CDN is slow,
blocked by a firewall, or unreachable (a common situation on an older,
possibly offline Windows 7 machine), the whole page can sit looking
completely unstyled until that request times out. Self-hosting removes that
failure mode entirely, so the site now genuinely works with zero network
access, exactly as the footer's "Offline" claim promises.

(Cabinet Grotesk from the original brief isn't freely redistributable, so the
display face was swapped for **Space Grotesk** — same geometric-grotesk
character, but open-licensed and self-hostable.)

**The conversion logic was not touched.** `js/fontconverter.js` is an exact
copy of the file you provided (verified byte-identical). `app.js` only wires
the existing DOM hooks it already expects:

| Element ID       | Used by fontconverter.js for                          |
|-------------------|-------------------------------------------------------|
| `#uniText`        | Unicode textarea                                       |
| `#bijoyText`       | Bijoy textarea                                          |
| `#btnToBijoy`      | Click → `convertToBijoy()`                              |
| `#btnToUnicode`    | Click → `convertToUnicode()`                            |
| `#btnClearAll`     | Click → `clearAllText()`                                |
| `#copyUnicode`     | Shown/hidden by `displayCopyBtn("unicode")`             |
| `#copyBijoy`       | Shown/hidden by `displayCopyBtn("bijoy")`               |
| `.bijoy-font`      | Toggled by `setBijoyFont()` when the Bijoy box has text |

`app.js` adds the things the supplied file doesn't cover: **Swap** and
**Paste**, plus counters, auto-grow, theme switching, ripple/toast feedback,
and the `Ctrl+Enter` / `Ctrl+Shift+C` / `Esc` shortcuts.

Because `fontconverter.js` uses `$` (jQuery) and runs a few lines of setup
code immediately (not wrapped in `DOMContentLoaded`), the load order in
`index.html` matters and should be left as-is:

```html
<script src="js/vendor/jquery.min.js"></script>
<script src="js/fontconverter.js"></script>
<script src="js/app.js"></script>
```

## Adding a real Bijoy (ANSI) font — optional but recommended

Bijoy text is legacy 8-bit ANSI, not real Unicode — it only displays
correctly with a matching glyph-mapped font such as **SutonnyMJ**. Without
one, the Bijoy box will render with your system's default font and look like
mismatched Latin glyphs, which is normal/expected for this format.

To fix that, drop a font file you're licensed to use into `fonts/bijoy/` and
add this to `css/fonts.css`:

```css
@font-face {
  font-family: 'SutonnyMJ';
  src: url('../fonts/bijoy/SutonnyMJ.woff2') format('woff2'),
       url('../fonts/bijoy/SutonnyMJ.ttf') format('truetype');
  font-display: swap;
}
```

The `.bijoy-font` class (already wired up) will pick it up automatically —
no other changes needed. We didn't bundle a font file ourselves since most
Bijoy fonts (SutonnyMJ, Sulekha, etc.) are freeware-for-personal-use rather
than open source, and licensing varies by source.

## Running locally

No build step — just serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed local URL.

## Deploying

Works as-is on **Vercel**, **Netlify**, or **Cloudflare Pages** — just point
any of them at this folder (or connect the Git repo) with no build command
and `index.html` as the output. No environment variables needed.

## Before you ship

- Update the GitHub button's `href` in `index.html` (currently a placeholder).
- Optionally add a Bijoy font as described above.
