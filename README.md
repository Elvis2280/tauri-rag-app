# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Environment

Copy `.env.example` to `.env` and configure the backend addresses. These values
are compiled into the native transport; the API key is entered by each user at
runtime and stored in the OS credential vault.

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

Before releasing, configure the repository variables `RAG_API_BASE_URL` and
`RAG_WS_BASE_URL`. The workflow stops before packaging if either address is
missing. For compatibility, it temporarily falls back to the old `VITE_*`
address variable names. Do not configure an API key in GitHub Actions; users
enter it at runtime.

To publish a release, keep the versions in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` synchronized, then push a matching tag:

```sh
git tag v0.1.6
git push origin v0.1.6
```

GitHub Actions creates a draft release with the three installers attached. Test the files, then publish the draft from the repository’s Releases page. Authorized repository users can download the published installers from:

```text
https://github.com/Elvis2280/tauri-rag-app/releases/latest
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
# tauri-rag-app
w
