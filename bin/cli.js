#!/usr/bin/env node
/* eslint-disable no-console */
// Nordic Data CLI — every Norwegian company as one API
// MIT License — Nordic Data <support@nordicdata.cloud>
//
// Endpoints used (verified live, 2026-05):
//   GET /_/look?q=<query>           Public name/orgnr search, anonymous
//   GET /_/look/:orgnr              Public full snapshot, 4 free per IP/24h
//   GET /companies/:orgnr*          Authenticated tier (X-API-Key)

const API_BASE = process.env.NORDIC_DATA_API || 'https://api.nordicdata.cloud';
const API_KEY = process.env.NORDIC_DATA_KEY || '';

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
};
const isTTY = process.stdout.isTTY;
const c = (color, text) => (isTTY ? `${COLORS[color]}${text}${COLORS.reset}` : text);

const HELP = `${c('bold', 'nordic-data')} ${c('dim', '— every Norwegian company as one API')}

${c('bold', 'USAGE')}
  nordic-data <command> [args]
  nordic-data <command> --help    ${c('dim', '# per-command help with examples')}

${c('bold', 'COMMANDS')}
  search <query>             Search companies by name or org number
  lookup <orgnr>             Full snapshot of one company
  contacts <orgnr>           Emails, phones, and named executives
  board <orgnr>              Board + leadership
  finances <orgnr>           Latest financial summary
  procurement <orgnr>        Public-sector contract aggregates (NO + EU)
  grants <orgnr>             EU R&D grant participations
  sanctions <orgnr>          Sanctions screening (EU/UN/OFAC) hits
  shareholders <orgnr>       Shareholder graph aggregates (Norway)
  contacts-se <orgnr>        Sweden: identity + AI-enriched contacts (10-digit orgnr)
  mcp                        Show MCP setup snippet for Claude Desktop / Cursor
  signup                     Open the free-tier signup page in your browser
  --help, -h                 Show this help
  --version, -v              Show version

${c('bold', 'FLAGS')}
  --json                     Output raw JSON instead of formatted
  --key <api-key>            API key (or set NORDIC_DATA_KEY env var)
  --no-color                 Disable ANSI colors

${c('bold', 'EXAMPLES')}
  ${c('dim', '# Look up Equinor (no key — uses the public widget tier)')}
  nordic-data search equinor
  nordic-data lookup 923609016
  nordic-data contacts 923609016

  ${c('dim', '# Sweden: lookup + AI-enriched contacts (10-digit orgnr)')}
  nordic-data contacts-se 5566370985

  ${c('dim', '# Use your API key for higher limits')}
  export NORDIC_DATA_KEY=nrd_live_...
  nordic-data lookup 923609016 --json | jq

  ${c('dim', '# Show MCP config for Claude Desktop')}
  nordic-data mcp

${c('bold', 'FREE TIER')}
  ${c('orange', '500 requests per month, no card.')} Get a key at
  ${c('cyan', 'https://nordicdata.cloud/?signup=free')}
  ${c('dim', 'Without a key, this CLI uses the public widget tier (4 lookups/IP/24h).')}
`;

