# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Environment

Copy `.env.example` to `.env` and configure the backend addresses. Vite loads these values automatically when commands run through pnpm.

```sh
cp .env.example .env
```

## Installer builds

Build an installer on its matching platform with:

```sh
pnpm tauri:build:windows
pnpm tauri:build:mac
```

The GitHub Actions workflow builds unsigned Windows x64 NSIS and universal macOS DMG installers. Configure the repository variables `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` before running it.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
# tauri-rag-app
w
