# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Environment

Copy `.env.example` to `.env` and configure the default backend address. This
value is compiled into the native transport as a fallback. The WebSocket origin
is derived from it (`https` becomes `wss`, and `http` becomes `ws`). Users can override
the server host from the API access settings at runtime, while the API key is
stored in the OS credential vault.

```sh
cp .env.example .env
```

## Installer builds

Build an installer on its matching platform with:

```sh
pnpm tauri:build:windows
pnpm tauri:build:windows:x86
pnpm tauri:build:mac
```

The GitHub Actions release workflow builds these files:

- Windows x64 NSIS installer
- Windows x86 NSIS installer
- Universal macOS DMG for Intel and Apple Silicon

Before releasing, configure the repository variable `RAG_API_BASE_URL`. The
workflow stops before packaging if the address is missing or invalid. Do not
configure an API key in GitHub Actions; users enter it at runtime.

To publish a release, keep the versions in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` synchronized, then push a matching tag:

```sh
git tag v0.1.7
git push origin v0.1.7
```

GitHub Actions creates a draft release with the three installers attached. Test the files, then publish the draft from the repository’s Releases page. Authorized repository users can download the published installers from:

```text
https://github.com/Elvis2280/tauri-rag-app/releases/latest
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
# tauri-rag-app
w
