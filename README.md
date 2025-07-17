# Shaggy Hi-Fidelity

This repository contains the code and deployment configuration for the `shaggyhf.com` website.

## Overview

This project is a static website built with:

* [Vite](https://vitejs.dev/) for the frontend
* [Alpine.js](https://alpinejs.dev/) for interactivity
* Hosted on **Cloudflare Pages** (and mirrored on github pages)
* Custom domain `shaggyhf.com` registered with Cloudflare Registrar and served via Cloudflare DNS

### Canonical domain

The canonical domain for this site is `https://www.shaggyhf.com`.
`https://shaggyhf.com` is redirected to `https://www.shaggyhf.com` using a **Cloudflare Worker**.

## Repository structure

```
/web/                 → Vite app config and html files
  /images/            → Source assets processed by Vite (hashed etc.)
  /dist/              → Build output (generated)
  /src/               → JS source code, including Alpine.js models
    
/cloudflare/
  /redirect-worker/   → Worker that redirects `shaggyhf.com` → `www.shaggyhf.com`
```

## Deployment workflow

### Cloudflare Pages (hosting)

* **Automatically deployed** on merges to `main` via GitHub Actions workflow.
* Published to `https://www.shaggyhf.com` via Cloudflare Pages.

### GitHub Pages (legacy / fallback)

* Still published on merge to `main` for now via `.github/workflows/deploy.yml`.

### Cloudflare Worker (redirect)

* Defined in `/cloudflare/redirect-worker/`.

* **Manually deployed as needed** using Wrangler CLI:

  ```sh
  cd cloudflare/redirect-worker
  wrangler deploy --routes "https://shaggyhf.com/*"
  ```

* Redirects all traffic from `shaggyhf.com` to `www.shaggyhf.com`.

## DNS configuration summary

Managed in Cloudflare DNS:

| Type  | Name               | Content              | Proxy   |
| ----- | ------------------ | -------------------- | ------- |
| A     | `shaggyhf.com`     | 192.0.2.1 (dummy IP) | Proxied |
| CNAME | `www.shaggyhf.com` | `shaggyhf.pages.dev` | Proxied |

## Notes

* Those wishing to contribute should contact Knox [2503189] in-game at torn.com or knox_8 on discord.

## Useful commands

### Local development

```sh
cd web
npm install
npm run dev
```

### Deploy Worker manually

```sh
cd cloudflare/redirect-worker
wrangler deploy --routes "https://shaggyhf.com/*"
```

