# lucascervera-rebuild — New site generated from a cogNNitive domain

Branch: `feat/rebuild-from-domain` · Delivery: `single-pr` · Test runner: `node --test` + `node scripts/build.mjs`

## Specs

- **S1 — Single replacement.** The new version replaces both existing generations: the Docsify layer (`index.md`, `_sidebar.md`, `README.md`, `pages/`) and the standalone Tailwind HTML (`index.html`). After cutover, neither remains as the live site.
- **S2 — Domain as source of truth.** All site content originates from a cogNNitive domaiNN authored in this repo: `sources/import/*_NN.md` for citable inputs and `kNNowledge/*_NN.md` for the model. Every modeled assertion carries a `sources::` citation.
- **S3 — Legacy is a quarry, not a foundation.** The current content is moved verbatim into `legacy/` and used only as a content source. No code, CSS, markup structure, or tooling from `legacy/` is reused. `legacy/` is deleted once the new site is published.
- **S4 — Zero architectural inheritance.** No Tailwind CDN, no Docsify, no Logseq runtime, no copied class names or section markup. The new site ships its own CSS and no third-party client-side framework.
- **S5 — Reproducible output.** `node scripts/build.mjs` regenerates the published site from `kNNowledge/` deterministically. Regenerating twice with unchanged input produces byte-identical output. The generated site is never hand-edited.
- **S6 — Live site never breaks.** All work happens on `feat/rebuild-from-domain`. `main` remains the GitHub Pages source until the new site is verified and merged. `CNAME` and `.nojekyll` stay at the repo root.
- **S7 — AI-readiness and metadata.** The generated site includes `robots.txt`, `sitemap.xml`, `llms.txt`, `.well-known/ai-catalog.json`, and attribution metadata, matching the cogNNitive `docs/` distribution convention.

## Tasks

| ID | Spec | Route | Status | Evidence |
|----|------|-------|--------|----------|
| T1 | S3 | inline | done | `git mv` of site files into `legacy/`; `.gitignore` updated to `/legacy/logseq` |
| T2 | S2 | inline | done | canonical domaiNN scaffold at root (`kNNowledge/`, `sources/`, `artifacts/`, `changes/`, `procedures/`, `staging/`, `specs/bluepriNNts/`), `domaiNN_NN.md` manifest, `.gitattributes` `* -text`; `nn-preflight` exit 0 |
| T3 | S2, S4 | inline | done | `specs/bluepriNNts/personal-site/spec_NN.md` (valid, 0 warnings) + `kNNowledge/personal-site_NN.md` (valid; 1 element Perfil, 8 Emprendimiento, 5 Actividad, 5 Recurso) |
| T4 | S5 | inline | done | `scripts/build.mjs` + `scripts/build.test.mjs`, 8/8 `node --test`; byte-identical across two runs |
| T5 | S4, S7 | inline | done | `index.html`, `assets/site.css`, `assets/lucas.png`, `robots.txt`, `sitemap.xml`, `llms.txt`, `.well-known/ai-catalog.json` |
| T6 | S1, S6 | inline | done | no Tailwind/Docsify/Logseq strings; all local refs resolve; `check_domain` 0 invalid, provenance ok, layout ok |
| T7 | S2, S4 | inline | done | `Galeria` concept + 2 elements (Videos, Fotos); lazy iframes; anchors `#videos`/`#fotos` restore the old deep links |
| T8 | S2 | inline | done | `Emprendimiento: cogNNitive` (2026) renders first in Trayectoria |
| T7 | S3 | deferred | pending | delete `legacy/` only after the new site is live |

## Log

**L1 — Original request (verbatim):**
> Podríamos hacer una nueva versión que sustituya a las dos que hay y que esté basada en un repositorio de Cognitive? Me gustaría que esta nueva versión no tuviera ninguna herencia a nivel de arquitectura, etcétera, y fuera empezada desde cero a partir de los datos del dominio de Cognitive que creemos. Me gustaría separar muy bien lo que hay ahora de lo nuevo. https://cognnitive.com/

**L2 — Correction (verbatim):**
> Creo que es mejor no hacer un repo nuevo, sino meter todo lo que hay actualmente en una carpeta legacy que sirva como fuente para la nueva estructura de la web y, cuando esté publicada la web nueva, se borre

**L3 — Evidence gathered.** `cogNNitive/cogNNitive-web` is documented as "Generated output only — do not hand-edit", produced from a private monorepo via `scripts/build-docs.mjs`. Installed locally: `nn-innfo` V_0-5-14, `nn-preflight` V_0-2-5, `nn-site-generator` V_0-2-0, `nn-design-presets`. `nn-site-generator` has no coupling to `*_NN.md`, so the model→site projection must be written here (T4) rather than assumed.

**L4 — Decision.** Same repo, no new remote. Branch-first to protect the live `main`. Root stays the Pages source; `legacy/` is quarantined by move, not by copy, so there is one copy of the truth per generation.