// Per-command help text. Shown when user runs `nordic-data <cmd> --help`.
const COMMAND_HELP = {
  search: `${c('bold', 'nordic-data search')} ${c('dim', '<query> [--json]')}

Search Norwegian companies by name or organisation number.

${c('bold', 'EXAMPLES')}
  ${c('dim', '# Fuzzy name search')}
  nordic-data search equinor

  ${c('dim', '# JSON for scripting')}
  nordic-data search "telenor" --json | jq '.results[0].orgnr'

  ${c('dim', '# Lookup by orgnr also works as a single-result search')}
  nordic-data search 923609016
`,
  lookup: `${c('bold', 'nordic-data lookup')} ${c('dim', '<orgnr> [--json]')}

Full snapshot of one company. Includes identity, address, key personnel,
contacts, and a sanctions hit count.

${c('bold', 'ORGNR FORMATS')}
  9 digits   ${c('dim', '— Norway (e.g. 923609016)')}
  10 digits  ${c('dim', '— Sweden (e.g. 5566370985 or 556637-0985) — auto-routes to Sweden command')}

${c('bold', 'EXAMPLES')}
  ${c('dim', '# Norway')}
  nordic-data lookup 923609016

  ${c('dim', '# Sweden (10-digit orgnr — auto-detected)')}
  nordic-data lookup 5566370985

  ${c('dim', '# Raw JSON')}
  nordic-data lookup 923609016 --json | jq .identity.name
`,
  contacts: `${c('bold', 'nordic-data contacts')} ${c('dim', '<orgnr> [--json]')}

Verified emails, phones, and named executives for a Norwegian company.
Cached 30 days. Empty when no public contact info is available.

${c('bold', 'EXAMPLES')}
  nordic-data contacts 923609016
  nordic-data contacts 923609016 --json
`,
  'contacts-se': `${c('bold', 'nordic-data contacts-se')} ${c('dim', '<orgnr> [--json]')}

Sweden: identity + AI-enriched contacts (verified emails, phones, named executives).

${c('bold', 'EXAMPLES')}
  nordic-data contacts-se 5566370985
  nordic-data contacts-se 556637-0985   ${c('dim', '# dash is accepted')}
`,
  board: `${c('bold', 'nordic-data board')} ${c('dim', '<orgnr> [--json]')}

Current board + leadership for a Norwegian company. Shows role category
(styre / ledelse / other) and full role description.

${c('bold', 'EXAMPLES')}
  nordic-data board 923609016
`,
  finances: `${c('bold', 'nordic-data finances')} ${c('dim', '<orgnr> [--json]')}

Latest annual accounts for a Norwegian company: revenue, operating profit,
net result, balance sheet totals, equity, and computed ratios.

${c('bold', 'EXAMPLES')}
  nordic-data finances 923609016
  nordic-data finances 923609016 --json | jq .ratios
`,
  procurement: `${c('bold', 'nordic-data procurement')} ${c('dim', '<orgnr> [--json]')}

Public-sector contract aggregates for a Norwegian company — count of
contracts won, estimated total value, top buyers.

${c('bold', 'EXAMPLES')}
  nordic-data procurement 923609016
`,
  grants: `${c('bold', 'nordic-data grants')} ${c('dim', '<orgnr> [--json]')}

EU R&D grant participations for a Norwegian company. Returns each grant
with role (coordinator/participant), EU contribution, project budget.

${c('bold', 'EXAMPLES')}
  nordic-data grants 923609016
`,
  sanctions: `${c('bold', 'nordic-data sanctions')} ${c('dim', '<orgnr> [--json]')}

Sanctions / AML / KYC check. Screens the company AND its officers against
international watchlists (OFAC SDN; EU + UN forthcoming). Auto-fetches
officers if not yet cached — one call gives you the full picture.

${c('bold', 'EXAMPLES')}
  nordic-data sanctions 923609016
`,
  shareholders: `${c('bold', 'nordic-data shareholders')} ${c('dim', '<orgnr> [--json]')}

Shareholder cap table for a Norwegian AS — ownership %, share count, identity
of each holder.

${c('bold', 'EXAMPLES')}
  nordic-data shareholders 923609016
`,
  mcp: `${c('bold', 'nordic-data mcp')}

Print the MCP server config snippet to drop into Claude Desktop / Cursor.
Set NORDIC_DATA_KEY first to embed your key in the snippet.

${c('bold', 'EXAMPLES')}
  ${c('dim', '# Print the snippet')}
  nordic-data mcp

  ${c('dim', '# Wire your key in the printed snippet')}
  export NORDIC_DATA_KEY=nrd_live_...
  nordic-data mcp
`,
  signup: `${c('bold', 'nordic-data signup')}

Open the free-tier signup page in your browser. 500 requests/month, no card.
`,
};

