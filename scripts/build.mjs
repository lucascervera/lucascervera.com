#!/usr/bin/env node
/**
 * Projects the iNNfo domain at kNNowledge/personal-site_NN.md into the published site.
 *
 * Contract:
 *   - The model is the only source of content. This file is never hand-edited.
 *   - Output is deterministic: no timestamps, no randomness, stable ordering.
 *   - Fails loudly when the model is missing a required field.
 *
 * Usage: node scripts/build.mjs [--out <dir>]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL_PATH = join(ROOT, "kNNowledge", "personal-site_NN.md");
const DOMAIN = "https://lucascervera.com";
const SITE_NAME = "Lucas Cervera";

const CONCEPTS = ["Perfil", "Emprendimiento", "Actividad", "Galeria", "Recurso"];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") {
      out.out = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

function parseFrontmatter(lines) {
  const fm = {};
  if (lines[0] !== "---") return { fm, start: 0 };
  let i = 1;
  for (; i < lines.length; i += 1) {
    if (lines[i] === "---") break;
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(lines[i]);
    if (m) fm[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return { fm, start: i + 1 };
}

/** Parses `# NN <Concept>` sections, `## NN <Concept>: <Element>` blocks and `key:: value` fields. */
export function parseModel(text) {
  const lines = text.split(/\r?\n/);
  const { fm, start } = parseFrontmatter(lines);
  const model = { title: fm.title ?? "", version: fm.knowledge_version ?? "", concepts: {} };
  let concept = null;
  let element = null;

  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    const h1 = /^# NN (\S+)\s*$/.exec(line);
    if (h1) {
      concept = CONCEPTS.includes(h1[1]) ? h1[1] : null;
      element = null;
      if (concept && !model.concepts[concept]) model.concepts[concept] = [];
      continue;
    }
    const h2 = /^## NN (\S+):\s*(.+?)\s*$/.exec(line);
    if (h2) {
      if (!concept || h2[1] !== concept) {
        concept = null;
        element = null;
        continue;
      }
      element = { id: h2[2].trim(), fields: {} };
      model.concepts[concept].push(element);
      continue;
    }
    const field = /^([a-z_]+)::\s?(.*)$/.exec(line);
    if (field && element) element.fields[field[1]] = field[2].trim();
  }
  return model;
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeUrl(value) {
  const raw = String(value ?? "").trim();
  return /^https?:\/\/[^\s"'<>]+$/.test(raw) ? raw : null;
}

export function requireModel(model) {
  const problems = [];
  const perfil = model.concepts.Perfil ?? [];
  if (perfil.length !== 1) problems.push(`Perfil must have exactly one element, found ${perfil.length}`);
  const p = perfil[0]?.fields ?? {};
  for (const key of ["nombre", "titular", "resumen", "email"]) {
    if (!p[key]) problems.push(`Perfil.${key} is required`);
  }
  for (const concept of ["Emprendimiento", "Actividad", "Recurso"]) {
    for (const el of model.concepts[concept] ?? []) {
      if (!el.fields.nombre) problems.push(`${concept}:${el.id} is missing nombre`);
    }
  }
  for (const el of model.concepts.Galeria ?? []) {
    if (!el.fields.nombre) problems.push(`Galeria:${el.id} is missing nombre`);
    if (!safeUrl(el.fields.url)) problems.push(`Galeria:${el.id} is missing a valid http(s) url`);
  }
  if (problems.length) {
    throw new Error(`Model is not publishable:\n  - ${problems.join("\n  - ")}`);
  }
}

function sortedVentures(model) {
  return [...(model.concepts.Emprendimiento ?? [])].sort((a, b) => {
    const ya = Number.parseInt(a.fields.anio ?? "0", 10) || 0;
    const yb = Number.parseInt(b.fields.anio ?? "0", 10) || 0;
    return yb - ya;
  });
}

function renderNav(model) {
  const items = [
    ["#perfil", "Perfil"],
    ["#trayectoria", "Trayectoria"],
    ["#actividades", "Actividades"],
    ...(model.concepts.Galeria ?? []).map((el) => [
      `#${el.id.toLowerCase()}`,
      el.fields.nombre,
    ]),
    ["#recursos", "Recursos"],
    ["#contacto", "Contacto"],
  ];
  return items
    .map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`)
    .join("\n        ");
}

function renderGalleries(model) {
  return (model.concepts.Galeria ?? [])
    .map((el) => {
      const f = el.fields;
      const src = safeUrl(f.url);
      const external = safeUrl(f.url_externa);
      const anchor = el.id.toLowerCase();
      const note = f.descripcion ? esc(f.descripcion) : "";
      const seeAll = external
        ? ` <a class="see-all" href="${esc(external)}" rel="noopener">Ver todas</a>`
        : "";
      return `    <section id="${esc(anchor)}">
      <h2>${esc(f.nombre)}</h2>
      <p class="section-note">${note}${seeAll}</p>
      <div class="embed"><iframe src="${esc(src)}" title="${esc(f.nombre)}" loading="lazy" referrerpolicy="no-referrer"></iframe></div>
    </section>`;
    })
    .join("\n\n");
}

function renderVentures(model) {
  return sortedVentures(model)
    .map((el) => {
      const f = el.fields;
      const url = safeUrl(f.url);
      const name = url
        ? `<a href="${esc(url)}" rel="noopener">${esc(f.nombre)}</a>`
        : esc(f.nombre);
      const year = f.anio ? `<span class="year">${esc(f.anio)}</span>` : "";
      const desc = f.descripcion ? `<p>${esc(f.descripcion)}</p>` : "";
      return `        <li class="card">
          <div class="card-head">${name}${year}</div>
          ${desc}
        </li>`;
    })
    .join("\n");
}

function renderActivities(model) {
  return (model.concepts.Actividad ?? [])
    .map((el) => {
      const f = el.fields;
      const metric =
        f.metrica_etiqueta && f.metrica_valor
          ? `<p class="metric"><span class="metric-label">${esc(f.metrica_etiqueta)}</span><span class="metric-value">${esc(f.metrica_valor)}</span></p>`
          : "";
      return `        <li class="activity">
          <div class="activity-body">
            <h3>${esc(f.nombre)}</h3>
            ${f.descripcion ? `<p>${esc(f.descripcion)}</p>` : ""}
          </div>
          ${metric}
        </li>`;
    })
    .join("\n");
}

function renderResources(model) {
  return (model.concepts.Recurso ?? [])
    .map((el) => {
      const f = el.fields;
      const url = safeUrl(f.url);
      const name = url
        ? `<a href="${esc(url)}" rel="noopener">${esc(f.nombre)}</a>`
        : esc(f.nombre);
      const kind = f.tipo ? `<span class="kind">${esc(f.tipo)}</span>` : "";
      const desc = f.descripcion ? `<p>${esc(f.descripcion)}</p>` : "";
      return `        <li class="resource">${kind}${name}${desc}</li>`;
    })
    .join("\n");
}

function renderHtml(model) {
  const perfil = model.concepts.Perfil[0].fields;
  const foto = perfil.foto ? `assets/${esc(String(perfil.foto).replace(/^assets\//, ""))}` : "";
  const linkedin = safeUrl(perfil.linkedin);
  const favicon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23141414'/%3E%3Ctext x='32' y='43' font-family='Georgia,serif' font-size='28' fill='%23fbfaf8' text-anchor='middle'%3ELC%3C/text%3E%3C/svg%3E";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(perfil.nombre)} — ${esc(perfil.titular.split("|")[0].trim())}</title>
  <meta name="description" content="${esc(perfil.resumen)}" />
  <meta name="author" content="${esc(perfil.nombre)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${esc(perfil.nombre)}" />
  <meta property="og:description" content="${esc(perfil.resumen)}" />
  <meta property="og:url" content="${DOMAIN}/" />
  <link rel="canonical" href="${DOMAIN}/" />
  <link rel="icon" href="${favicon}" />
  <link rel="stylesheet" href="assets/site.css" />
</head>
<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>

  <header class="site-header">
    <nav aria-label="Principal">
      <a class="brand" href="/">${esc(perfil.nombre)}</a>
      <ul>
        ${renderNav(model)}
      </ul>
    </nav>
  </header>

  <main id="contenido">
    <section class="hero" id="perfil">
      ${foto ? `<img class="portrait" src="${foto}" alt="Retrato de ${esc(perfil.nombre)}" width="320" height="320" />` : ""}
      <div class="hero-copy">
        <h1>${esc(perfil.nombre)}</h1>
        <p class="headline">${esc(perfil.titular)}</p>
        <p class="summary">${esc(perfil.resumen)}</p>
        ${perfil.ubicacion ? `<p class="location">${esc(perfil.ubicacion)}</p>` : ""}
      </div>
    </section>

    <section id="trayectoria">
      <h2>Trayectoria</h2>
      <ul class="cards">
${renderVentures(model)}
      </ul>
    </section>

    <section id="actividades">
      <h2>Actividades</h2>
      <ul class="activities">
${renderActivities(model)}
      </ul>
    </section>

${renderGalleries(model)}

    <section id="recursos">
      <h2>Recursos</h2>
      <ul class="resources">
${renderResources(model)}
      </ul>
    </section>

    <section id="contacto">
      <h2>Contacto</h2>
      <p><a href="mailto:${esc(perfil.email)}">${esc(perfil.email)}</a></p>
      ${linkedin ? `<p><a href="${esc(linkedin)}" rel="noopener">LinkedIn</a></p>` : ""}
    </section>
  </main>

  <footer class="site-footer">
    <p>Contenido publicado por ${esc(perfil.nombre)} bajo <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">Licencia CC BY 4.0</a>.</p>
    <p class="generated">Sitio generado desde el modelo de conocimiento del dominio. No editar a mano.</p>
  </footer>
</body>
</html>
`;
}

function renderCss() {
  return `:root {
  --bg: #fbfaf8;
  --surface: #ffffff;
  --ink: #14140f;
  --muted: #6a6a60;
  --line: #e5e1d8;
  --accent: #4b32c3;
  --radius: 14px;
  --max: 1080px;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 17px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 3px; }
a:hover { text-decoration-thickness: 2px; }

.skip {
  position: absolute;
  left: -9999px;
}
.skip:focus {
  left: 1rem;
  top: 1rem;
  z-index: 100;
  background: var(--surface);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.site-header nav {
  max-width: var(--max);
  margin: 0 auto;
  padding: 0.85rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.brand { font-weight: 700; color: var(--ink); text-decoration: none; letter-spacing: -0.01em; }
.site-header ul { display: flex; gap: 1.25rem; list-style: none; margin: 0; padding: 0; }
.site-header ul a { color: var(--muted); text-decoration: none; font-size: 0.9rem; }
.site-header ul a:hover { color: var(--ink); }

main { max-width: var(--max); margin: 0 auto; padding: 0 1.25rem; }

section { padding: 4rem 0; border-bottom: 1px solid var(--line); }
section:last-of-type { border-bottom: 0; }

h1, h2, h3 { line-height: 1.15; letter-spacing: -0.02em; margin: 0; }
h1 { font-size: clamp(2.5rem, 6vw, 4rem); }
h2 { font-size: clamp(1.4rem, 2.5vw, 1.9rem); margin-bottom: 2rem; }
h3 { font-size: 1.05rem; }

.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: center;
  padding-top: 5rem;
}
.portrait {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--line);
}
.headline { font-size: clamp(1.1rem, 2.4vw, 1.45rem); margin: 1rem 0 1.25rem; }
.summary { color: var(--muted); max-width: 60ch; margin: 0 0 1rem; }
.location { color: var(--muted); font-size: 0.9rem; margin: 0; }

.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.15rem 1.25rem;
}
.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; font-weight: 600; }
.card-head a { color: var(--ink); text-decoration: none; }
.card-head a:hover { text-decoration: underline; }
.year { color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
.card p { margin: 0.5rem 0 0; color: var(--muted); font-size: 0.95rem; }

.activities { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.5rem; }
.activity { display: grid; gap: 1rem; padding-bottom: 1.5rem; border-bottom: 1px dashed var(--line); }
.activity:last-child { border-bottom: 0; padding-bottom: 0; }
.activity p { margin: 0.4rem 0 0; color: var(--muted); }

.metric { display: flex; flex-direction: column; gap: 0.15rem; margin: 0; }
.metric-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.metric-value { font-size: 1.15rem; font-weight: 650; color: var(--ink); }

.resources { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
.resource { display: grid; gap: 0.2rem; }
.resource .kind {
  justify-self: start;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}
.resource a { font-weight: 600; }
.resource p { margin: 0; color: var(--muted); font-size: 0.95rem; }

.section-note { margin: -1rem 0 1.5rem; color: var(--muted); font-size: 0.95rem; max-width: 62ch; }
.see-all { white-space: nowrap; }
.embed {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}
.embed iframe {
  display: block;
  width: 100%;
  height: min(70vh, 600px);
  border: 0;
}

#contacto p { margin: 0 0 0.5rem; font-size: 1.05rem; }

.site-footer {
  max-width: var(--max);
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
  color: var(--muted);
  font-size: 0.85rem;
}
.site-footer p { margin: 0 0 0.4rem; }
.generated { opacity: 0.75; }

@media (min-width: 760px) {
  .hero { grid-template-columns: 320px 1fr; gap: 3.5rem; }
  .activity { grid-template-columns: 1fr auto; align-items: start; }
  .metric { text-align: right; min-width: 12rem; }
}
`;
}

function renderLlms(model) {
  const perfil = model.concepts.Perfil[0].fields;
  const ventures = sortedVentures(model)
    .map((el) => {
      const f = el.fields;
      const url = safeUrl(f.url);
      return `- ${f.nombre}${f.anio ? ` (${f.anio})` : ""}${f.descripcion ? `: ${f.descripcion}` : ""}${url ? ` — ${url}` : ""}`;
    })
    .join("\n");
  const activities = (model.concepts.Actividad ?? [])
    .map((el) => {
      const f = el.fields;
      const metric = f.metrica_etiqueta && f.metrica_valor ? ` — ${f.metrica_etiqueta}: ${f.metrica_valor}` : "";
      return `- ${f.nombre}${f.descripcion ? `: ${f.descripcion}` : ""}${metric}`;
    })
    .join("\n");
  const resources = (model.concepts.Recurso ?? [])
    .map((el) => {
      const f = el.fields;
      const url = safeUrl(f.url);
      return `- ${f.nombre}${f.descripcion ? `: ${f.descripcion}` : ""}${url ? ` — ${url}` : ""}`;
    })
    .join("\n");

  const galleries = (model.concepts.Galeria ?? [])
    .map((el) => {
      const f = el.fields;
      const url = safeUrl(f.url_externa) ?? safeUrl(f.url);
      return `- ${f.nombre}${f.descripcion ? `: ${f.descripcion}` : ""}${url ? ` — ${url}` : ""}`;
    })
    .join("\n");

  return `# ${perfil.nombre}

> ${perfil.titular}

${perfil.resumen}

## Perfil
- Nombre: ${perfil.nombre}
- Ubicación: ${perfil.ubicacion ?? "No declarada"}
- Email: ${perfil.email}
- LinkedIn: ${perfil.linkedin ?? "No declarado"}

## Trayectoria
${ventures}

## Actividades
${activities}

## Galerías
${galleries}

## Recursos
${resources}

## Fuente
Este contenido se genera desde el modelo de conocimiento del dominio en ${DOMAIN}/kNNowledge/personal-site_NN.md.
Licencia: CC BY 4.0.
`;
}

function renderCatalog(model) {
  const perfil = model.concepts.Perfil[0].fields;
  const catalog = {
    name: perfil.nombre,
    url: `${DOMAIN}/`,
    type: "personal-profile",
    description: perfil.resumen,
    language: "es",
    sections: [
      { id: "perfil", title: "Perfil" },
      { id: "trayectoria", title: "Trayectoria", count: (model.concepts.Emprendimiento ?? []).length },
      { id: "actividades", title: "Actividades", count: (model.concepts.Actividad ?? []).length },
      { id: "galerias", title: "Galerías", count: (model.concepts.Galeria ?? []).length },
      { id: "recursos", title: "Recursos", count: (model.concepts.Recurso ?? []).length },
      { id: "contacto", title: "Contacto" },
    ],
    source: {
      model: "kNNowledge/personal-site_NN.md",
      format: "iNNfo Level 3",
    },
    license: "https://creativecommons.org/licenses/by/4.0/",
  };
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function renderRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`;
}

function renderSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
  </url>
</urlset>
`;
}

export function build({ outDir = ROOT } = {}) {
  const model = parseModel(readFileSync(MODEL_PATH, "utf8"));
  requireModel(model);

  const files = {
    "index.html": renderHtml(model),
    "assets/site.css": renderCss(),
    "robots.txt": renderRobots(),
    "sitemap.xml": renderSitemap(),
    "llms.txt": renderLlms(model),
    ".well-known/ai-catalog.json": renderCatalog(model),
  };

  for (const [relative, content] of Object.entries(files)) {
    const target = join(outDir, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, "utf8");
  }
  return { files: Object.keys(files), model: MODEL_PATH, outDir };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const { out } = parseArgs(process.argv.slice(2));
    const result = build({ outDir: out ? resolve(out) : ROOT });
    process.stdout.write(`Built ${result.files.length} files from ${MODEL_PATH}\n`);
    for (const file of result.files) process.stdout.write(`  - ${file}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
