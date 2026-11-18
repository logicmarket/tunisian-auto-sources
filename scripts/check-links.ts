/**
 * File: scripts/check-links.ts
 * Purpose: CLI link-health checker for every external source URL.
 *
 * Usage
 *   npm run check-links                 # dry run: checks links, writes a report
 *   npm run check-links:write           # checks AND updates PostgreSQL
 *   npm run check-links -- --limit=25   # sample
 *   npm run check-links -- --ids=1,4,9  # explicit ids
 *   npm run check-links -- --only=dead,unknown
 *   npm run check-links -- --stale-days=7
 *
 * Flags
 *   --write              Persist link_status + last_verified (and history).
 *   --dry-run            Explicit dry-run (default).
 *   --limit=N            Maximum number of links.
 *   --ids=1,2,3          Only these source ids.
 *   --only=list          Filter by current status: live,redirect,unknown,
 *                        unverified,dead,nonlive,problem
 *   --stale-days=N       Only links verified before N days ago.
 *   --include-hidden     Include sources hidden from the public catalogue.
 *   --concurrency=N      Parallel requests (1-32, default 8).
 *   --timeout=MS         Per-request timeout (default 12000).
 *   --report=PATH        JSON report path (a .md sibling is also written).
 *   --no-report          Skip report files.
 *   --fail-on-dead       Exit 1 when any checked link is DEAD.
 *   --quiet              Only print the final summary.
 *
 * Exit codes: 0 success, 1 fatal error / no sources / --fail-on-dead.
 *
 * Safety: no URL is ever modified. Database writes happen only with --write.
 */

import fs from "node:fs";
import path from "node:path";

/* ────────────────────────────────────────────────────────────────────────────
 * Environment (no dependency, never prints values)
 * ──────────────────────────────────────────────────────────────────────────── */

function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function loadEnvironment(): void {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));
}

/* ────────────────────────────────────────────────────────────────────────────
 * CLI parsing
 * ──────────────────────────────────────────────────────────────────────────── */

const STATUS_ALIASES: Record<string, string[]> = {
  live: ["LIVE"],
  redirect: ["REDIRECT"],
  unknown: ["UNKNOWN"],
  unverified: ["UNVERIFIED"],
  dead: ["DEAD"],
  nonlive: ["REDIRECT", "UNKNOWN", "UNVERIFIED", "DEAD"],
  problem: ["UNKNOWN", "UNVERIFIED", "DEAD"],
};

interface CliOptions {
  write: boolean;
  limit?: number;
  ids?: number[];
  only?: string[];
  staleDays?: number;
  includeHidden: boolean;
  concurrency: number;
  timeoutMs: number;
  reportPath: string | null;
  failOnDead: boolean;
  quiet: boolean;
}

function parseNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive number, received "${value}"`);
  }
  return Math.trunc(parsed);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    write: false,
    includeHidden: false,
    concurrency: 8,
    timeoutMs: 12_000,
    reportPath: null,
    failOnDead: false,
    quiet: false,
  };

  for (const arg of argv) {
    if (arg === "--write") options.write = true;
    else if (arg === "--dry-run") options.write = false;
    else if (arg === "--include-hidden") options.includeHidden = true;
    else if (arg === "--no-report") options.reportPath = "";
    else if (arg === "--fail-on-dead") options.failOnDead = true;
    else if (arg === "--quiet") options.quiet = true;
    else if (arg.startsWith("--limit=")) options.limit = parseNumber(arg.slice(8), "--limit");
    else if (arg.startsWith("--concurrency=")) {
      options.concurrency = Math.min(32, parseNumber(arg.slice(14), "--concurrency"));
    } else if (arg.startsWith("--timeout=")) options.timeoutMs = parseNumber(arg.slice(10), "--timeout");
    else if (arg.startsWith("--stale-days=")) options.staleDays = parseNumber(arg.slice(13), "--stale-days");
    else if (arg.startsWith("--report=")) {
      const value = arg.slice(9).trim();
      options.reportPath = value || "";
    } else if (arg.startsWith("--ids=")) {
      const ids = arg
        .slice(6)
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isInteger(id) && id > 0);
      if (ids.length === 0) throw new Error("--ids expects a comma-separated list of positive integers");
      options.ids = ids;
    } else if (arg.startsWith("--only=")) {
      const requested = arg
        .slice(7)
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean);
      const statuses = new Set<string>();
      for (const item of requested) {
        const mapped = STATUS_ALIASES[item] ?? [item.toUpperCase()];
        for (const status of mapped) statuses.add(status);
      }
      if (statuses.size === 0) throw new Error("--only expects at least one status");
      options.only = [...statuses];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown flag "${arg}" (use --help)`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`check-links — external URL health checker

  npm run check-links                 dry run + report
  npm run check-links:write           update sources.link_status/last_verified
  npm run check-links -- --limit=25   sample size
  npm run check-links -- --ids=1,9    specific sources
  npm run check-links -- --only=dead,unknown
  npm run check-links -- --stale-days=7
  npm run check-links -- --include-hidden
  npm run check-links -- --concurrency=6 --timeout=10000

Flags: --write --dry-run --limit=N --ids=1,2 --only=... --stale-days=N
       --include-hidden --concurrency=N --timeout=MS --report=PATH
       --no-report --fail-on-dead --quiet --help
`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Report writing
 * ──────────────────────────────────────────────────────────────────────────── */

