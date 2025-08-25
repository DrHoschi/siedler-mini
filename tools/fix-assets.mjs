import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

const isGit = fss.existsSync(".git");
const textExt = new Set([".js",".json",".jsonc",".ts",".tsx",".jsx",".html",".htm",".css",".md",".atlas",".txt",".yml",".yaml"]);
const renamePairs = []; // [from, to]

async function walk(dir, out=[]) {
  const items = await fs.readdir(dir, { withFileTypes:true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (p.startsWith("./.git") || p.includes("/node_modules/")) continue;
    if (it.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

function toLowerPNG(p) {
  if (p.toLowerCase().endsWith(".png") && !p.endsWith(".PNG")) return null;
  if (p.endsWith(".PNG")) return p.slice(0, -4) + ".png";
  return null;
}

function readmeTarget(p) {
  const base = path.basename(p).toLowerCase();
  if (base === "resdme" || base === "readme" || base === "readme.txt") {
    return path.join(path.dirname(p), "README.md");
  }
  return null;
}

async function gitMv(from, to) {
  if (isGit) child_process.execFileSync("git", ["mv","-f", from, to], {stdio:"inherit"});
  else await fs.rename(from, to);
}

async function replaceInFile(p) {
  const ext = path.extname(p).toLowerCase();
  if (!textExt.has(ext)) return;
  const data = await fs.readFile(p, "utf8");
  const replaced = data.replace(/\.PNG\b/g, ".png");
  if (replaced !== data) await fs.writeFile(p, replaced, "utf8");
}

(async ()=>{
  const files = await walk(".");

  // 1) Rename .PNG → .png
  for (const p of files) {
    const to = toLowerPNG(p);
    if (to && p !== to) {
      await gitMv(p, to);
      renamePairs.push([p, to]);
    }
  }

  // 2) README fixes
  for (const p of await walk(".")) {
    const to = readmeTarget(p);
    if (to && p !== to) {
      await gitMv(p, to);
      renamePairs.push([p, to]);
    }
  }

  // 3) Replace references in text files
  for (const p of await walk(".")) {
    await replaceInFile(p);
  }

  console.log("Done. Renamed:", renamePairs.length, "files");
})();
