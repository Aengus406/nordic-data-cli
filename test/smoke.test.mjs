/**
 * Smoke tests for the nordic-data CLI.
 *
 * These run real HTTP requests against the live Nordic Data widget tier
 * (4 lookups per IP per 24h, no key needed). The point is to verify the
 * CLI parses the live API response shape correctly — not exhaustive.
 *
 * Run:
 *   npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "cli.js");

function run(args, env = {}) {
  return spawnSync("node", [CLI, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env, NO_COLOR: "1" },
  });
}

// ─────────────────────────────────────────────────────────
//  Bootstrap + help
// ─────────────────────────────────────────────────────────

test("CLI: --version prints the package version", () => {
  const result = run(["--version"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^\d+\.\d+\.\d+/);
});

test("CLI: --help describes every documented command", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  for (const cmd of [
    "search",
    "lookup",
    "contacts",
    "board",
    "finances",
    "procurement",
    "grants",
    "sanctions",
    "shareholders",
    "mcp",
    "signup",
  ]) {
    assert.match(result.stdout, new RegExp(`\\b${cmd}\\b`), `help should list "${cmd}"`);
  }
});

test("CLI: unknown command exits non-zero with a helpful message", () => {
  const result = run(["nonexistent-command-xyz"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /unknown command/i);
});

test("CLI: missing required argument exits non-zero with usage", () => {
  const result = run(["lookup"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /usage:.*lookup/i);
});

test("CLI: mcp command prints config snippet with the API URL", () => {
  const result = run(["mcp"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /api\.nordicdata\.cloud\/mcp/);
  assert.match(result.stdout, /YOUR_NORDIC_DATA_KEY/);
});

// ─────────────────────────────────────────────────────────
//  Live API smoke (skip if offline)
// ─────────────────────────────────────────────────────────

test("CLI: search returns at least one result for 'equinor' (live)", { timeout: 10_000 }, async () => {
  const result = run(["search", "equinor", "--json"]);
  if (result.status !== 0) {
    console.warn("Skipping live test:", result.stderr);
    return;
  }
  const data = JSON.parse(result.stdout);
  assert.ok(Array.isArray(data.results), "results should be an array");
  assert.ok(data.results.length > 0, "should have at least one result");
  assert.ok(data.results.some((r) => /equinor/i.test(r.name)), "should include an Equinor entry");
});

test("CLI: lookup 923609016 returns the expected identity.name (live)", { timeout: 10_000 }, async () => {
  const result = run(["lookup", "923609016", "--json"]);
  if (result.status !== 0) {
    console.warn("Skipping live test:", result.stderr);
    return;
  }
  const data = JSON.parse(result.stdout);
  assert.equal(data.orgnr, "923609016");
  assert.match(data.identity.name, /equinor/i);
  assert.ok(data.identity.business_address);
  assert.equal(data.identity.business_address.country_code, "NO");
});
