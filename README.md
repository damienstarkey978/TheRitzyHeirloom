# The Ritzy Heirloom

The public site at [https://ritzyheirloom.com](https://ritzyheirloom.com) is the one-page site on `main`, published by GitHub Pages. This branch is a private shop desk for use on one computer. It does not replace that site.

The name on the page is the shop wordmark (`public/logo.jpg`). The gold rule and frame use `#b07c28`, sampled from that wordmark.

## Run this private version

```bash
npm install
cp .env.example .env.local
```

Set `ADMIN_PASSWORD` in `.env.local` to a password you choose. `ADMIN_USERNAME` defaults to `mindy`. Then:

```bash
npm run dev
```

The server listens on port 4765 at [http://127.0.0.1:4765](http://127.0.0.1:4765). The shop desk is [http://127.0.0.1:4765/admin/login](http://127.0.0.1:4765/admin/login).

Restart the server after changing the password. The password is hashed when the database opens. It is not written into the source.

Sample listings are loaded the first time the database is created. They are marked Sample data and use “Ask for price”. Delete the `data/` folder and restart to load them again.

```bash
npm test
```

## How the data is stored

- SQLite database: `data/ritzy.sqlite` (or `RITZY_DATA_DIR`)
- Photos: `data/uploads`, resized JPEGs
- Both stay on this computer. They are gitignored.
- Questions, holds, visit requests, trade requests, consignment offers, and new-arrival emails are rows in that database. Nothing is emailed unless a webhook is turned on later.

Pages keep using the shop functions. `RITZY_DATABASE_DRIVER=sqlite` and `RITZY_FILE_DRIVER=local` are the working defaults. Any other driver name is refused, so a hosted database or object storage can be added later without rewriting the pages.

Draft pieces stay off the shop, the sold shelf, and the lookbook until they are published. Held pieces stay off the floor too. Available pieces are on the floor, and sold pieces move to the sold shelf.

Each piece gets a stable SKU such as `RH-00007`. The pieces page can filter by status and search by title, SKU, maker, or tag. The shop floor can filter by category. **Look up value and history** on a draft reads current eBay asking prices and, when `AI_PROVIDER` and `AI_API_KEY` are set, a research draft. Asking prices are labeled as asking prices. The suggested range sits beside the price and does not replace it. A suggested description is saved only after you accept it. Lookup history stays on the piece.

The read-only inventory API and the CSV columns are described in `docs/pos-integration.md`.

`ADMIN_PASSWORD` creates the desk account the first time that username is missing. Changing the password in the desk is kept across restarts. If that password is lost, delete the user row, set `ADMIN_PASSWORD` again, and restart.

`SITE_PASSWORD` locks the whole site, in front of the desk login. Leave it empty here. Set it on the host.

## Deploy

GitHub Pages only serves the static site on `main`. This branch needs one always-on Node process, a disk that survives restarts, and HTTPS. Do not point ritzyheirloom.com at this branch. Do not push this branch to `main`, and do not change Pages.

The host for the private shop is Fly.io: one shared-cpu machine in Ashburn (`iad`) with 512 MB of RAM, kept running, and a 15 GB volume mounted at `/data` for the SQLite file and the photos. That avoids a database rewrite. Pricing checked 30 September 2026 at [Fly.io pricing](https://fly.io/pricing/) and [Fly resource pricing](https://fly.io/docs/about/pricing/):

- shared-cpu-1x at 256 MB is $1.94 per month, and extra RAM is $5 per GB per month, so 512 MB is about $3.19
- volumes are $0.15 per provisioned GB per month, so 15 GB is $2.25
- daily volume snapshots are included, billed at $0.08 per GB of stored snapshot data, with the first 10 GB free and 5 days of retention
- North America egress is $0.02 per GB

That is about $5.50 per month before tax, plus a little egress. A 1 October 2026 price update on [fly.io/pricing-update](https://fly.io/pricing-update/) raises that machine to about $3.69, so the same setup is about $6 to $7 after that. A dedicated IPv4 address ($2 per month) is not required if `dev` is a CNAME.

Render’s free web service sleeps and cannot attach a disk. Render’s always-on Starter plan is $7 plus $0.25 per GB of disk, about $11 for 15 GB ([Render pricing](https://render.com/pricing)). Railway Hobby includes $5 of usage but its volume limit is 5 GB, which does not hold about 10 GB of photos; Pro is $20 ([Railway pricing](https://railway.com/pricing)). Hetzner’s cheapest shared cloud plans were marked unavailable, and a VPS still needs its own TLS, deploys, and backups. None of those beat Fly on both cost and reliability for this shop.

`fly.toml` is in the repo. The volume is created with flyctl, not by that file. Do not deploy until the Fly account exists and Damien says it is ready. Do not put passwords in git.

When the account is ready, from this branch:

```bash
fly auth login
fly apps create ritzy-heirloom-dev
fly volumes create ritzy_data --region iad --size 15 -a ritzy-heirloom-dev
fly secrets set -a ritzy-heirloom-dev \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  ADMIN_USERNAME=mindy \
  ADMIN_PASSWORD="choose-a-desk-password" \
  SITE_PASSWORD="choose-a-site-password" \
  RITZY_BASE_URL="https://dev.ritzyheirloom.com" \
  RITZY_COOKIE_SECURE=1 \
  RITZY_DATA_DIR=/data \
  RITZY_DATABASE_DRIVER=sqlite \
  RITZY_FILE_DRIVER=local \
  RITZY_EMAIL_DRIVER=off
fly deploy -a ritzy-heirloom-dev
fly certs add dev.ritzyheirloom.com -a ritzy-heirloom-dev
```

If the app name is already taken, pick another name and use that name’s `fly.dev` hostname in the DNS record below.

DNS for the private host, not applied yet. Leave the apex and `www` records for ritzyheirloom.com alone.

| Type | Name | Value |
| --- | --- | --- |
| CNAME | dev | ritzy-heirloom-dev.fly.dev |

Fly’s volume snapshots run every day and are kept for 5 days. For a copy you can download, on the machine:

```bash
fly ssh console -a ritzy-heirloom-dev -C "node scripts/backup.mjs"
```

That writes `/data/backups/ritzy-<date>.tar.gz` with a consistent SQLite copy and the photos. Copy it off the volume with `fly ssh sftp get`. Locally, `npm run backup` writes the same kind of archive under `data/backups`.

`npm run build` on this branch does not write the `out/` folder Pages expects. `main` still builds that static site. Do not merge this config into `main`. This branch also asks search engines not to index it.
