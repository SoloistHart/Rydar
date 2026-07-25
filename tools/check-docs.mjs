import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

const STATUS_VALUES = new Set(["draft", "active", "superseded", "stub"]);
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CHANGELOG_ENTRY_RE =
  /^- (\d{4}-\d{2}-\d{2}) `(\d+\.\d+\.\d+)` .+/;
const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const DOCMAP_ITEM_RE =
  /^- \[([^\]]+)\]\(([^)]+)\) \(`([^`]+)`\)\./;
const HEX_COLOR_RE =
  /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})\b/;
const CSS_COLOR_FN_RE = /\b(?:rgba?|hsla?)\(/i;
const ADR_FILE_RE = /^\d{4}-.+\.md$/;
const MODULE_PLACEHOLDER_ROOTS = new Set([
  "core",
  "platform",
  "app",
  "tools",
]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function repoRel(absPath) {
  return toPosix(path.relative(REPO_ROOT, absPath));
}

function parseFrontMatter(raw) {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontMatter: null, body: raw, error: "not-first" };
  }
  const afterOpen = raw.startsWith("---\r\n") ? 5 : 4;
  const rest = raw.slice(afterOpen);
  const closeMatch = rest.match(/\r?\n---\r?\n/);
  if (!closeMatch) {
    return { frontMatter: null, body: raw, error: "unclosed" };
  }
  const yamlText = rest.slice(0, closeMatch.index);
  const body = rest.slice(closeMatch.index + closeMatch[0].length);
  const frontMatter = parseYamlSubset(yamlText);
  return { frontMatter, body, error: null };
}

function parseYamlSubset(text) {
  const obj = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      obj[key] =
        inner === ""
          ? []
          : inner.split(",").map((item) => item.trim());
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

function buildDoc(absPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const { frontMatter, body, error } = parseFrontMatter(raw);
  const pathKey = repoRel(absPath);
  return {
    path: pathKey,
    frontMatter: error ? null : frontMatter,
    body: error ? raw : body,
    lines: raw.split(/\r?\n/),
  };
}

function shouldSkipPath(relPosix) {
  const segments = relPosix.split("/");
  if (segments.some((s) => s === ".git" || s === "node_modules")) {
    return true;
  }
  if (segments.some((s) => s.startsWith("_"))) return true;
  if (
    segments[segments.length - 1] === "README.md" &&
    MODULE_PLACEHOLDER_ROOTS.has(segments[0])
  ) {
    return true;
  }
  return false;
}

function isInScope(relPosix) {
  if (
    relPosix === "README.md" ||
    relPosix === "PRODUCT.md" ||
    relPosix === "DESIGN.md" ||
    relPosix === "AGENTS.md"
  ) {
    return true;
  }
  return relPosix.startsWith("docs/");
}

function collectMarkdownFiles(dirAbs, out) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dirAbs, entry.name);
    const rel = repoRel(abs);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      if (entry.name.startsWith("_")) continue;
      collectMarkdownFiles(abs, out);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (shouldSkipPath(rel)) continue;
    if (!isInScope(rel)) continue;
    out.push(abs);
  }
}

function isRealIsoDate(value) {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

function sectionLines(lines, heading) {
  const start = lines.findIndex((line) => line === heading);
  if (start === -1) return { start: -1, lines: [] };
  const collected = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    collected.push({ line: lines[i], lineNo: i + 1 });
  }
  return { start: start + 1, lines: collected };
}

function firstChangelogEntry(lines) {
  const section = sectionLines(lines, "## Changelog");
  if (section.start === -1) return { foundSection: false, entry: null };
  for (const row of section.lines) {
    if (row.line.startsWith("- ")) {
      return {
        foundSection: true,
        entry: { text: row.line, lineNo: row.lineNo },
      };
    }
  }
  return { foundSection: true, entry: null };
}

function parseDocMap(readme) {
  const section = sectionLines(readme.lines, "## Doc map");
  const items = [];
  for (const row of section.lines) {
    const m = DOCMAP_ITEM_RE.exec(row.line);
    if (!m) continue;
    items.push({ target: m[2], id: m[3], line: row.lineNo });
  }
  return items;
}

function parseAdrIndex(indexDoc) {
  const section = sectionLines(indexDoc.lines, "## Index");
  const items = [];
  for (const row of section.lines) {
    MD_LINK_RE.lastIndex = 0;
    let m;
    while ((m = MD_LINK_RE.exec(row.line)) !== null) {
      const target = m[2];
      if (/^(https?:|mailto:)/i.test(target)) continue;
      if (target.startsWith("#")) continue;
      items.push({ target, line: row.lineNo });
    }
  }
  return items;
}

function listAdrFiles(docs) {
  const paths = [];
  for (const p of docs.keys()) {
    if (!p.startsWith("docs/DECISIONS/")) continue;
    const base = p.slice("docs/DECISIONS/".length);
    if (ADR_FILE_RE.test(base)) paths.push(p);
  }
  return paths.sort();
}

function resolveLinkTarget(fromDocPath, target) {
  const hash = target.indexOf("#");
  const withoutHash = hash === -1 ? target : target.slice(0, hash);
  if (withoutHash === "") return null;
  const decoded = withoutHash.replace(/%20/g, " ");
  const fromDir = path.dirname(path.join(REPO_ROOT, fromDocPath));
  return path.resolve(fromDir, decoded);
}

function finding(checkId, pathKey, line, message) {
  return { checkId, path: pathKey, line, message };
}

const checks = [
  {
    id: "frontmatter-present",
    description: "Every in-scope doc has a front matter block first in file",
    run(context) {
      const out = [];
      for (const doc of context.docs.values()) {
        if (doc.frontMatter === null) {
          out.push(
            finding(
              "frontmatter-present",
              doc.path,
              1,
              "missing front matter block as the first bytes of the file",
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "frontmatter-fields",
    description: "Required front matter fields with valid shapes",
    run(context) {
      const out = [];
      for (const doc of context.docs.values()) {
        const fm = doc.frontMatter;
        if (!fm) continue;
        for (const key of ["doc", "status", "version", "updated", "owners"]) {
          if (!(key in fm) || fm[key] === "" || fm[key] === undefined) {
            out.push(
              finding(
                "frontmatter-fields",
                doc.path,
                null,
                `missing front matter field '${key}'`,
              ),
            );
          }
        }
        if ("status" in fm && !STATUS_VALUES.has(fm.status)) {
          out.push(
            finding(
              "frontmatter-fields",
              doc.path,
              null,
              `status must be one of draft|active|superseded|stub, got '${fm.status}'`,
            ),
          );
        }
        if ("version" in fm && !SEMVER_RE.test(String(fm.version))) {
          out.push(
            finding(
              "frontmatter-fields",
              doc.path,
              null,
              `version must match N.N.N, got '${fm.version}'`,
            ),
          );
        }
        if ("updated" in fm) {
          const updated = String(fm.updated);
          if (!ISO_DATE_RE.test(updated) || !isRealIsoDate(updated)) {
            out.push(
              finding(
                "frontmatter-fields",
                doc.path,
                null,
                `updated must be a real YYYY-MM-DD date, got '${fm.updated}'`,
              ),
            );
          }
        }
        if ("owners" in fm) {
          if (!Array.isArray(fm.owners) || fm.owners.length === 0) {
            out.push(
              finding(
                "frontmatter-fields",
                doc.path,
                null,
                "owners must be a non-empty array",
              ),
            );
          }
        }
      }
      return out;
    },
  },
  {
    id: "doc-id-unique",
    description: "No two in-scope docs share a doc id",
    run(context) {
      const out = [];
      const seen = new Map();
      for (const doc of context.docs.values()) {
        const id = doc.frontMatter?.doc;
        if (id === undefined || id === "") continue;
        if (seen.has(id)) {
          out.push(
            finding(
              "doc-id-unique",
              doc.path,
              null,
              `doc id '${id}' also used by ${seen.get(id)}`,
            ),
          );
        } else {
          seen.set(id, doc.path);
        }
      }
      return out;
    },
  },
  {
    id: "changelog-present",
    description: "Every in-scope doc has ## Changelog with at least one entry",
    run(context) {
      const out = [];
      for (const doc of context.docs.values()) {
        const { foundSection, entry } = firstChangelogEntry(doc.lines);
        if (!foundSection) {
          out.push(
            finding(
              "changelog-present",
              doc.path,
              null,
              "missing ## Changelog section",
            ),
          );
        } else if (!entry) {
          out.push(
            finding(
              "changelog-present",
              doc.path,
              null,
              "## Changelog has no entry line starting with '- '",
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "changelog-agrees",
    description: "Newest changelog entry matches updated and version",
    run(context) {
      const out = [];
      for (const doc of context.docs.values()) {
        const fm = doc.frontMatter;
        if (!fm) continue;
        const { entry } = firstChangelogEntry(doc.lines);
        if (!entry) continue;
        const m = CHANGELOG_ENTRY_RE.exec(entry.text);
        if (!m) {
          out.push(
            finding(
              "changelog-agrees",
              doc.path,
              entry.lineNo,
              "newest changelog entry must match '- YYYY-MM-DD `X.Y.Z` text'",
            ),
          );
          continue;
        }
        const entryDate = m[1];
        const entryVersion = m[2];
        if (entryDate !== String(fm.updated)) {
          out.push(
            finding(
              "changelog-agrees",
              doc.path,
              entry.lineNo,
              `changelog date '${entryDate}' disagrees with updated '${fm.updated}'`,
            ),
          );
        }
        if (entryVersion !== String(fm.version)) {
          out.push(
            finding(
              "changelog-agrees",
              doc.path,
              entry.lineNo,
              `changelog version '${entryVersion}' disagrees with version '${fm.version}'`,
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "links-resolve",
    description: "Relative markdown links resolve to existing files",
    run(context) {
      const out = [];
      for (const doc of context.docs.values()) {
        doc.lines.forEach((line, idx) => {
          MD_LINK_RE.lastIndex = 0;
          let m;
          while ((m = MD_LINK_RE.exec(line)) !== null) {
            const target = m[2];
            if (/^(https?:|mailto:)/i.test(target)) continue;
            if (target.startsWith("#")) continue;
            const resolved = resolveLinkTarget(doc.path, target);
            if (resolved === null) continue;
            if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
              out.push(
                finding(
                  "links-resolve",
                  doc.path,
                  idx + 1,
                  `relative link target does not resolve to a file: ${target}`,
                ),
              );
            }
          }
        });
      }
      return out;
    },
  },
  {
    id: "docmap-parity",
    description: "Doc map and in-scope docs agree in both directions",
    run(context) {
      const out = [];
      for (const item of context.docMap) {
        const abs = path.resolve(REPO_ROOT, item.target);
        const rel = repoRel(abs);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
          out.push(
            finding(
              "docmap-parity",
              "README.md",
              item.line,
              `doc map target missing on disk: ${item.target}`,
            ),
          );
          continue;
        }
        const doc = context.docs.get(rel);
        const fmDoc = doc?.frontMatter?.doc;
        if (fmDoc !== item.id) {
          out.push(
            finding(
              "docmap-parity",
              "README.md",
              item.line,
              `doc map id '${item.id}' does not match front matter doc '${fmDoc ?? "(missing)"}' in ${rel}`,
            ),
          );
        }
      }

      for (const doc of context.docs.values()) {
        if (doc.path === "README.md") continue;
        if (
          doc.path.startsWith("docs/DECISIONS/") &&
          ADR_FILE_RE.test(path.posix.basename(doc.path))
        ) {
          continue;
        }
        const inMap = context.docMap.some((item) => {
          const rel = repoRel(path.resolve(REPO_ROOT, item.target));
          return rel === doc.path;
        });
        if (!inMap) {
          out.push(
            finding(
              "docmap-parity",
              doc.path,
              null,
              "in-scope doc is missing from README.md ## Doc map",
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "adr-index-parity",
    description: "ADR files and DECISIONS index agree",
    run(context) {
      const out = [];
      const indexPath = "docs/DECISIONS/README.md";
      const indexed = new Set();
      for (const item of context.adrIndex) {
        const abs = path.resolve(
          path.dirname(path.join(REPO_ROOT, indexPath)),
          item.target.split("#")[0],
        );
        const rel = repoRel(abs);
        indexed.add(rel);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
          out.push(
            finding(
              "adr-index-parity",
              indexPath,
              item.line,
              `index link target missing on disk: ${item.target}`,
            ),
          );
        }
      }
      for (const adrPath of context.adrFiles) {
        if (!indexed.has(adrPath)) {
          out.push(
            finding(
              "adr-index-parity",
              adrPath,
              null,
              "ADR file missing from docs/DECISIONS/README.md ## Index",
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "design-no-colors",
    description: "DESIGN.md contains no color literals",
    run(context) {
      const out = [];
      const doc = context.docs.get("DESIGN.md");
      if (!doc) return out;
      doc.lines.forEach((line, idx) => {
        if (HEX_COLOR_RE.test(line)) {
          out.push(
            finding(
              "design-no-colors",
              "DESIGN.md",
              idx + 1,
              "contains a hex color literal",
            ),
          );
        }
        if (CSS_COLOR_FN_RE.test(line)) {
          out.push(
            finding(
              "design-no-colors",
              "DESIGN.md",
              idx + 1,
              "contains an rgb/rgba/hsl/hsla color function",
            ),
          );
        }
      });
      return out;
    },
  },
];

function loadContext() {
  const absFiles = [];
  collectMarkdownFiles(REPO_ROOT, absFiles);
  absFiles.sort((a, b) => repoRel(a).localeCompare(repoRel(b)));

  const docs = new Map();
  for (const abs of absFiles) {
    const doc = buildDoc(abs);
    docs.set(doc.path, doc);
  }

  const readme = docs.get("README.md");
  const docMap = readme ? parseDocMap(readme) : [];
  const adrIndexDoc = docs.get("docs/DECISIONS/README.md");
  const adrIndex = adrIndexDoc ? parseAdrIndex(adrIndexDoc) : [];
  const adrFiles = listAdrFiles(docs);

  return { repoRoot: REPO_ROOT, docs, docMap, adrIndex, adrFiles };
}

function formatFinding(f) {
  if (f.line === null || f.line === undefined) {
    return `${f.path}  [${f.checkId}] ${f.message}`;
  }
  return `${f.path}:${f.line}  [${f.checkId}] ${f.message}`;
}

function main() {
  const context = loadContext();
  const findings = [];
  for (const check of checks) {
    findings.push(...check.run(context));
  }

  if (findings.length === 0) {
    console.log(
      `ok: ${context.docs.size} docs, ${checks.length} checks`,
    );
    process.exit(0);
  }

  const byPath = new Map();
  for (const f of findings) {
    if (!byPath.has(f.path)) byPath.set(f.path, []);
    byPath.get(f.path).push(f);
  }
  const paths = [...byPath.keys()].sort();
  for (const p of paths) {
    for (const f of byPath.get(p)) {
      console.log(formatFinding(f));
    }
  }
  console.log(`${findings.length} finding(s)`);
  process.exit(1);
}

main();
