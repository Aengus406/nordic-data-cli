# nordic-data

Every Norwegian company as one API, from your terminal.

```sh
npx nordic-data search equinor
npx nordic-data lookup 923609016
npx nordic-data contacts 923609016
npx nordic-data finances 923609016
```

## Install

```sh
npm install -g nordic-data
# or just use npx
npx nordic-data --help
```

## Free tier

5,000 requests per month with an API key. Without a key, the CLI uses the public widget tier (4 full snapshots per IP per 24 hours). Get a key:

```sh
npx nordic-data signup
# or visit https://nordicdata.cloud/?signup=free
```

Set the key as an environment variable:

```sh
export NORDIC_DATA_KEY=nrd_live_...
```

You can also pass `--key <key>` per invocation.

## Commands

| Command | What it does |
|---|---|
| `search <query>` | Search Norwegian companies by name or fragment |
| `lookup <orgnr>` | Full snapshot for one organisation number (registry + officers + finances + sanctions + contacts) |
| `contacts <orgnr>` | Emails, phones, and named executives |
| `board <orgnr>` | Current board + leadership |
| `finances <orgnr>` | Latest financial summary (revenue, operating profit, equity, ratios) |
| `procurement <orgnr>` | Doffin public-sector contract aggregates |
| `grants <orgnr>` | EU R&D grants (Horizon Europe, EIC) |
| `sanctions <orgnr>` | Sanctions screening (EU, UN, OFAC) hits |
| `shareholders <orgnr>` | Aksjonærregisteret aggregates |
| `mcp` | Show MCP setup snippet for Claude Desktop or Cursor |
| `signup` | Open the free-tier signup in your browser |

## Examples

Find a company:

```sh
$ npx nordic-data search equinor
8 result(s) for "equinor"
  923609016  EQUINOR ASA  · STAVANGER
  959733600  EQUINOR PENSJON  · STAVANGER
  ...
```

Get the full picture (verified live against api.nordicdata.cloud):

```sh
$ npx nordic-data lookup 923609016
EQUINOR ASA (923609016)
  Status           active
  Founded          1995-03-12
  Legal form       ASA (Allmennaksjeselskap)
  NACE             06.100  Utvinning av råolje
  Address          Forusbeen 50
  City             4035 STAVANGER
  Employees        21376
  VAT reg.         yes
  Website          www.equinor.com
  Phone            +47 406 37 334
  Email            apost@equinor.com

Key personnel
  Chief Executive Officer          Anders Opedal
  Chief Financial Officer          Torgrim Reitan
  Chairman of the Board            Jon Erik Reinhardsen
  ...
```

Financials:

```sh
$ npx nordic-data finances 923609016
Financials (FY2024) for EQUINOR ASA
  Revenue          USD 72.54B
  Operating profit USD 10.35B
  Net result       USD 8.14B
  Total assets     USD 109.15B
  Equity           USD 41.09B
  Equity ratio     37.6%
  Net margin       11.2%
```

JSON output for scripting:

```sh
$ npx nordic-data lookup 923609016 --json | jq .identity.name
"EQUINOR ASA"
```

Sanctions screening:

```sh
$ npx nordic-data sanctions 923609016
Sanctions screening for EQUINOR ASA
  ● Officer hits: 1 (of 15 screened)
```

## MCP setup for Claude Desktop / Cursor

```sh
$ npx nordic-data mcp
```

prints the JSON snippet to drop into your MCP client config. Or visit our listings:

- [Smithery](https://smithery.ai/servers/sofia-jameson-20/Nordic-Data)
- [mcp.so](https://mcp.so/server/nordic-data)
- [PulseMCP](https://www.pulsemcp.com/servers/nordic-data)

## What data is in Nordic Data?

Every Norwegian company joined on the organisation number:

- **Brønnøysundregistrene** — name, address, NACE, status, board, signatories (real-time, < 5 min lag)
- **Aksjonærregisteret** — shareholders with recursive UBO chain (annual snapshot)
- **Doffin** — public-sector procurement filings (live)
- **EU R&D grants** — Horizon Europe, EIC, joined to Norwegian recipients
- **Sanctions** — EU, UN, OFAC, screened by org and by officer
- **Enriched contacts** — 4-layer pipeline lifts contact-fill rate from 23% to 81% on the top 5,000 companies. [How it works](https://nordicdata.cloud/blog/four-layer-contact-enrichment).
- **Financial summaries** — revenue, operating profit, equity, ratios — last 5 reported years

## Pricing

Free tier: 5,000 requests / month. Paid tiers from €29/mo (25,000 req) to €499/mo (500,000 req). [Full pricing](https://nordicdata.cloud/#pricing).

## Comparison vs other vendors

We publish an honest benchmark page comparing Nordic Data against OpenCorporates, BvD/Orbis, Bisnode, Proff, Strise, and Sumsub: [https://nordicdata.cloud/coverage](https://nordicdata.cloud/coverage).

## License

MIT — see LICENSE.

## Links

- Web: https://nordicdata.cloud
- Docs: https://nordicdata.cloud/docs
- Blog: https://nordicdata.cloud/blog
- Smithery (MCP): https://smithery.ai/servers/sofia-jameson-20/Nordic-Data
- Issues: support@nordicdata.cloud