const args = process.argv.slice(2);
let useJson = false;
let useColor = isTTY;
let wantsHelp = false;
const cleanArgs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json') useJson = true;
  else if (a === '--no-color') useColor = false;
  else if (a === '--key') { process.env.NORDIC_DATA_KEY = args[++i] || ''; }
  else if (a === '--help' || a === '-h') wantsHelp = true;
  else if (a === '--version' || a === '-v') {
    const { version } = require('../package.json');
    console.log(version);
    process.exit(0);
  } else cleanArgs.push(a);
}

// Resolve per-command help: `nordic-data <cmd> --help` shows command-specific help.
// `nordic-data --help` (no command) shows the global help.
if (wantsHelp) {
  if (cleanArgs.length > 0 && COMMAND_HELP[cleanArgs[0]]) {
    console.log(COMMAND_HELP[cleanArgs[0]]);
  } else {
    console.log(HELP);
  }
  process.exit(0);
}
if (cleanArgs.length === 0) { console.log(HELP); process.exit(0); }

const [cmd, ...rest] = cleanArgs;

// ── API helpers ────────────────────────────────────────────

async function publicRequest(path) {
  const headers = {
    'User-Agent': `nordic-data-cli/${require('../package.json').version}`,
    Origin: 'https://nordicdata.cloud',
  };
  const key = API_KEY || process.env.NORDIC_DATA_KEY;
  if (key) headers['X-API-Key'] = key;

  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    if (res.status === 429) die('Rate limited. Free tier is 4 lookups per IP per 24h. Set NORDIC_DATA_KEY=... for higher limits.\n  Sign up at https://nordicdata.cloud/?signup=free (500 requests/month, no card).');
    if (res.status === 401) die('Auth required. Set NORDIC_DATA_KEY=... or pass --key <key>.\n  Sign up at https://nordicdata.cloud/?signup=free (500 requests/month, no card).');
    // Try to parse a structured JSON error and surface a useful message + hint.
    let body = null;
    try { body = await res.json(); } catch {}
    const errCode = body && body.error;
    const errMsg = body && body.message;
    if (res.status === 404) {
      if (errCode === 'not_found' && body.orgnr) {
        die(`Company ${body.orgnr} not found in the official register.\n  ${c('dim', 'If you do not know the orgnr, try:')} nordic-data search <name>`);
      }
      die(`Not found.\n  ${c('dim', 'Tip:')} nordic-data search <name>  ${c('dim', 'to find the orgnr first.')}`);
    }
    if (res.status === 400 && errCode === 'invalid_orgnr') {
      die(`Invalid Norwegian organisation number — must be 9 digits.\n  ${c('dim', 'Tip:')} nordic-data search <name>  ${c('dim', 'to find the orgnr.')}`);
    }
    if (res.status === 400 && errMsg) die(errMsg);
    if (res.status === 402) die(`Payment required. ${errMsg || 'Plan does not include this endpoint.'}\n  See plans: https://nordicdata.cloud/#pricing`);
    if (res.status >= 500) die(`Server error (${res.status}). Try again in a moment. If it persists, email support@nordicdata.cloud.`);
    die(`API error ${res.status}: ${errMsg || (body && JSON.stringify(body)) || 'unknown error'}`);
  }
  return res.json();
}

function die(msg) {
  console.error(c('red', '✗ ') + msg);
  process.exit(1);
}

function pretty(label, value) {
  if (value == null || value === '' || value === 0) return;
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  console.log(`  ${c('dim', label.padEnd(16))} ${v}`);
}

function header(title) {
  console.log('');
  console.log(c('bold', title));
}

