# Workspace global state and workspace list plan

## Goal

Load the workspace list once when the app starts, store it in `GlobalContext`, and make chat and upload use that shared list instead of requesting workspace data independently.

The existing workspace tree request should remain available for the workspace-directory page because its response includes nested folders and files. The new `/workspace/list` request is a separate flat workspace-list concern.

## 1. ✅ Add workspace list types

Update `src/types/WorkspaceTypes.ts` with a flat API model for the `/workspace/list` response:

```ts
type WorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  storage_key: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ApiWorkspaceListResponse = WorkspaceListItem[];
```

Keep this separate from the existing tree `Workspace` type, which contains `type` and `children` fields and is used by the directory viewer.

## 2. ✅ Add workspace state to `GlobalContext`

Update `src/context/GlobalContext.tsx` so the Zustand store contains:

```ts
type GlobalState = {
  workspaces: WorkspaceListItem[];
};

type GlobalActions = {
  updateWorkspaceList: (workspace: WorkspaceListItem) => void;
  loadWorkspaceList: (workspaces: WorkspaceListItem[]) => void;
};
```

Initialize `workspaces` to an empty array.

Behavior:

- `updateWorkspaceList(workspace)` appends one workspace to the current array.
- `loadWorkspaceList(workspaces)` replaces the entire array with the provided list.

Do not mutate the existing array in place; use Zustand state updates that create a new array.

## 3. ✅ Add the `/workspace/list` endpoint

Update `src/lib/api/endpoints.ts`:

```ts
export const WORKSPACE_ENDPOINTS = {
  tree: "/workspace/tree",
  list: "/workspace/list",
} as const;
```

## 4. ✅ Add a workspace-list query hook

Create `src/hooks/useWorkspaceList.tsx` using TanStack Query and `apiRag`.

### Query behavior

- Query key: `['workspaces', 'list']`.
- Request: `GET /workspace/list`.
- Return the typed response array directly.
- On success, call `useGlobalContext.getState().loadWorkspaceList(data)` or the hook-selected `loadWorkspaceList` action.
- On error, use `extractApiErrorMessage` and show a Sonner toast such as:

```ts
toast.error("Failed to load workspaces", {
  description: readableMessage,
});
```

Expose the existing UI-friendly result shape:

```ts
{
  data,
  loading,
  error,
  refetch,
}
```

The hook may return the GlobalContext list as `data` so consumers always read the shared store value after the request succeeds.

## 5. ✅ Load the list on initial app load

Update `src/App.tsx` or add a small bootstrap component rendered by `App`:

```tsx
function App() {
  useWorkspaceList();

  return (...);
}
```

This ensures the query starts when the application mounts, regardless of which route is initially opened. The existing `QueryClientProvider` in `src/main.tsx` already supplies the required query context.

## 6. ✅ Update chat workspace usage

Update `src/components/chat/ChatSection.tsx`:

- Read `workspaces` from `useGlobalContext`.
- Use `useWorkspaceList` only for loading/error state if the component needs to render those states; do not use its independent `data` value as the source of truth.
- Keep the selected workspace ID local to the chat component unless a globally selected workspace is explicitly required later.
- Default the selected ID to the first available workspace when the current selection is no longer present.
- Continue passing the selected workspace ID to `sendMessage({ workspaceId, message })`.
- Disable message input while the workspace list is loading, the workspace list has an error, no workspace is selected, or the message request is loading.

Avoid adding another workspace-fetching hook if the app bootstrap already exposes loading/error state globally. If loading/error remain query-local, sharing the same query key is acceptable because TanStack Query will reuse its cache.

## 7. ✅ Update upload workspace usage

Update `src/components/upload/UploadSection.tsx`:

- Read the workspace list from `useGlobalContext`.
- Map the shared list to `{ id, name }` options for `UploadModal`.
- Use the selected workspace ID when calling `uploadFiles`.
- Preserve the current form validation requiring a workspace ID.
- Keep loading/error presentation consistent with the new workspace-list hook.

The upload request should continue sending the selected ID as `workspace_id` in the multipart form because that is the existing upload API contract.

## 8. ✅ Keep the workspace page tree behavior

Do not replace the existing tree model with the flat list model in `WorkspacePage` or `DirectoryViewer`.

The existing `useWorkspaceTree` hook should continue using `/workspace/tree` unless the backend contract changes separately. The new list hook is for selection and global app state.

## 9. ✅ Tests

Add or update tests for the following:

- ✅ `GlobalContext` starts with an empty workspace array.
- ✅ `updateWorkspaceList` appends one workspace to the existing list.
- ✅ `loadWorkspaceList` replaces the entire list.
- ✅ `useWorkspaceList` requests `WORKSPACE_ENDPOINTS.list` with `apiRag.get`.
- ✅ A successful workspace-list request populates `GlobalContext` with the returned array.
- ✅ A failed request shows `toast.error` with the extracted API error message.
- ✅ `ChatSection` renders options from the GlobalContext list and sends the selected workspace ID.
- ✅ `UploadSection` renders options from the GlobalContext list and uploads with the selected workspace ID.
- ✅ The app bootstrap invokes the workspace-list hook on initial render.
- ✅ Existing workspace-tree tests continue to pass.

## 10. Verification

Run the project’s existing checks after implementation:

1. ✅ Unit and component tests.
2. ✅ TypeScript/Vite production build.
3. Manual check from a fresh app load:
   - `/workspace/list` is requested once through the shared query.
   - Chat and upload selectors show the returned workspaces.
   - Chat sends the selected workspace ID.
   - Upload sends the selected workspace ID as `workspace_id`.
   - API errors appear in a toast.

## Acceptance criteria

- ✅ Global state owns an array of flat workspace records.
- ✅ One-item updates append to the list.
- ✅ Full-list loads replace the list.
- ✅ `/workspace/list` is fetched on application startup.
- ✅ Successful data populates GlobalContext.
- ✅ Workspace-list failures show a toast.
- ✅ Chat and upload consume the shared workspace list.
- ✅ Existing workspace tree functionality remains unaffected.
