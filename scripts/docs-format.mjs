import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

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

function fixInlineClosingFenceText(markdownText) {
  // Some authors write a "closing fence" and then append trailing text on the same line, e.g.
  //   ```  这里是备注
  //
  // In CommonMark that line is NOT a closing fence (closing fence lines can't have trailing
  // non-whitespace text). Prettier then tends to "repair" the document by switching to a
  // longer fence (e.g. ````) and appending a new closing fence at EOF, which feels like
  // the formatter "added extra ``` at the end".
  //
  // We keep the content, but split the trailing text onto a new line, turning the fence
  // into a real closer so downstream tooling doesn't synthesize a new one.
  const eol = detectEol(markdownText);
  const lines = markdownText.split(/\r?\n/);

  const openerRe = /^(\s*)(`{3,}|~{3,})(.*)$/;
  const anyFenceRe = /^(\s*)(`{3,}|~{3,})(.*)$/;

  let fence = null; // { ch: '`'|'~', len: number, indent: string }
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!fence) {
      const open = openerRe.exec(line);
      if (open) fence = { ch: open[2][0], len: open[2].length, indent: open[1] };
      out.push(line);
      continue;
    }

    // Valid closing fence: markers only (plus optional whitespace).
    const maybePureClose = /^(\s*)(`{3,}|~{3,})(\s*)$/.exec(line);
    if (maybePureClose) {
      const ch = maybePureClose[2][0];
      const len = maybePureClose[2].length;
      if (ch === fence.ch && len >= fence.len) {
        fence = null;
        out.push(line);
        continue;
      }
    }

    // If the fence never closes, authors sometimes write a would-be closing fence and append text:
    //   ```  一句话说明
    // That line is not a valid closer, so the block stays open and later tooling may synthesize
    // an extra closing fence at EOF. We only split this line if there is NO valid closer later.
    const m = anyFenceRe.exec(line);
    if (m && m[2][0] === fence.ch && m[2].length >= fence.len) {
      const trailing = (m[3] ?? "").trim();
      if (trailing.length > 0) {
        const pureCloseRe = new RegExp(
          "^(\\s*)(" + fence.ch + "{" + fence.len + ",})(\\s*)$",
        );
        let hasValidCloseLater = false;
        for (let j = i + 1; j < lines.length; j += 1) {
          if (pureCloseRe.test(lines[j])) {
            hasValidCloseLater = true;
            break;
          }
        }

        if (!hasValidCloseLater) {
          out.push(`${m[1]}${m[2]}`);
          out.push(`${m[1]}${trailing}`);
          fence = null;
          continue;
        }
      }
    }

    out.push(line);
  }

  return out.join(eol);
}

function convertLongBacktickFencesToTildes(markdownText) {
  // Prettier may choose a longer backtick fence (e.g. ````) for outer code blocks when the
  // content includes ``` sequences. This is valid Markdown, but we prefer to avoid ```` in
  // this repo. Converting the fence delimiters to tildes preserves structure while removing
  // the ```` marker, and does not touch code content lines.
  const eol = detectEol(markdownText);
  const lines = markdownText.split(/\r?\n/);

  const openerRe = /^(\s*)(`{4,})(.*)$/;
  const tildeCloserRe = /^(\s*)(~{3,})(\s*)$/;

  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const open = openerRe.exec(line);
    if (!open) {
      out.push(line);
      continue;
    }

    const openIndent = open[1];
    const openLen = open[2].length;
    const openRest = open[3] ?? "";

    // Collect until the corresponding backtick closing fence (CommonMark: no trailing text).
    const closeRe = new RegExp(`^(\\s*)(` + "`".repeat(openLen) + `+)(\\s*)$`);
    let closeIndex = -1;
    let closeIndent = openIndent;
    for (let j = i + 1; j < lines.length; j += 1) {
      const close = closeRe.exec(lines[j]);
      if (close) {
        closeIndex = j;
        closeIndent = close[1];
        break;
      }
    }

    // If we can't find a closer, don't guess—leave as-is.
    if (closeIndex === -1) {
      out.push(line);
      continue;
    }

    // Choose a tilde fence length that won't be closed by any line inside the block.
    // Default to 3 for readability, bump if content contains ~~~ (or longer) fence-like lines.
    let maxInnerTildeLen = 0;
    for (let k = i + 1; k < closeIndex; k += 1) {
      const m = tildeCloserRe.exec(lines[k]);
      if (m) maxInnerTildeLen = Math.max(maxInnerTildeLen, m[2].length);
    }
    const tildeLen = Math.max(3, maxInnerTildeLen + 1);
    const tildeFence = "~".repeat(tildeLen);

    out.push(`${openIndent}${tildeFence}${openRest}`);
    for (let k = i + 1; k < closeIndex; k += 1) out.push(lines[k]);
    out.push(`${closeIndent}${tildeFence}`);

    i = closeIndex;
  }

  return out.join(eol);
}

function applyPrePrettierFixes(files) {
  let changedCount = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = fixInlineClosingFenceText(before);
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      changedCount += 1;
    }
  }
  return changedCount;
}

function applyPostPrettierFixes(files) {
  let changedCount = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = convertLongBacktickFencesToTildes(before);
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      changedCount += 1;
    }
  }
  return changedCount;
}

function listAllDocsMarkdownFiles() {
  const docsDir = path.join(projectRoot, "docs");
  if (!fs.existsSync(docsDir)) return [];
  const results = [];
  const stack = [docsDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) results.push(full);
    }
  }
  return results;
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

  {
    const preFixTargets = useAll ? listAllDocsMarkdownFiles() : targetFiles;
    const fixed = preFixTargets.length > 0 ? applyPrePrettierFixes(preFixTargets) : 0;
    if (fixed > 0) console.log(`[docs-format] Fixed inline closing fences in ${fixed} file(s).`);
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

  {
    const postFixTargets = useAll ? listAllDocsMarkdownFiles() : targetFiles;
    const fixed = postFixTargets.length > 0 ? applyPostPrettierFixes(postFixTargets) : 0;
    if (fixed > 0)
      console.log(`[docs-format] Converted long backtick fences in ${fixed} file(s).`);
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

  {
    const postFixTargets = useAll ? listAllDocsMarkdownFiles() : targetFiles;
    const fixed = postFixTargets.length > 0 ? applyPostPrettierFixes(postFixTargets) : 0;
    if (fixed > 0)
      console.log(`[docs-format] Converted long backtick fences in ${fixed} file(s).`);
  }
}

main();