// Normalise nested response paths used across commands.
function id(snapshot) { return snapshot.identity || {}; }
function pd(snapshot) { return (snapshot.public_details && snapshot.public_details.contact_details) || {}; }
function offs(snapshot) { return (snapshot.public_details && snapshot.public_details.top_officers) || []; }

// ── Commands ───────────────────────────────────────────────

async function search(query) {
  if (!query) die('Usage: nordic-data search <query>');
  const data = await publicRequest(`/_/look?q=${encodeURIComponent(query)}`);
  if (useJson) return console.log(JSON.stringify(data, null, 2));
  const rs = data.results || [];
  if (rs.length === 0) return console.log(c('dim', 'No results.'));
  header(`${rs.length} result(s) for "${query}"`);
  for (const r of rs.slice(0, 25)) {
    const city = (r.business_address && r.business_address.city) || '';
    const status = r.status === 'active' ? '' : c('dim', `  · ${r.status}`);
    console.log(`  ${c('orange', r.orgnr)}  ${r.name}${city ? c('dim', `  · ${city}`) : ''}${status}`);
  }
  if (rs.length > 25) console.log(c('dim', `  ...and ${rs.length - 25} more`));
  console.log('');
  console.log(c('dim', 'nordic-data lookup <orgnr>  to see the full snapshot.'));
}

async function lookup(orgnr) {
  if (!orgnr) die('Usage: nordic-data lookup <orgnr>\n  Norway: 9-digit orgnr. Sweden: 10-digit orgnr (with or without dash).');
  // Auto-route Swedish orgnrs (10 digits, with or without dash) to the SE flow.
  const cleaned = String(orgnr).replace(/[-\s]/g, '');
  if (/^\d{10}$/.test(cleaned)) {
    console.log(c('dim', `(10-digit orgnr detected — routing to Sweden command)\n`));
    return contactsSe(orgnr);
  }
  if (!/^\d{9}$/.test(cleaned)) {
    die(`Invalid orgnr "${orgnr}".\n  Norway uses 9 digits (e.g. 923609016).\n  Sweden uses 10 digits (e.g. 5566370985 or 556637-0985).\n  ${c('dim', 'Tip:')} nordic-data search <name>  ${c('dim', 'to find it.')}`);
  }
  const snap = await publicRequest(`/_/look/${orgnr}`);
  if (useJson) return console.log(JSON.stringify(snap, null, 2));

  const i = id(snap);
  const ba = i.business_address || {};
  header(`${i.name || 'Unknown'} ${c('dim', `(${snap.orgnr})`)}`);
  pretty('Status', i.status);
  if (snap.status && snap.status.is_bankrupt) pretty('Bankruptcy', c('red', 'Active konkurs'));
  pretty('Founded', i.registered);
  pretty('Legal form', i.legal_form && `${i.legal_form.code} (${i.legal_form.description})`);
  if (i.nace && i.nace[0]) pretty('NACE', `${i.nace[0].code}  ${i.nace[0].description}`);
  pretty('Address', ba.street);
  pretty('City', `${ba.postal_code || ''} ${ba.city || ''}`.trim());
  pretty('Employees', i.employees);
  pretty('VAT reg.', i.in_vat_registry != null ? (i.in_vat_registry ? 'yes' : 'no') : null);
  pretty('Website', i.website);

  const contact = pd(snap);
  const phones = contact.phones || [];
  const emails = contact.emails || [];
  if (phones.length) pretty('Phone', phones[0]);
  if (emails.length) pretty('Email', emails[0]);

  const nc = contact.named_contacts || [];
  if (nc.length) {
    header('Key personnel');
    for (const p of nc.slice(0, 10)) {
      const extras = [p.email, p.phone].filter(Boolean).join('  ·  ');
      console.log(`  ${c('orange', (p.role || '').slice(0, 32).padEnd(32))} ${c('bold', p.name)}${extras ? c('dim', `  · ${extras}`) : ''}`);
    }
  }

  const sanc = snap.sanctions || {};
  if (sanc.company_hits || sanc.officer_hits) {
    header('Sanctions');
    if (sanc.company_hits) console.log(c('red', `  ● Company hits: ${sanc.company_hits}`));
    if (sanc.officer_hits) console.log(c('yellow', `  ● Officer hits: ${sanc.officer_hits}`));
  }

  console.log('');
  console.log(c('dim', 'Open in browser: ') + c('cyan', `https://nordicdata.cloud/company/${snap.orgnr}`));
}

