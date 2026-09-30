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

- SQLite database: `data/ritzy.sqlite`
- Photos: `data/uploads`, resized JPEGs
- Both stay on this computer. They are gitignored.
- Questions, holds, visit requests, trade requests, consignment offers, and new-arrival emails are rows in that database. Nothing is emailed.

Draft pieces stay off the shop, the sold shelf, and the lookbook until they are published.

## What a public host would need

GitHub Pages only serves the static site on `main`. This version needs a process that can run a server:

1. A Node server (`npm run build` then `npm start`, or another host that runs Next.js with server features).
2. A database on disk that survives restarts. SQLite is enough for one server writing to one file. More than one server needs a shared database.
3. A place to keep the photos in `data/uploads` on that same server, or object storage wired to the same records.
4. `ADMIN_PASSWORD` set in the host environment. On HTTPS, set `RITZY_COOKIE_SECURE=1` so the session cookie is only sent over HTTPS.

Do not point ritzyheirloom.com at this branch. Pages, DNS, and `main` stay as they are. This branch also asks search engines not to index it. That would need to change if this ever became the public site.

`npm run build` on this branch does not write the `out/` folder Pages expects. `main` still builds that static site. Do not merge this config into `main` without a host for the server.
