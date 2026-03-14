import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function resolveMarkdownlintCli2Runner() {
  // Prefer running the installed package entrypoint directly via Node.
  // This avoids Windows-specific issues executing .cmd shims.
  const pkgBin = path.join(
    projectRoot,
    "node_modules",
    "markdownlint-cli2",
    "markdownlint-cli2-bin.mjs",
  );
  if (fs.existsSync(pkgBin)) {
    return { command: process.execPath, prefixArgs: [pkgBin] };
  }

  // Fallback to npx (Windows uses npx.cmd).
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return { command: npx, prefixArgs: ["markdownlint-cli2"] };
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });
}

function runWithStatus(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
  // Normalize null (killed) to 1.
  return typeof result.status === "number" ? result.status : 1;
}

function tryRun(command, args) {
  try {
    return execFileSync(command, args, {
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    })
      .toString("utf8")
      .trim();
  } catch {
    return null;
  }
}

function unique(items) {
  return [...new Set(items)];
}

function isDocsMarkdownFile(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  return normalized.startsWith("docs/") && normalized.toLowerCase().endsWith(".md");
}

function listChangedDocsMarkdownFiles() {
  const gitRoot = tryRun("git", ["rev-parse", "--show-toplevel"]);
  if (!gitRoot) return null;

  const collect = (args) => {
    const out = tryRun("git", args);
    if (!out) return [];
    return out
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => path.resolve(gitRoot, p))
      .filter((abs) => isDocsMarkdownFile(path.relative(gitRoot, abs)));
  };

  const unstaged = collect(["diff", "--name-only", "--diff-filter=ACMRTUXB"]);
  const staged = collect(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"]);
  return unique([...unstaged, ...staged]);
}

function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function leadingWidth(whitespace) {
  // Treat a tab as 4 spaces for width.
  let width = 0;
  for (const ch of whitespace) width += ch === "\t" ? 4 : 1;
  return width;
}

function normalizeLeadingIndentToSpaces(line) {
  const match = /^([ \t]*)(.*)$/.exec(line);
  if (!match) return line;
  const width = leadingWidth(match[1]);
  return " ".repeat(width) + match[2];
}

export function autoFixMaterialBlocks(markdownText) {
  const eol = detectEol(markdownText);
  const rawLines = markdownText.split(/\r?\n/);
  const lines = rawLines.map((l) => normalizeLeadingIndentToSpaces(l));

  const admonitionHeaderRe = /^(\s*)(!{3}|\?{3}\+?)\s+\S/;
  const tabHeaderRe = /^(\s*)===\s+["']/;
  const fenceRe = /^(`{3,}|~{3,})/;
  const keepIndentRe =
    /^(?:[-*+]\s|\d+\.\s|>\s|\|\s|#{1,6}\s|<\w|!!!\s|\?{3}\+?\s|===\s)/;

  let state = null; // { kind: 'admonition'|'tab', base: number, hasBody: boolean }
  let lastLineWasBlankInBlock = false;
  let fence = null; // { ch: '`'|'~', len: number } | null
  let docFence = null; // { ch: '`'|'~', len: number } | null

  const result = [];
  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = rawLines[i];
    const line = lines[i];

    const currentIndentMatch = /^(\s*)(.*)$/.exec(line);
    const indent = currentIndentMatch ? currentIndentMatch[1].length : 0;
    const content = currentIndentMatch ? currentIndentMatch[2] : line;
    const isBlank = content.trim().length === 0;

    // Never try to interpret MkDocs Material syntax inside fenced code blocks.
    // Otherwise, examples like:
    //
    // ```md
    // !!! note "Title"
    // ```
    //
    // would be treated as real admonitions and rewritten.
    if (!state) {
      const rawMatch = /^(\s*)(.*)$/.exec(rawLine);
      const rawContent = rawMatch ? rawMatch[2] : rawLine;
      const rawTrimmed = rawContent.trimStart();
      const rawFenceMatch = fenceRe.exec(rawTrimmed);
      if (docFence) {
        if (
          rawFenceMatch &&
          rawFenceMatch[1][0] === docFence.ch &&
          rawFenceMatch[1].length >= docFence.len
        ) {
          docFence = null;
        }
        result.push(rawLine);
        continue;
      }
      if (rawFenceMatch) {
        docFence = { ch: rawFenceMatch[1][0], len: rawFenceMatch[1].length };
        result.push(rawLine);
        continue;
      }
    }

    const admonitionStart = admonitionHeaderRe.exec(line);
    const tabStart = tabHeaderRe.exec(line);

    if (admonitionStart) {
      state = { kind: "admonition", base: admonitionStart[1].length, hasBody: false };
      lastLineWasBlankInBlock = false;
      fence = null;
      result.push(line);
      continue;
    }

    if (tabStart) {
      state = { kind: "tab", base: tabStart[1].length, hasBody: false };
      lastLineWasBlankInBlock = false;
      fence = null;
      result.push(line);
      continue;
    }

    if (state) {
      const trimmed = content.trimStart();
      const fenceMatch = fenceRe.exec(trimmed);
      if (fenceMatch) {
        const ch = fenceMatch[1][0];
        const len = fenceMatch[1].length;
        if (!fence) {
          fence = { ch, len };
        } else if (fence.ch === ch && len >= fence.len) {
          fence = null;
        }
        // Ensure fence marker is inside the block (at least base+4).
        if (indent < state.base + 4) {
          result.push(" ".repeat(state.base + 4) + trimmed);
        } else {
          // Normalize fence marker indentation to avoid accidental indented code blocks.
          result.push(" ".repeat(state.base + 4) + trimmed);
        }
        state.hasBody = true;
        lastLineWasBlankInBlock = false;
        continue;
      }

      if (isBlank) {
        // Blank lines may appear inside admonitions/tabs (multi-paragraph content).
        // We keep the block open and use the blank line as a potential delimiter:
        // a subsequent outdented line is treated as "end of block".
        lastLineWasBlankInBlock = true;
        result.push(line);
        continue;
      }

      // If we've already seen body content and there's a blank line before an outdented
      // line, it's much more likely the author intended to end the block.
      if (state.hasBody && lastLineWasBlankInBlock && indent <= state.base) {
        state = null;
        lastLineWasBlankInBlock = false;
        fence = null;
        result.push(line);
        continue;
      }

      // Inside fenced code blocks: keep original indentation, only ensure it's inside the block.
      if (fence) {
        if (indent < state.base + 4) {
          result.push(" ".repeat(state.base + 4) + content);
        } else {
          result.push(line);
        }
        state.hasBody = true;
        lastLineWasBlankInBlock = false;
        continue;
      }

      // Otherwise, treat outdented/under-indented lines as missing indentation and fix them.
      if (indent < state.base + 4) {
        result.push(" ".repeat(state.base + 4) + content);
        state.hasBody = true;
        lastLineWasBlankInBlock = false;
        continue;
      }

      // Avoid accidentally rendering plain text as an indented code block inside admonitions/tabs.
      // For paragraph-like lines, normalize indentation to exactly base+4.
      if (!keepIndentRe.test(trimmed) && indent > state.base + 4) {
        result.push(" ".repeat(state.base + 4) + trimmed);
        state.hasBody = true;
        lastLineWasBlankInBlock = false;
        continue;
      }

      state.hasBody = true;
      lastLineWasBlankInBlock = false;
      result.push(line);
      continue;
    }

    result.push(line);
  }

  return result.join(eol);
}

function formatFiles(files) {
  let changedCount = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = autoFixMaterialBlocks(before);
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      changedCount += 1;
    }
  }
  return changedCount;
}