async function contacts(orgnr) {
  if (!orgnr) die('Usage: nordic-data contacts <orgnr>');
  const snap = await publicRequest(`/_/look/${orgnr}`);
  if (useJson) return console.log(JSON.stringify(snap.public_details && snap.public_details.contact_details, null, 2));
  const contact = pd(snap);
  header(`Contacts for ${id(snap).name || orgnr}`);
  const labels = contact.labels || {};
  if ((contact.emails || []).length) {
    console.log(c('bold', '\n  Emails:'));
    for (const e of contact.emails) {
      const label = labels[`email:${e}`] || '';
      console.log(`    ${e}${label ? c('dim', `  · ${label}`) : ''}`);
    }
  }
  if ((contact.phones || []).length) {
    console.log(c('bold', '\n  Phones:'));
    for (const p of contact.phones) {
      const label = labels[`phone:${p}`] || '';
      console.log(`    ${p}${label ? c('dim', `  · ${label}`) : ''}`);
    }
  }
  if ((contact.named_contacts || []).length) {
    console.log(c('bold', '\n  Named contacts:'));
    for (const n of contact.named_contacts) {
      console.log(`    ${c('orange', n.role || '')}  ${c('bold', n.name)}${n.email ? c('dim', `  · ${n.email}`) : ''}${n.phone ? c('dim', `  · ${n.phone}`) : ''}`);
    }
  }
}

async function board(orgnr) {
  if (!orgnr) die('Usage: nordic-data board <orgnr>');
  const snap = await publicRequest(`/_/look/${orgnr}`);
  const officers = offs(snap);
  if (useJson) return console.log(JSON.stringify(officers, null, 2));
  header(`Officers for ${id(snap).name || orgnr}`);
  if (!officers.length) return console.log(c('dim', '  No officers in public snapshot.'));
  for (const o of officers) {
    const cat = o.category === 'styre' ? c('cyan', '[styre]    ') : o.category === 'ledelse' ? c('orange', '[ledelse]  ') : c('dim', `[${o.category}]`.padEnd(12));
    console.log(`  ${cat} ${(o.role_description || '').padEnd(22)} ${c('bold', o.name)}`);
  }
}

async function finances(orgnr) {
  if (!orgnr) die('Usage: nordic-data finances <orgnr>');
  const snap = await publicRequest(`/_/look/${orgnr}`);
  const a = snap.accounts || {};
  if (useJson) return console.log(JSON.stringify(a, null, 2));
  header(`Financials ${a.fiscal_year ? `(FY${a.fiscal_year})` : ''} for ${id(snap).name || orgnr}`);
  const is_ = a.income_statement || {};
  const bs = a.balance_sheet || {};
  const r = a.ratios || {};
  pretty('Revenue', fmt(is_.revenue, a.currency));
  pretty('Operating profit', fmt(is_.operating_profit, a.currency));
  pretty('Net result', fmt(is_.net_result, a.currency));
  pretty('Total assets', fmt(bs.total_assets, a.currency));
  pretty('Equity', fmt(bs.equity, a.currency));
  pretty('Equity ratio', r.equity_ratio != null && (r.equity_ratio * 100).toFixed(1) + '%');
  pretty('Net margin', r.net_margin != null && (r.net_margin * 100).toFixed(1) + '%');
}

