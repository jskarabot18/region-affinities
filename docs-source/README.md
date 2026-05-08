# docs-source

LaTeX sources for the four PDFs in this repo's documentation set.

## Files

- `RegionAffinities_Summary.tex` — plain-language overview
- `RegionAffinities_Technical_Appendix.tex` — algorithms and computation
- `RegionAffinities_Methods_Primer.tex` — guide to the methods
- `RegionAffinities_Data_Appendix.tex` — sources and edge tables
- `vinotheca-preamble.tex` — shared family preamble (typography, colours, environments)

The shared preamble is identical to the copies in `region-resonances` and
`tasterank-explorer`. If amended, all three copies should be updated together.

## Recompiling

Each `.tex` file compiles to a same-name `.pdf` in this repo's root. From
inside the `docs-source/` directory:

```bash
pdflatex -interaction=nonstopmode RegionAffinities_Summary.tex
pdflatex -interaction=nonstopmode RegionAffinities_Summary.tex   # second pass for refs
mv RegionAffinities_Summary.pdf ../public/docs/
```

Run twice for cross-references and ToC. Then move the `.pdf` to
`public/docs/` (where the deployed Header.jsx links it) and clean up the
auxiliary files (`*.aux`, `*.log`, `*.out`, `*.toc`).

## Editing

Edits to a single document only affect that document's PDF. The shared
preamble defines:
- typography (EB Garamond body, Cormorant Garamond display, IM Fell English SC for small caps)
- the `wine` accent colour
- shared environments (`\frontmatter`, `\methodsbox`, etc.)

Changes to the preamble affect all four documents — recompile all of them.
