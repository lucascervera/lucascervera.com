import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
    "Perfil",
    "Recurso",
  ]);
  assert.equal(model.concepts.Perfil.length, 1);
  assert.equal(model.concepts.Emprendimiento.length, 8);
  assert.equal(model.concepts.Actividad.length, 5);
  assert.equal(model.concepts.Recurso.length, 5);
});

test("every element carries the fields its concept requires", () => {
  const model = parseModel(MODEL);
  const perfil = model.concepts.Perfil[0].fields;
  for (const key of ["nombre", "titular", "resumen", "email", "linkedin", "foto"]) {
    assert.ok(perfil[key], `Perfil.${key} must be present`);
  }
  for (const concept of ["Emprendimiento", "Actividad", "Recurso"]) {
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
