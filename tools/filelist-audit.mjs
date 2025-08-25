import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("filelist.json","utf8"));
const entries = data.entries || [];

const caseIssues = [];
const noExt = [];
const typos = [];

for (const e of entries) {
  if (e.type !== "file") continue;
  const p = e.path;
  // 1) .PNG vs .png
  if (p.endsWith(".PNG")) caseIssues.push(p);
  // 2) Keine Extension
  if (!p.includes("/") || !p.split("/").pop().includes(".")) noExt.push(p);
  // 3) Typo-Patterns
  if (/resdme/i.test(p) || /readme$/i.test(p)) typos.push(p);
}

const out = [
  "# Audit-Ergebnis",
  `Gesamt Dateien: ${entries.filter(e=>e.type==='file').length}`,
  "",
  "## Groß-/Kleinschreibung (.PNG → .png)",
  ...caseIssues.map(x=>" - "+x),
  "",
  "## Dateien ohne Extension",
  ...noExt.map(x=>" - "+x),
  "",
  "## Mögliche Tippfehler/Readme ohne .md",
  ...typos.map(x=>" - "+x),
  ""
].join("\n");

fs.writeFileSync("filelist-audit.txt", out, "utf8");
console.log("✅ filelist-audit.txt erzeugt");
