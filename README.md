# Edgen Chat (static Next.js app)

Edgen Chat is an MVP version of the Edgen Chat app, now used for demonstration and portfolio purposes. It is a **fully static-exportable** Next.js chat UI that runs entirely in the **user’s browser** — no backend required. It supports **Ollama** (local) and **OpenAI-compatible** providers (any server exposing `/v1/chat/completions` + `/v1/models`).

> Note: Auth/backends were intentionally removed for now to keep iteration fast. The `/auth` UI remains as a placeholder.

---

## What it does

- **Chat in the browser**: a responsive chat UI with streaming assistant responses.
- **Local-first**: chat history is stored in **IndexedDB** (per-browser) and settings are stored in **localStorage**.
- **Provider flexibility**: connect to **Ollama** or any **OpenAI-compatible** API endpoint.

---

## Key features

- **Streaming responses** (OpenAI-style SSE parsing)
- **Threaded chat history**
  - create/rename/delete chats
  - export/import chats as JSON
- **Model discovery**
  - Ollama: `/api/tags`
  - OpenAI-compatible: `/v1/models`
- **Two chat layouts**
  - `/chat` (classic)
  - `/chat/command-center` (command-center layout)
- **Settings UI**
  - `/admin` for provider/model/base URL/API key configuration

---

## How it works (high-level architecture)

Edgen Chat is split into a few clear layers:

- **App routes (Next.js App Router)**
  - `/chat` and `/chat/command-center` render the chat UI
  - `/admin` renders the settings panel
- **AI provider layer (`lib/ai/`)**
  - provider catalog (`lib/ai/catalog.ts`)
  - model discovery + caching (`lib/ai/discovery.ts`)
  - OpenAI-compatible streaming client (`lib/ai/openai_stream.ts`)
- **Local persistence (`lib/chat/`)**
  - IndexedDB storage for chats/messages (`lib/chat/store.ts`)
- **Local settings (`lib/settings/`)**
  - localStorage-backed settings with migrations (`lib/settings/local.ts`)

---

## Requirements

- Node.js (LTS recommended)
- `pnpm`
- One of:
  - **Ollama** running locally (default base URL: `http://localhost:11434`)
  - Any **OpenAI-compatible** server (or proxy) exposing:
    - `POST /v1/chat/completions` (with `stream: true`)
    - `GET /v1/models`

---

## Configuration (in-app settings)

Edgen Chat does not require environment variables for normal use. Configure it via the UI at `/admin`:

- **Provider**: `Ollama` or `OpenAI-compatible`
- **Connection mode**:
  - `direct`: the browser calls your provider directly (requires CORS)
  - `proxy`: the browser calls your own proxy URL (useful for hiding API keys)
- **Base URLs**
  - direct: `baseUrl` (example: `http://localhost:11434` for Ollama)
  - proxy: `proxyBaseUrl` (your proxy origin)
- **API key**: only required for providers that need one (OpenAI-compatible)
- **Model**: freeform string (sent as `model` to `/v1/chat/completions`)

Settings are stored locally under the key `edgen-chat:settings:v1`.

---

## Using Local (Ollama) from GitLab Pages (or any hosted static site)

When the app is deployed as a static site, it still runs entirely in the **user’s browser**. If the user selects **Ollama** with a Base URL like `http://localhost:11434`, their browser will try to call **their own machine** at `localhost`.

That works only if:

- **Ollama is running on the same machine as the browser**
- Ollama (or something in front of it) allows **CORS** from your hosted site origin (otherwise you’ll see CORS/403 errors)

### Quick fix: local reverse proxy that adds CORS (recommended)

Run a tiny local proxy on the same machine that:

- adds `Access-Control-Allow-Origin`
- strips the `Origin` header before forwarding (helps if the upstream rejects unknown origins)

Example using **Caddy** (install Caddy, then create `Caddyfile`):

```txt
# Caddyfile (run: caddy run --config Caddyfile)
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

And in `/admin`, set **Base URL** to:

- `http://localhost:11435`

### Alternative (Linux systemd): enable CORS directly in Ollama

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf >/dev/null <<'EOF'
[Service]
Environment="OLLAMA_ORIGINS=https://YOUR_GITLAB_PAGES_DOMAIN"
EOF
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

---

## Security & privacy notes

- Treat **browser-stored chat history** as sensitive: it is stored locally in your browser (IndexedDB).
- If you use an **API key**, prefer the `proxy` mode so you don’t store or expose secrets in a public, static deployment.
- Hosted static deployments calling `localhost` require explicit **CORS** allowances (or a local reverse proxy).

---

## Troubleshooting

- **No models show up**
  - Ollama: ensure the Base URL is correct and `/api/tags` is reachable
  - OpenAI-compatible: ensure `/v1/models` is reachable (and your API key is valid if required)
- **Chat sends but nothing streams**
  - your provider must support OpenAI-style streaming for `POST /v1/chat/completions` with `stream: true`
- **CORS / 403 errors on hosted sites**
  - your local provider must allow CORS from the hosted origin, or use the reverse proxy approach above