function main() {
  const args = process.argv.slice(2);
  const useAll = args.includes("--all");
  const markdownlint = resolveMarkdownlintCli2Runner();

  // If user explicitly passes file paths, operate only on those.
  const explicitFiles = args
    .filter((a) => !a.startsWith("-"))
    .map((a) => a.replaceAll("\\", "/"))
    .filter((a) => a.toLowerCase().endsWith(".md"))
    .map((a) => path.resolve(projectRoot, a));
  const explicitDocsFiles = explicitFiles.filter((abs) =>
    isDocsMarkdownFile(path.relative(projectRoot, abs)),
  );

  if (explicitDocsFiles.length > 0) {
    console.log(`[docs-ready] Targeting ${explicitDocsFiles.length} explicit file(s).`);
    const fixStatus = runWithStatus(markdownlint.command, [
      ...markdownlint.prefixArgs,
      "--fix",
      ...explicitDocsFiles,
    ]);
    formatFiles(explicitDocsFiles);
    const lintStatus = runWithStatus(markdownlint.command, [
      ...markdownlint.prefixArgs,
      ...explicitDocsFiles,
    ]);
    process.exit(Math.max(fixStatus, lintStatus));
  }

  const changed = !useAll ? listChangedDocsMarkdownFiles() : null;
  const files = changed && changed.length > 0 ? changed : null;

  if (files) {
    console.log(`[docs-ready] Targeting ${files.length} changed Markdown file(s).`);
    const fixStatus = runWithStatus(markdownlint.command, [
      ...markdownlint.prefixArgs,
      "--fix",
      ...files,
    ]);
    // Run our structural auto-fixes after markdownlint's fixes as well, because
    // some markdownlint fixers may rewrite indentation in ways that break
    // MkDocs Material block syntax.
    const changedCount = formatFiles(files);
    if (changedCount > 0) {
      console.log(`[docs-ready] Applied structural fixes to ${changedCount} file(s).`);
    }
    const lintStatus = runWithStatus(markdownlint.command, [
      ...markdownlint.prefixArgs,
      ...files,
    ]);
    process.exit(Math.max(fixStatus, lintStatus));
  }

  if (!useAll) {
    console.log("[docs-ready] No changed docs Markdown files found.");
    process.exit(0);
  }

  console.log("[docs-ready] Targeting all docs Markdown files.");
  // Let markdownlint-cli2 expand the glob itself.
  const fixStatus = runWithStatus(markdownlint.command, [
    ...markdownlint.prefixArgs,
    "docs/**/*.md",
    "--fix",
  ]);
  // Apply our structural fixes after markdownlint's global fixes.
  // (Markdownlint runs on a glob; we format all docs files here.)
  const allDocs = [];
  const docsDir = path.join(projectRoot, "docs");
  if (fs.existsSync(docsDir)) {
    const stack = [docsDir];
    while (stack.length) {
      const dir = stack.pop();
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) allDocs.push(full);
      }
    }
  }
  const changedCount = formatFiles(allDocs);
  if (changedCount > 0) {
    console.log(`[docs-ready] Applied structural fixes to ${changedCount} file(s).`);
  }
  const lintStatus = runWithStatus(markdownlint.command, [
    ...markdownlint.prefixArgs,
    "docs/**/*.md",
  ]);
  process.exit(Math.max(fixStatus, lintStatus));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
