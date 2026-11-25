import { useEffect, useMemo, useRef, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ItemGroup } from "@/components/ui/item";
import { useFileContext } from "@/context/FileContext";
import { useGlobalContext } from "@/context/GlobalContext";
import useFileUpload from "@/hooks/useFileUpload";
import { useWorkspaceList, useWorkspaceTree } from "@/hooks/useWorkspace";
import { findDuplicateUploadMatches } from "@/lib/upload";
import type { UploadFileOutcome } from "@/hooks/useFileUpload";
import UploadModalFileItem from "./UploadModalFileItem";
import UploadWorkspaceSelect from "./UploadWorkspaceSelect";
import DuplicateFileWarningDialog from "./DuplicateFileWarningDialog";

const uploadSchema = yup.object({
  workspaceId: yup.string().min(1, "Please select a workspace").required("Please select a workspace"),
});

type UploadFormValues = yup.InferType<typeof uploadSchema>;
type UploadModalProps = { open: boolean; onClose: () => void };

export default function UploadModal({ open, onClose }: UploadModalProps) {
  const files = useFileContext((state) => state.files);
  const removeFile = useFileContext((state) => state.removeFile);
  const workspaces = useGlobalContext((state) => state.workspaces);
  const { uploadFiles, loading: isUploading } = useFileUpload();
  const { loading: workspacesLoading, error: workspacesError, refetch: retryWorkspaces } =
    useWorkspaceList({ showErrorToast: false });
  const {
    data: workspaceTree,
    loading: workspaceTreeLoading,
    error: workspaceTreeError,
    refetch: retryWorkspaceTree,
  } = useWorkspaceTree();

  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const submissionLock = useRef(false);
  const { control, handleSubmit, formState, reset } = useForm<UploadFormValues>({
    resolver: yupResolver(uploadSchema),
    defaultValues: { workspaceId: "" },
    mode: "onChange",
  });
  const { field, fieldState } = useController({ control, name: "workspaceId" });

  const workspaceOptions = useMemo(
    () => (workspaces ?? []).map(({ id, name }) => ({ id, name })),
    [workspaces],
  );
  const selectedWorkspace = workspaceTree?.find((workspace) => workspace.id === field.value);
  const duplicateMatches = useMemo(
    () => findDuplicateUploadMatches(files, selectedWorkspace),
    [files, selectedWorkspace],
  );
  const conflictingTargets = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(selectedTargets).forEach((id) => {
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
  }, [selectedTargets]);
  const hasUnselectedDuplicate = duplicateMatches.some(
    ({ fileId }) => !selectedTargets[fileId],
  );

  useEffect(() => {
    const nextTargets: Record<string, string> = {};
    duplicateMatches.forEach(({ fileId, candidates }) => {
      if (candidates.length === 1) nextTargets[fileId] = candidates[0].id;
    });
    setSelectedTargets(nextTargets);
  }, [duplicateMatches]);

  useEffect(() => {
    if (!open) {
      setSelectedTargets({});
      setFileErrors({});
      reset({ workspaceId: "" });
    }
  }, [open, reset]);

  const processFiles = async (
    workspaceId: string,
    workspaceName: string,
    replacements: Record<string, string>,
  ) => {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setFileErrors({});
    try {
      const outcomes = await uploadFiles({ files, workspaceId, workspaceName, replacements });
      const successfulFileIds: string[] = [];
      const nextErrors: Record<string, string> = {};
      outcomes.forEach((outcome: UploadFileOutcome) => {
        if ("response" in outcome) successfulFileIds.push(outcome.fileId);
        else nextErrors[outcome.fileId] = outcome.error;
      });
      successfulFileIds.forEach(removeFile);
      setFileErrors(nextErrors);
    } finally {
      submissionLock.current = false;
    }
  };

  const submitNewUploads = handleSubmit(async ({ workspaceId }) => {
    const workspaceName = workspaceOptions.find(({ id }) => id === workspaceId)?.name ?? workspaceId;
    await processFiles(workspaceId, workspaceName, {});
  });

  const submitWithReplacements = () => {
    if (!field.value || hasUnselectedDuplicate || conflictingTargets.size > 0) return;
    const workspaceName = workspaceOptions.find(({ id }) => id === field.value)?.name ?? field.value;
    void processFiles(field.value, workspaceName, selectedTargets);
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    field.onChange(workspaceId);
    setFileErrors({});
  };

  const canUpload = formState.isValid && files.length > 0 &&
    !workspacesLoading && !workspaceTreeLoading && !workspacesError && !workspaceTreeError &&
    !isUploading;
  const canConfirmDuplicates = Boolean(field.value) && duplicateMatches.length > 0 &&
    !hasUnselectedDuplicate && conflictingTargets.size === 0 && !isUploading;
  const workspaceLoadError = workspacesError ?? workspaceTreeError;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isUploading && onClose()}>
      <DialogContent className="rounded">
        {duplicateMatches.length > 0 ? (
          <DuplicateFileWarningDialog
            workspaceName={selectedWorkspace?.name ?? field.value}
            matches={duplicateMatches}
            selectedTargets={selectedTargets}
            fileErrors={fileErrors}
            files={files}
            conflictingTargets={conflictingTargets}
            isSubmitting={isUploading}
            canConfirm={canConfirmDuplicates}
            onTargetChange={(fileId, documentId) =>
              setSelectedTargets((previous) => ({ ...previous, [fileId]: documentId }))
            }
            onAccept={submitWithReplacements}
            onCancel={onClose}
          />
        ) : (
          <DialogForm
            onSubmit={(event) => {
              event.preventDefault();
              void submitNewUploads();
            }}
          >
            <DialogHeader>
              <DialogTitle>Files to upload</DialogTitle>
              <DialogDescription>Select a workspace and confirm the files to upload.</DialogDescription>
            </DialogHeader>
            <UploadWorkspaceSelect
              value={field.value}
              onValueChange={handleWorkspaceChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              workspaces={workspaceOptions}
              isLoading={workspacesLoading || workspaceTreeLoading}
              loadError={workspaceLoadError}
              onRetry={workspaceTreeError ? retryWorkspaceTree : retryWorkspaces}
            />
            <ItemGroup className="max-h-60 overflow-y-auto flex flex-col gap-2">
              {files.map((file) => (
                <UploadModalFileItem key={file.id} file={file} errorMessage={fileErrors[file.id]} disabled={isUploading} />
              ))}
            </ItemGroup>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isUploading}>Cancel</Button>
              <Button type="submit" variant="outline" disabled={!canUpload}>
                {isUploading ? "Uploading…" : "Upload"}
              </Button>
            </DialogFooter>
          </DialogForm>
        )}
      </DialogContent>
    </Dialog>
  );
}