async function procurement(orgnr) {
  if (!orgnr) die('Usage: nordic-data procurement <orgnr>');
  const snap = await publicRequest(`/_/look/${orgnr}`);
  const p = snap.procurement || {};
  if (useJson) return console.log(JSON.stringify(p, null, 2));
  header(`Public procurement aggregates for ${id(snap).name || orgnr}`);
  pretty('Tenders as buyer', `${p.tenders_as_buyer_24m || 0} (24m)`);
  pretty('Contracts won',    `${p.contracts_won_24m || 0} (24m)`);
  pretty('Contract value',   p.contract_wins_value_24m && `NOK ${p.contract_wins_value_24m.toLocaleString('nb-NO')} (24m)`);
  const top = (snap.public_details && snap.public_details.top_contract_wins) || [];
  if (top.length) {
    console.log(c('bold', '\n  Top contract wins:'));
    for (const w of top.slice(0, 10)) {
      console.log(`    ${c('orange', w.awarded_at || '')}  ${w.buyer || ''}  ${c('dim', '·')}  ${w.value ? 'NOK ' + Number(w.value).toLocaleString('nb-NO') : ''}`);
      if (w.title) console.log(`           ${c('dim', w.title)}`);
    }
  }
}

async function grants(orgnr) {
  if (!orgnr) die('Usage: nordic-data grants <orgnr>');
  const snap = await publicRequest(`/_/look/${orgnr}`);
  const g = snap.eu_funding || {};
  if (useJson) return console.log(JSON.stringify(g, null, 2));
  header(`EU funding for ${id(snap).name || orgnr}`);
  pretty('Horizon grants',     g.horizon_grants);
  pretty('Coordinator grants', g.coordinator_grants);
  pretty('Total EC contrib',   g.total_ec_contribution_eur && `EUR ${Math.round(g.total_ec_contribution_eur).toLocaleString('nb-NO')}`);
  const top = (snap.public_details && snap.public_details.top_eu_grants) || [];
  if (top.length) {
    console.log(c('bold', '\n  Top grants:'));
    for (const t of top.slice(0, 10)) {
      console.log(`    ${c('orange', t.programme || '')}  ${(t.topic || '').slice(0, 60)}`);
    }
  }
}

async function sanctions(orgnr) {
  if (!orgnr) die('Usage: nordic-data sanctions <orgnr>');
  const snap = await publicRequest(`/_/look/${orgnr}`);
  const s = snap.sanctions || {};
  if (useJson) return console.log(JSON.stringify(s, null, 2));
  header(`Sanctions screening for ${id(snap).name || orgnr}`);
  if (!s.company_hits && !s.officer_hits) {
    console.log(c('green', '  ✓ No sanctions hits.'));
    pretty('Officers screened', s.officers_screened);
    return;
  }
  if (s.company_hits) console.log(c('red', `  ● Company hits: ${s.company_hits}`));
  if (s.officer_hits) console.log(c('yellow', `  ● Officer hits: ${s.officer_hits} (of ${s.officers_screened || '?'} screened)`));
  if (s.company_top_match) pretty('Top match', s.company_top_match);
}

async function shareholders(orgnr) {
  if (!orgnr) die('Usage: nordic-data shareholders <orgnr>');
  const snap = await publicRequest(`/_/look/${orgnr}`);
  const sh = snap.shareholders || {};
  if (useJson) return console.log(JSON.stringify(sh, null, 2));
  header(`Shareholder summary for ${id(snap).name || orgnr}`);
  pretty('Fiscal year',  sh.fiscal_year);
  pretty('Shareholders', sh.count);
  pretty('Total shares', sh.total_shares && sh.total_shares.toLocaleString('nb-NO'));
  console.log(c('dim', '\n  Full UBO chain available via authenticated /companies/:orgnr/ownership.'));
}


