# Ship-it checklist — nordic-data CLI

Everything below is pre-verified. Run the blocks in order when you're ready.

---

## 0. Verify state (already passing)

```sh
cd C:/Users/andre/AppData/Local/Temp/nordic-cli/
npm test
# expected: 7/7 tests pass against live api.nordicdata.cloud
npm pack --dry-run
# expected: 4 files, 7.8 KB tarball
node bin/cli.js --version
# expected: 0.1.0
```

---

## 1. Create the GitHub repo (requires your `gh` login)

```sh
cd C:/Users/andre/AppData/Local/Temp/nordic-cli/
git init -b main
git add .
git commit -m "Initial release: nordic-data CLI v0.1.0"
gh repo create nordic-data/cli \
  --public \
  --description "CLI for Nordic Data — every Norwegian company as one API. Search, lookup, contacts, finances, procurement, grants, sanctions, shareholders, and MCP setup." \
  --homepage "https://nordicdata.cloud" \
  --source . \
  --push
```

If `nordic-data` org doesn't exist yet, swap the slug for your personal account, e.g. `andjohansen/nordic-data-cli`.

Then update `package.json` `repository.url` and `bugs.url` to the actual published URL.

---

## 2. Publish to npm (requires your `npm login`)

```sh
cd C:/Users/andre/AppData/Local/Temp/nordic-cli/
npm whoami           # confirm you're logged in
npm publish --access public
```

Expected output:
```
+ nordic-data@0.1.0
```

If the name `nordic-data` is already taken on npm, pick a scoped name (`@nordicdata/cli`) and update `package.json` `name` first.

---

## 3. Post-publish smoke test

```sh
# Run in a fresh terminal so npx fetches from the registry, not local
npx nordic-data --version
npx nordic-data search equinor
npx nordic-data lookup 923609016
```

---

## 4. Update the live landing page CLI block

On the server `andre@nordic-api`:

```sh
ssh root@nordicdata.cloud
cd /opt/nordic-api/landing/
# In index.html, find the section that says "Install the CLI"
# Add the npm badge:  https://img.shields.io/npm/v/nordic-data
# Update the install snippet to: npx nordic-data search equinor
caddy reload --config /etc/caddy/Caddyfile
```

I can do this part remotely once you confirm the npm name landed (paste the npm output back to me).

---

## 5. Sitemap + blog announce

Add a new blog post:
- Slug: `/blog/cli-on-npm`
- Title: "nordic-data is on npm — `npx nordic-data lookup 923609016`"
- Updates `sitemap.xml` + `llms.txt` automatically when published

I'll draft this once the npm publish lands.

---

## Common gotchas

- **npm 402 / 403 publish:** name collision — try a scoped name `@nordicdata/cli`
- **gh repo create — org does not exist:** create the org manually at https://github.com/account/organizations/new (free), then re-run
- **`prepublishOnly` fails:** that hook runs `bin/cli.js --version`; if it errors, your local Node is < 18
- **Don't `git push origin main --force`:** repo is fresh, regular push is fine
