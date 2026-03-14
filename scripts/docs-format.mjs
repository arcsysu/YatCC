import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
  if (result.error) {
    console.error(`[docs-format] Failed to run: ${command}`);
    console.error(result.error);
  }
  const status = typeof result.status === "number" ? result.status : 1;
  if (status !== 0 && !allowFailure) process.exit(status);
  return status;
}

function tryRun(command, args) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  return (result.stdout || "").trim();
}

function unique(items) {
  return [...new Set(items)];
}

function isDocsMarkdownFile(relPath) {
  const normalized = relPath.replaceAll("\\", "/");
  return normalized.startsWith("docs/") && normalized.toLowerCase().endsWith(".md");
}

function listChangedDocsMarkdownFiles() {
  const gitRoot = tryRun("git", ["rev-parse", "--show-toplevel"]);
  if (!gitRoot) return [];

  const collect = (args) => {
    const out = tryRun("git", args);
    if (!out) return [];
    return out
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => isDocsMarkdownFile(p))
      .map((p) => path.resolve(gitRoot, p));
  };

  const unstaged = collect(["diff", "--name-only", "--diff-filter=ACMRTUXB"]);
  const staged = collect(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"]);
  return unique([...unstaged, ...staged]);
}

function resolveLocalBin(binBaseName) {
  const binName =
    process.platform === "win32" ? `${binBaseName}.cmd` : binBaseName;
  const localBin = path.join(projectRoot, "node_modules", ".bin", binName);
  return fs.existsSync(localBin) ? localBin : null;
}

function resolveNpmRunner() {
  if (process.platform === "win32") {
    // Avoid spawning .cmd directly from Node on Windows (can throw EINVAL).
    return { command: "cmd.exe", prefixArgs: ["/d", "/s", "/c", "npm.cmd"] };
  }
  return { command: "npm", prefixArgs: [] };
}

function resolvePrettierRunner() {
  // Avoid executing .cmd shims directly (can fail under Node spawnSync on Windows).
  const prettierBin = path.join(projectRoot, "node_modules", "prettier", "bin", "prettier.cjs");
  if (fs.existsSync(prettierBin)) return { command: process.execPath, prefixArgs: [prettierBin] };

  const prettierShim = resolveLocalBin("prettier");
  if (prettierShim) return { command: prettierShim, prefixArgs: [] };

  return null;
}

function main() {
  const args = process.argv.slice(2);
  const useAll = args.includes("--all");
  const noInstall = args.includes("--no-install");

  const explicitFiles = args
    .filter((a) => !a.startsWith("-"))
    .map((a) => a.replaceAll("\\", "/"))
    .filter((a) => a.toLowerCase().endsWith(".md"))
    .map((a) => path.resolve(projectRoot, a));
  const explicitDocsFiles = explicitFiles
    .map((abs) => ({ abs, rel: path.relative(projectRoot, abs) }))
    .filter(({ rel }) => isDocsMarkdownFile(rel))
    .map(({ abs }) => abs);

  const files = useAll ? [] : listChangedDocsMarkdownFiles();
  const targetFiles = explicitDocsFiles.length > 0 ? explicitDocsFiles : files;
  const targetLabel =
    explicitDocsFiles.length > 0
      ? `${explicitDocsFiles.length} explicit Markdown file(s)`
      : useAll
        ? "all docs Markdown files"
        : `${files.length} changed Markdown file(s)`;
  console.log(`[docs-format] Targeting ${targetLabel}.`);

  if (!noInstall) {
    console.log("[docs-format] Installing dependencies...");
    const npm = resolveNpmRunner();
    run(npm.command, [...npm.prefixArgs, "install", "--no-audit", "--no-fund"]);
  }

  // 1) Prettier (format Markdown)
  const prettier = resolvePrettierRunner();
  if (prettier) {
    console.log("[docs-format] Running Prettier...");
    if (useAll) run(prettier.command, [...prettier.prefixArgs, "--write", "docs/**/*.md"]);
    else if (targetFiles.length > 0)
      run(prettier.command, [...prettier.prefixArgs, "--write", ...targetFiles]);
  } else {
    console.log("[docs-format] Skipping Prettier (not installed).");
  }

  // 2) MkDocs Material structural fixes + markdownlint/material-linter
  const docsReadyScript = path.join(projectRoot, "scripts", "docs-ready.mjs");
  if (useAll) {
    console.log("[docs-format] Running docs-ready...");
    run(process.execPath, [docsReadyScript, "--all"]);
  } else if (targetFiles.length > 0) {
    // docs-ready supports explicit paths (relative to repo root)
    const rel = targetFiles.map((abs) => path.relative(projectRoot, abs));
    console.log("[docs-format] Running docs-ready...");
    run(process.execPath, [docsReadyScript, ...rel]);
  } else {
    console.log("[docs-format] No changed docs Markdown files found.");
  }
}

main();