async function contactsSe(orgnr) {
  if (!orgnr) die('Usage: nordic-data contacts-se <orgnr>  (Swedish 10-digit organisation number)');
  const cleaned = String(orgnr).replace(/[-\s]/g, '');
  if (!/^\d{10}$/.test(cleaned)) die('Swedish orgnr must be 10 digits (with or without dash).');
  const data = await publicRequest(`/companies/se/${cleaned}/contact`);
  if (useJson) return console.log(JSON.stringify(data, null, 2));
  header(`${data.name || 'Swedish company'} ${c('dim', `(${data.orgnr_formatted || cleaned})`)}`);
  pretty('VAT number', data.vat_number);
  pretty('Address', data.address);
  const emails = data.emails || [];
  const phones = data.phones || [];
  if (phones.length) pretty('Phone', phones[0]);
  if (emails.length) pretty('Email', emails[0]);
  const nc = data.named_contacts || [];
  if (nc.length) {
    header('Named contacts');
    for (const p of nc.slice(0, 10)) {
      const extras = [p.email, p.phone].filter(Boolean).join('  ·  ');
      console.log(`  ${c('orange', (p.role || '').slice(0, 32).padEnd(32))} ${c('bold', p.name)}${extras ? c('dim', `  · ${extras}`) : ''}`);
    }
  }
  if (data.cached) console.log(c('dim', `\n  (cached, fetched ${data.fetched_at || ''})`));
  console.log('');
  console.log(c('dim', 'Sweden contact data uses your monthly contact-enrichment credits.'));
}

function mcp() {
  console.log(`${c('bold', 'MCP setup for Claude Desktop / Cursor')}\n`);
  console.log(c('dim', '# Add to your MCP client config (e.g. claude_desktop_config.json):'));
  const snippet = {
    mcpServers: {
      'nordic-data': {
        url: 'https://api.nordicdata.cloud/mcp',
        headers: { Authorization: 'Bearer YOUR_NORDIC_DATA_KEY' },
      },
    },
  };
  console.log(JSON.stringify(snippet, null, 2));
  console.log('');
  console.log(c('dim', 'Get a free key (500 req/mo) at ') + c('cyan', 'https://nordicdata.cloud/?signup=free'));
  console.log(c('dim', 'Listed on Smithery: ') + c('cyan', 'https://smithery.ai/servers/sofia-jameson-20/Nordic-Data'));
  console.log(c('dim', 'Listed on mcp.so: ') + c('cyan', 'https://mcp.so/server/nordic-data'));
}

function signup() {
  const url = 'https://nordicdata.cloud/?signup=free';
  console.log(`Opening ${c('cyan', url)} in your browser...`);
  const { exec } = require('child_process');
  const cmds = { darwin: `open "${url}"`, win32: `start "" "${url}"`, linux: `xdg-open "${url}"` };
  const c2 = cmds[process.platform];
  if (c2) exec(c2);
}

function fmt(n, currency) {
  if (n == null) return null;
  const cur = currency || 'NOK';
  if (Math.abs(n) >= 1e9) return `${cur} ${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${cur} ${(n / 1e6).toFixed(1)}M`;
  return `${cur} ${n.toLocaleString('nb-NO')}`;
}

// ── Dispatch ───────────────────────────────────────────────

(async () => {
  try {
    switch (cmd) {
      case 'search':       await search(rest.join(' ')); break;
      case 'lookup':       await lookup(rest[0]); break;
      case 'contacts':     await contacts(rest[0]); break;
      case 'board':        await board(rest[0]); break;
      case 'finances':     await finances(rest[0]); break;
      case 'procurement':  await procurement(rest[0]); break;
      case 'grants':       await grants(rest[0]); break;
      case 'sanctions':    await sanctions(rest[0]); break;
      case 'shareholders': await shareholders(rest[0]); break;
      case 'mcp':          mcp(); break;
      case 'signup':       signup(); break;
      default:
        die(`Unknown command: ${cmd}\n\nRun ${c('bold', 'nordic-data --help')} for usage.`);
    }
  } catch (err) {
    die(err.message || String(err));
  }
})();
