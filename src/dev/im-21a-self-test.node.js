import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, hud] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../ui/app.css', import.meta.url), 'utf8'),
  readFile(new URL('../ui/runtime-hud-projection.js', import.meta.url), 'utf8'),
]);

for (const id of ['hud-wood', 'hud-stone', 'hud-gold', 'hud-population']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing compact HUD field ${id}`);
}
assert.match(html, /data-player-entry="build"/);
assert.match(html, /data-player-entry="runtime"/);
assert.match(html, /data-runtime-state="RUNNING"/);
assert.match(html, /class="projection-host" hidden aria-hidden="true"/);
assert.match(html, /data-im19g-population-housing-gold-state="true"/);
assert.match(html, /data-im17g-construction-state="true"/);
assert.match(html, /data-player-workspace="build"[^>]*\shidden(?:\s|>)/);
assert.doesNotMatch(html, /data-player-entry="system"/);
assert.doesNotMatch(html, /data-ui-shell="inspector"/);
assert.doesNotMatch(html, /inspector-read-only-runtime-observation/);
assert.match(css, /safe-area-inset-top/);
assert.match(css, /\.build-catalog-workspace\[hidden\],\.placement-workspace\[hidden\]\{display:none!important;pointer-events:none!important\}/);
assert.match(css, /data-runtime-state="RUNNING"/);
assert.match(css, /data-runtime-state="PAUSED"/);
assert.match(css, /data-runtime-state="PAUSED"\]::after\{content:"▶"/);
assert.doesNotMatch(css, /\\n\s+\.shell-action/);
assert.match(css, /\.player-placement-actions\{width:100%;display:grid;grid-template-columns:1fr 1fr/);
assert.match(css, /\.projection-host\{display:none!important\}/);
assert.match(css, /@media\(max-width:430px\) and \(orientation:portrait\)/);
assert.match(css, /@media\(max-height:520px\) and \(orientation:landscape\)/);
assert.match(hud, /technicalName === technicalName/);
assert.match(hud, /populationProjection/);
assert.match(hud, /goldEconomy/);
assert.match(hud, /gameplayMutation: false/);

const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
assert.match(main, /runtime\.boot\(\);runtime\.start\(\)/);
assert.match(main, /runtime\.pause\(\)/);
assert.match(main, /runtimeButton\.dataset\.runtimeState=current/);
assert.match(main, /data-player-entry="build"/);
console.log('IM-21A responsive game shell / HUD scope self-test: PASS');