function timestampForFile(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function defaultReportPath(now: Date): string {
  return path.join("reports", "link-health", `link-health-${timestampForFile(now)}.json`);
}

function markdownReport(summary: import("../lib/link-health").CheckSummary): string {
  const outcomes = (
    summary as import("../lib/link-health").CheckSummary & {
      outcomes?: import("../lib/link-health").LinkCheckOutcome[];
    }
  ).outcomes ?? [];
  const changed = outcomes.filter((outcome) => outcome.changed);
  const blocked = outcomes.filter((outcome) => outcome.linkStatus === "UNKNOWN");
  const redirects = outcomes.filter((outcome) => outcome.linkStatus === "REDIRECT");

  const rows = (items: typeof outcomes) =>
    items.length === 0
      ? "_None._"
      : [
          "| # | Source | URL | Result | HTTP | Detail |",
          "| ---: | --- | --- | --- | ---: | --- |",
          ...items.map(
            (item) =>
              `| ${item.sourceId} | ${item.name.replace(/\|/g, "\\|")} | ${item.url} | ${item.linkStatus} | ${item.httpStatus ?? "—"} | ${(item.error ?? item.finalUrl ?? "—").replace(/\|/g, "\\|").slice(0, 160)} |`,
          ),
        ].join("\n");

  return `# Link health report

- **Started:** ${summary.startedAt}
- **Finished:** ${summary.finishedAt}
- **Duration:** ${(summary.durationMs / 1000).toFixed(1)} s
- **Checked:** ${summary.checked} / ${summary.total}
- **Changed:** ${summary.changed}
- **Persisted to database:** ${summary.persisted ? "yes" : "no (dry run)"}
- **History rows written:** ${summary.historyWritten}

## Status distribution

| Status | Count |
| --- | ---: |
| LIVE | ${summary.byStatus.LIVE} |
| REDIRECT | ${summary.byStatus.REDIRECT} |
| UNKNOWN | ${summary.byStatus.UNKNOWN} |
| UNVERIFIED | ${summary.byStatus.UNVERIFIED} |
| DEAD | ${summary.byStatus.DEAD} |

## Changed on this run

${rows(changed)}

## Dead links (404/410)

${rows(summary.dead)}

## Redirects

${rows(redirects)}

## Unknown / blocked (review manually)

${rows(blocked)}

_Generated by \`scripts/check-links.ts\`. UNKNOWN means the host answered but
blocked the bot, timed out or returned 5xx — never treated as DEAD._
`;
}

function writeReport(summary: import("../lib/link-health").CheckSummary, configuredPath: string | null): string | null {
  if (configuredPath === "") return null;
  const jsonPath = configuredPath ?? defaultReportPath(new Date(summary.startedAt));
  const absoluteJson = path.resolve(process.cwd(), jsonPath);
  fs.mkdirSync(path.dirname(absoluteJson), { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    dryRun: !summary.persisted,
    summary: {
      total: summary.total,
      checked: summary.checked,
      changed: summary.changed,
      byStatus: summary.byStatus,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
      durationMs: summary.durationMs,
      persisted: summary.persisted,
      historyWritten: summary.historyWritten,
    },
    outcomes: (
      summary as import("../lib/link-health").CheckSummary & {
        outcomes?: import("../lib/link-health").LinkCheckOutcome[];
      }
    ).outcomes ?? [],
  };
  fs.writeFileSync(absoluteJson, JSON.stringify(payload, null, 2), "utf8");

  const markdownPath = absoluteJson.replace(/\.json$/i, ".md");
  fs.writeFileSync(markdownPath, markdownReport(summary), "utf8");
  return absoluteJson;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Main
 * ──────────────────────────────────────────────────────────────────────────── */

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  loadEnvironment();

  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local or the environment.");
    return 1;
  }

  const { prisma, closeDatabase } = await import("../lib/db");
  const {
    checkSources,
    getOutcomes,
    isoDateDaysAgo,
    persistOutcomes,
    selectTargets,
  } = await import("../lib/link-health");

  try {
    const targets = await selectTargets(prisma, {
      ids: options.ids,
      only: options.only,
      staleBefore: options.staleDays ? isoDateDaysAgo(options.staleDays) : null,
      includeHidden: options.includeHidden,
      limit: options.limit,
    });

    if (targets.length === 0) {
      console.error("No links to monitor. Seed sources or relax the filters (--only/--stale-days).");
      return 1;
    }

    console.log(
      `Checking ${targets.length} link(s) — concurrency ${options.concurrency}, timeout ${options.timeoutMs} ms, ` +
        `${options.write ? "WRITE mode" : "dry run (no database writes)"}.`,
    );

    let completed = 0;
    const summary = await checkSources(targets, {
      concurrency: options.concurrency,
      timeoutMs: options.timeoutMs,
      onProgress: (count, total, outcome) => {
        completed = count;
        if (!options.quiet) {
          const detail = outcome.error ?? (outcome.httpStatus ? `HTTP ${outcome.httpStatus}` : "");
          process.stderr.write(
            `[${String(count).padStart(3)}/${total}] ${outcome.linkStatus.padEnd(10)} #${outcome.sourceId} ${outcome.url}${detail ? ` — ${detail}` : ""}\n`,
          );
        }
      },
    });

    // mapWithConcurrency does not call onProgress itself; report completion.
    if (!options.quiet && completed === 0) {
      process.stderr.write(`[${targets.length}/${targets.length}] checks settled\n`);
    }

    if (options.write) {
      const persisted = await persistOutcomes(prisma, getOutcomes(summary));
      summary.persisted = true;
      summary.historyWritten = persisted.historyWritten;
      console.log(
        `Database updated: ${persisted.updated} source(s); link_reports history ${persisted.historyAvailable ? `+${persisted.historyWritten} row(s)` : "table not present (skipped)"}.`,
      );
    }

    const reportPath = writeReport(summary, options.reportPath);

    console.log("");
    console.log("Link health summary");
    console.log("───────────────────");
    console.log(`Checked     : ${summary.checked}`);
    console.log(`Changed     : ${summary.changed}`);
    console.log(`LIVE        : ${summary.byStatus.LIVE}`);
    console.log(`REDIRECT    : ${summary.byStatus.REDIRECT}`);
    console.log(`UNKNOWN     : ${summary.byStatus.UNKNOWN}`);
    console.log(`DEAD        : ${summary.byStatus.DEAD}`);
    console.log(`Duration    : ${(summary.durationMs / 1000).toFixed(1)} s`);
    console.log(`Persisted   : ${summary.persisted ? "yes" : "no (dry run)"}`);
    if (reportPath) console.log(`Report      : ${reportPath}`);

    if (summary.dead.length > 0) {
      console.log("");
      console.log("Dead links:");
      for (const item of summary.dead) console.log(`  #${item.sourceId} ${item.url}`);
    }

    if (!options.write) {
      console.log("");
      console.log("Dry run: no rows were changed. Re-run with --write (npm run check-links:write) to persist.");
    }

    return options.failOnDead && summary.dead.length > 0 ? 1 : 0;
  } finally {
    await closeDatabase();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("check-links failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
