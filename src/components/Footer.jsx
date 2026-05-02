export default function Footer() {
  return (
    <footer className="border-t border-parchment-edge bg-parchment-warm mt-12">
      <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-ink-muted">
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-between items-center">
          <p>
            <span className="italic">in vino, cognitio</span>
            {' · '}
            Companion tool to{' '}
            <a
              href="https://jskarabot18.github.io/soul-of-wine/"
              className="text-wine hover:underline"
              target="_blank" rel="noreferrer"
            >
              The Soul of Wine
            </a>
          </p>
          <div className="flex gap-5">
            <a
              href="https://jskarabot18.github.io/vinotheca/"
              className="hover:text-wine"
              target="_blank" rel="noreferrer"
            >
              Vinotheca
            </a>
            <a
              href="https://jskarabot18.github.io/soul-of-wine/docs/narrative.pdf"
              className="hover:text-wine"
              target="_blank" rel="noreferrer"
            >
              Read the paper
            </a>
            <a
              href="https://github.com/jskarabot18/region-affinities"
              className="hover:text-wine"
              target="_blank" rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
