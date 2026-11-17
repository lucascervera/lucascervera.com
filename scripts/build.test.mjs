import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, parseModel, requireModel } from "./build.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MODEL = readFileSync(join(ROOT, "kNNowledge", "personal-site_NN.md"), "utf8");

function tmp(name) {
  return mkdtempSync(join(tmpdir(), `lucascervera-${name}-`));
}

test("the model declares the four concepts with the expected element counts", () => {
  const model = parseModel(MODEL);
  assert.deepEqual(Object.keys(model.concepts).sort(), [
    "Actividad",
    "Emprendimiento",
    "Galeria",
    "Perfil",
  ]);
  assert.equal(model.concepts.Perfil.length, 1);
  assert.equal(model.concepts.Emprendimiento.length, 9);
  assert.equal(model.concepts.Actividad.length, 5);
  assert.equal(model.concepts.Galeria.length, 2);
});

test("every element carries the fields its concept requires", () => {
  const model = parseModel(MODEL);
  const perfil = model.concepts.Perfil[0].fields;
  for (const key of ["nombre", "titular", "resumen", "email", "linkedin", "foto"]) {
    assert.ok(perfil[key], `Perfil.${key} must be present`);
  }
  for (const concept of ["Emprendimiento", "Actividad"]) {
    for (const element of model.concepts[concept]) {
      assert.ok(element.fields.nombre, `${concept}:${element.id} is missing nombre`);
    }
  }
  for (const element of model.concepts.Emprendimiento) {
    assert.match(element.fields.anio, /^\d{4}$/, `${element.id} must declare a four-digit year`);
  }
});

test("building twice produces byte-identical output", () => {
  const first = tmp("a");
  const second = tmp("b");
  try {
    const { files } = build({ outDir: first });
    build({ outDir: second });
    for (const relative of files) {
      const one = readFileSync(join(first, relative));
      const two = readFileSync(join(second, relative));
      assert.ok(one.equals(two), `${relative} differs between two runs`);
    }
  } finally {
    rmSync(first, { recursive: true, force: true });
    rmSync(second, { recursive: true, force: true });
  }
});

test("ventures are rendered newest first", () => {
  const out = tmp("order");
  try {
    build({ outDir: out });
    const html = readFileSync(join(out, "index.html"), "utf8");
    const innV0 = html.indexOf("innV0");
    const metaCube = html.indexOf("metoCube");
    assert.ok(innV0 > -1 && metaCube > -1, "both ventures must be rendered");
    assert.ok(innV0 < metaCube, "2025 must render before 2004");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("the generated site carries no legacy tooling", () => {
  const out = tmp("legacy");
  try {
    const { files } = build({ outDir: out });
    for (const relative of files) {
      const content = readFileSync(join(out, relative), "utf8");
      assert.doesNotMatch(content, /tailwind/i, `${relative} references Tailwind`);
      assert.doesNotMatch(content, /docsify/i, `${relative} references Docsify`);
      assert.doesNotMatch(content, /logseq/i, `${relative} references Logseq`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("an incomplete profile fails the build instead of publishing a broken page", () => {
  const broken = parseModel(`# NN Perfil\n\n## NN Perfil: nobody\nnombre:: Nadie\n`);
  assert.throws(() => requireModel(broken), /Perfil\.titular is required/);
});

test("galleries render as lazy iframes anchored by their element id", () => {
  const out = tmp("gallery");
  try {
    build({ outDir: out });
    const html = readFileSync(join(out, "index.html"), "utf8");
    assert.match(html, /<section id="videos">/);
    assert.match(html, /<section id="fotos">/);
    assert.match(html, /href="#videos"/, "the nav must link to the videos anchor");
    assert.match(html, /href="#fotos"/, "the nav must link to the photos anchor");

    const iframes = [...html.matchAll(/<iframe[^>]*>/g)].map((m) => m[0]);
    assert.equal(iframes.length, 2, "one iframe per gallery");
    for (const frame of iframes) {
      assert.match(frame, /loading="lazy"/, "embeds must not block the first paint");
      assert.match(frame, /src="https:\/\/drive\.google\.com\/embeddedfolderview\?id=/, "the embed must point at the public Drive folder");
      assert.match(frame, /title="/, "every iframe needs an accessible title");
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("the Recursos section is gone from every generated output", () => {
  const out = tmp("no-recursos");
  try {
    const { files } = build({ outDir: out });
    for (const relative of files) {
      const content = readFileSync(join(out, relative), "utf8");
      assert.doesNotMatch(content, /id="recursos"/, `${relative} still renders the section`);
      assert.doesNotMatch(content, /Recursos/, `${relative} still mentions Recursos`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("every local reference in the published page resolves on disk", () => {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => match[1])
    .filter((url) => !/^(https?:|mailto:|data:|\/)/.test(url));
  assert.ok(refs.length > 0, "the page must reference at least one local asset");
  for (const ref of refs) {
    assert.ok(existsSync(join(ROOT, ref)), `${ref} is referenced by index.html but missing on disk`);
  }
});

test("the AI catalog is valid JSON that points at the model", () => {
  const catalog = JSON.parse(readFileSync(join(ROOT, ".well-known", "ai-catalog.json"), "utf8"));
  assert.equal(catalog.url, "https://lucascervera.com/");
  assert.equal(catalog.source.model, "kNNowledge/personal-site_NN.md");
  assert.ok(Array.isArray(catalog.sections) && catalog.sections.length >= 5);
});
