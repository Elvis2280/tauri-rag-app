# AGENTS.md — AI Agent Guidelines & Engineering Standards

> **Scope**: Rules, architecture patterns, and testing conventions for AI agents operating on this codebase (`rag-desktop`) via OpenCode (and compatible AI tools).

---

## 1. System Context & Tech Stack

This project is a high-performance desktop application (`rag-desktop`) built with the following core technology stack:

- **Desktop Framework**: Tauri (v2) desktop shell
- **Backend API**: FastAPI (Python)
- **Frontend Core**: React 19 + TypeScript + Vite
- **Routing & Forms**: React Router v8, React Hook Form + Yup (`@hookform/resolvers`)
- **UI & Styling**: Tailwind CSS v4 + `shadcn` / Radix UI + Motion (Framer Motion) + Sonner
- **Server State & Networking**: TanStack Query (v4) + Axios
- **Client/Global State**: Zustand (v5)
- **Specialized UI Components**: `react-arborist` (tree view), `react-dropzone`
- **Testing Standard**: Vitest + `@testing-library/react` + `@faker-js/faker`
- **Documentation Context**: Model Context Protocol (MCP) `context7` server

---

## 2. Core Agent Principles

When executing tasks or generating code as an AI agent, you **MUST** adhere to the following principles derived from production AI-driven development workflows:

### A. Context First, Code Second
- **Always inspect local files** before assuming implementation details.
- When working with third-party APIs, framework updates, or specific library methods (Tauri, React 19, React Router v8, TanStack Query v4, Zustand v5, FastAPI, Vitest), **consult the `context7` MCP server** for up-to-date documentation and context before making code edits.

### B. Small, Incremental, Atomic Edits
- Do not rewrite entire multi-hundred-line files if only modifying or adding a function.
- Prefer targeted additions, small component extracts, and single-responsibility changes.
- Ensure every change leaves the codebase in a compilable, test-passing state.

### C. Type Safety & Strict Boundaries
- **No `any` or `unknown` casts** without explicit justification.
- Keep Zustand state types, TanStack Query keys, and FastAPI request/response DTOs strictly typed.
- Keep UI components decoupled from HTTP/IPC logic by wrapping FastAPI API calls (via Axios) or Tauri commands inside custom hooks or service layer modules.

---

## 3. Architecture & State Management Guidelines

### A. State & Layer Separation Strategy
| State / Layer Type | Solution | Usage Guideline |
| :--- | :--- | :--- |
| **Backend API** | FastAPI (Python) | Core RAG processing, embeddings, search indexing, and business logic. |
| **Server / Remote Data** | TanStack Query v4 + Axios | Async API requests to FastAPI, caching, mutation, background revalidation. |
| **Global Client State** | Zustand v5 | App-wide UI state (active view, global app settings, layout toggles). |
| **Form State** | React Hook Form + Yup | Local form inputs, validation schemas, and input error handling. |
| **Native/System State** | Tauri API (`@tauri-apps/api`) | Local window management, OS file dialogs, and native shell interactions. |

### B. Zustand Rules (v5)
- Keep stores small and domain-focused.
- Always use selectors when subscribing to state to prevent unnecessary re-renders:
  ```typescript
  // GOOD:
  const theme = useUiStore((state) => state.theme);
  
  // BAD (triggers re-render on any store change):
  const { theme } = useUiStore();
  ```

### C. TanStack Query v4 Rules
- Define query keys as constant arrays using a factory pattern:
  ```typescript
  export const documentKeys = {
    all: ['documents'] as const,
    detail: (id: string) => [...documentKeys.all, id] as const,
  };
  ```
- Handle `isLoading`, `isError`, and `data` states explicitly in custom hooks or UI components.

---

## 4. Testing Conventions (Vitest + AAA Pattern)

Testing quality is non-negotiable. All new features, utilities, and custom hooks must include tests.

### A. The AAA Pattern (Arrange - Act - Assert)
Every test block **MUST** follow the **AAA Pattern**, with explicit line breaks separating each phase:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UserProfileCard } from './UserProfileCard';
import { buildUser } from '@/test/factories/user.factory';

describe('UserProfileCard', () => {
  it('renders user details and triggers onEdit callback when button clicked', async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const mockUser = buildUser({ name: 'Alex Smith', role: 'admin' });
    const handleEdit = vi.fn();

    // 2. ACT
    render(<UserProfileCard user={mockUser} onEdit={handleEdit} />);
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await user.click(editButton);

    // 3. ASSERT
    expect(screen.getByText('Alex Smith')).toBeInTheDocument();
    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(mockUser.id);
  });
});
```

### B. Test Data Generation with `@faker-js/faker`
- **NEVER** hardcode mock strings like `"test@test.com"`, `"foo"`, or `"123"` inside unit/integration tests.
- Use `@faker-js/faker` within factory helper modules (`src/test/factories/`) to generate realistic mock data.

```typescript
// src/test/factories/document.factory.ts
import { faker } from '@faker-js/faker';

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export const buildDocument = (overrides?: Partial<Document>): Document => ({
  id: faker.string.uuid(),
  title: faker.system.commonFileName('pdf'),
  content: faker.lorem.paragraphs(2),
  createdAt: faker.date.recent().toISOString(),
  ...overrides,
});
```

### C. Testing Rules for Agents
1. **Query by Accessibility**: Prefer `getByRole`, `getByLabelText`, and `getByText` over `getByTestId` or class names.
2. **User Event over Fire Event**: Use `@testing-library/user-event` for user interactions (clicks, typing, keypresses).
3. **No Implementation Detail Leaks**: Test component behavior and user outcomes, not internal component state or private methods.
4. **Mocking External Services**: Mock Axios/FastAPI calls or Tauri APIs at the network/module boundary using MSW or Vitest mocks (`vi.mock`).

---

## 5. Workflow for OpenCode / AI Agents

When tasked with a job in OpenCode:

1. **Acknowledge & Plan**: Read the request, check relevant local files, and query `context7` MCP if library specifics are needed (especially React 19, React Router v8, Tailwind v4, or TanStack Query v4).
2. **Execute Changes**: Implement code and tests using small, strictly-typed modifications.
3. **Verify with Tests**: Run Vitest on affected files to verify that AAA unit tests pass without regressions.
4. **Self-Review**: Confirm code complies with shadcn UI accessibility, React Hook Form validation, Zustand state isolation, and strict TypeScript rules.
