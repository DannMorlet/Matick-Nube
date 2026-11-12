"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Script } = require("node:vm");

const web = join(__dirname, "..", "huggingface", "web");
const html = readFileSync(join(web, "index.html"), "utf8");
const css = readFileSync(join(web, "studio.css"), "utf8");
const js = readFileSync(join(web, "studio.js"), "utf8");

test("el JavaScript de la interfaz tiene sintaxis válida", () => {
  assert.doesNotThrow(() => new Script(js, { filename: "studio.js" }));
});

test("los controles del chat y el panel comparten IDs únicos", () => {
  const ids = [...html.matchAll(/\\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const name of [
    "editor", "input", "send", "think", "web", "files", "chat",
    "model-indicator", "conversation-area", "clare-sprite", "clare-action",
    "header-status", "desktop-status", "desktop-model", "activity-feed",
    "modal", "close", "announcement"
  ]) {
    assert.ok(ids.includes(name), `Falta #${name}`);
  }
});

test("la navegación y los controles principales se mantienen", () => {
  for (const tab of ["chat", "work", "projects", "live", "more"]) {
    assert.match(html, new RegExp('data-tab="' + tab + '"'));
  }
  for (const action of ["new", "attach", "models", "vision", "tools", "check"]) {
    assert.match(html, new RegExp('data-action="' + action + '"'));
  }
  assert.match(html, /class="advanced-tools"/);
  assert.match(html, /class="desktop-inspector"/);
  assert.match(html, /class="desktop-sidebar"/);
});

test("el panel obtiene estado y actividad de acciones reales", () => {
  assert.match(js, /fetch\("\/api\/estado"/);
  assert.match(js, /fetch\("\/api\/chat"/);
  assert.match(js, /function syncConnectionUI\(/);
  assert.match(js, /function renderActivity\(/);
  assert.match(js, /function scrollTranscript\(/);
  assert.match(js, /clareFallback=true/);
});

test("los estilos cuentan con diseños escritorio, tableta y teléfono", () => {
  assert.match(css, /@media\s*\(max-width:1250px\)/);
  assert.match(css, /@media\s*\(max-width:860px\)/);
  assert.match(css, /@media\s*\(max-width:600px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  const openings = (css.match(/{/g) || []).length;
  const closings = (css.match(/}/g) || []).length;
  assert.equal(openings, closings);
});
