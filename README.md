# edgen-chat (static)

This is a **fully static-exportable** Next.js app. Backend/auth has been removed for now so we can keep iterating without external services.

## Run locally

```bash
pnpm install
pnpm dev
```

## Build (static export)

```bash
pnpm build
```

## Using Local (Ollama) from GitLab Pages (or any hosted static site)

If you deploy this app to GitLab Pages, it still runs entirely in the **user’s browser**. When you choose **Local (Ollama)** with a Base URL like `http://localhost:11434`, the browser will try to call **the user’s own machine** at `localhost`.

That can work, but only if:

- **Ollama is running on the same machine as the browser**
- Ollama (or something in front of it) is configured to **allow CORS** from your Pages origin (otherwise you’ll see CORS/403 errors)

### Quick fix: local reverse proxy that adds CORS (recommended)

Run a tiny local proxy on the same machine that:

- Adds `Access-Control-Allow-Origin`
- Strips the `Origin` header before forwarding (helps if the upstream rejects unknown origins)

Example using **Caddy** (install Caddy, then create `Caddyfile`):

```txt
:11435 {
  header Access-Control-Allow-Origin "https://YOUR_GITLAB_PAGES_DOMAIN"
  header Access-Control-Allow-Methods "GET, POST, OPTIONS"
  header Access-Control-Allow-Headers "*"
  reverse_proxy localhost:11434 {
    header_up -Origin
  }
}
```

Then run:

```bash
caddy run --config Caddyfile
```

And in the app Settings, set **Base URL** to:

- `http://localhost:11435`



