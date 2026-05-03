// ---------------------------------------------------------------------------
// Footer — Vinotheca-family lower-left.
//
// Mirrors TasteRank Explorer:
//   centred wine-red italic motto with leaf-shaped typographic ornaments
//   row of links (GitHub · License · CC BY-NC 4.0 · Vinotheca · Correspondence)
//   bottom: © Jure Skarabot · MMXXVI
//
// Ornament: ❧ (U+2767, "Rotated Floral Heart Bullet") — a true text glyph
// rather than an emoji, so it inherits the wine-red colour and italic styling
// of its surrounding text and renders consistently across all platforms.
// ---------------------------------------------------------------------------

export default function Footer() {
  return (
    <footer className="border-t border-parchment-edge bg-parchment-warm mt-12">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center mb-4">
          <p className="font-serif italic text-wine text-base inline-flex items-center gap-3">
            <span aria-hidden="true">❧</span>
            <span>in vino, cognitio</span>
            <span aria-hidden="true">❧</span>
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-sans text-ink-muted">
          <a
            href="https://github.com/jskarabot18/region-affinities"
            className="hover:text-wine transition-colors"
            target="_blank" rel="noreferrer"
          >
            GitHub
          </a>
          <span className="text-ink-subtle">·</span>
          <span>License</span>
          <span className="text-ink-subtle">·</span>
          <a
            href="https://creativecommons.org/licenses/by-nc/4.0/"
            className="hover:text-wine transition-colors"
            target="_blank" rel="noreferrer"
          >
            CC BY-NC 4.0
          </a>
          <span className="text-ink-subtle">·</span>
          <a
            href="https://jskarabot18.github.io/vinotheca/"
            className="hover:text-wine transition-colors"
          >
            Vinotheca
          </a>
          <span className="text-ink-subtle">·</span>
          <a
            href="mailto:hello@codexvini.com"
            className="hover:text-wine transition-colors"
          >
            Correspondence
          </a>
        </div>

        <p className="text-center text-xs font-sans text-ink-subtle mt-3">
          © Jure Skarabot · MMXXVI
        </p>
      </div>
    </footer>
  );
}
