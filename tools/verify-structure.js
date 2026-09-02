import { promises as fs } from "fs";

const MUST_HAVE = [
  "index.html",
  "src/main.js",
  "src/runtime/config.js",
  "src/runtime/event-bus.js",
  "src/runtime/runtime.js",
  "src/runtime/scheduler.js",
  "src/runtime/store.js",
  "src/domain/domain-store.js",
  "src/domain/core-domain-stores.js",
  "src/world/stable-id.js",
  "src/world/world-store.js",
  "src/world/map-structure.js",
  "src/resources/resource-state.js",
  "src/resources/resource-claims.js",
  "src/resources/resource-demands.js",
  "src/resources/resource-matching.js",
  "src/resources/resource-assignment.js",
  "src/transport/transport-job-contract.js",
  "src/transport/transport-job-service.js",
  "src/render/renderer.js",
  "src/ui/app.css",
  "src/dev/self-test.js",
  "src/dev/cr-01-freeze-gate.js",
  "src/dev/cr-02-freeze-gate.js",
  "src/dev/cr-03-freeze-gate.js",
  "src/dev/cr-03-freeze-gate.node.js",
  "src/dev/cr-04a-self-test.js",
  "src/dev/cr-04a-self-test.node.js",
  "src/dev/cr-04a-integration-gate.node.js",
  "src/dev/cr-04b-self-test.js",
  "src/dev/cr-04b-self-test.node.js",
  "src/dev/cr-04c-self-test.js",
  "src/dev/cr-04c-self-test.node.js",
  "src/dev/cr-04-freeze-gate.js",
  "src/dev/cr-04-freeze-gate.node.js"
];

let failures = 0;
const fail = msg => { failures += 1; console.error("❌", msg); };
const ok = msg => console.log("✅", msg);

for (const file of MUST_HAVE) {
  try { await fs.access(file); ok(`[file] vorhanden: ${file}`); }
  catch { fail(`[file] fehlt: ${file}`); }
}

try {
  const html = await fs.readFile("index.html", "utf8");
  /<script[^>]+type=["']module["'][^>]+src=["'][^"']*src\/main\.js(?:\?[^"']*)?["']/.test(html)
    ? ok("[index] src/main.js als Moduleinstieg vorhanden")
    : fail("[index] aktiver Moduleinstieg src/main.js fehlt");
  /<link[^>]+href=["'][^"']*src\/ui\/app\.css(?:\?[^"']*)?["']/.test(html)
    ? ok("[index] src/ui/app.css vorhanden")
    : fail("[index] aktives Stylesheet src/ui/app.css fehlt");
} catch (error) {
  fail(`[index] konnte nicht gelesen werden: ${error.message}`);
}

if (failures > 0) {
  console.error(`\n❌ Clean-Runtime-Strukturprüfung fehlgeschlagen: ${failures} Blocker`);
  process.exitCode = 1;
} else {
  console.log("\n✅ Clean-Runtime-Strukturprüfung PASS / 0 Blocker");
}
