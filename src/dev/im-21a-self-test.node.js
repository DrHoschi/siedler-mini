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
assert.match(html, /data-player-workspace="build" hidden/);
assert.doesNotMatch(html, /data-player-entry="system"/);
assert.doesNotMatch(html, /data-ui-shell="inspector"/);
assert.doesNotMatch(html, /inspector-read-only-runtime-observation/);
assert.match(css, /safe-area-inset-top/);
assert.match(css, /\.build-workspace\[hidden\]/);
assert.match(css, /@media\(max-width:430px\) and \(orientation:portrait\)/);
assert.match(css, /@media\(max-height:520px\) and \(orientation:landscape\)/);
assert.match(hud, /technicalName === technicalName/);
assert.match(hud, /populationProjection/);
assert.match(hud, /goldEconomy/);
assert.match(hud, /gameplayMutation: false/);

const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
assert.match(main, /runtime\.boot\(\);runtime\.start\(\)/);
assert.match(main, /runtime\.pause\(\)/);
assert.match(main, /buildWorkspace\.hidden/);
console.log('IM-21A responsive game shell / HUD scope self-test: PASS');
