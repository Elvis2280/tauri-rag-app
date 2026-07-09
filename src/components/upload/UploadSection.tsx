import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Upload } from "lucide-react";
import { useFileContext } from "@/context/FileContext";
import { FILE_STATUS } from "@/types/FileTypes";
import useFileUpload from "@/hooks/useFileUpload";
import useWorkspaceTree from "@/hooks/useWorkspaceTree";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import UploadModal from "./UploadModal";

type acceptedFilesType = File[];

const uploadSchema = yup.object({
  workspaceId: yup
    .string()
    .min(1, "Please select a workspace")
    .required("Please select a workspace"),
});

type UploadFormValues = yup.InferType<typeof uploadSchema>;

export default function UploadSection() {
  const addFileToContext = useFileContext((state) => state.addFile);
  const clearFiles = useFileContext((state) => state.clearFiles);
  const fileList = useFileContext((state) => state.files);

  const { uploadFiles } = useFileUpload();
  const {
    data: workspaces,
    loading: workspacesLoading,
    error: workspacesError,
  } = useWorkspaceTree();

  const workspaceOptions = useMemo(
    () => (workspaces ?? []).map((w) => ({ id: w.id, name: w.name })),
    [workspaces],
  );

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const { control, handleSubmit, formState, reset } = useForm<UploadFormValues>({
    resolver: yupResolver(uploadSchema),
    defaultValues: { workspaceId: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (fileList.length > 0) {
      setIsOpen(true);
    }
  }, [fileList.length]);

  useEffect(() => {
    if (fileList.length === 0) {
      setIsOpen(false);
      reset({ workspaceId: "" });
    }
  }, [fileList.length, reset]);

  const handleClose = useCallback(() => {
    clearFiles();
    setIsOpen(false);
    reset({ workspaceId: "" });
  }, [clearFiles, reset]);

  const onSubmit = handleSubmit((values) => {
    const files = fileList.map((f) => f.file);
    void uploadFiles({ files, workspaceId: values.workspaceId });
    clearFiles();
    setIsOpen(false);
    reset({ workspaceId: "" });
  });

  const onDrop = useCallback(
    (acceptedFiles: acceptedFilesType) => {
      acceptedFiles.forEach((f) =>
        addFileToContext({
          id: nanoid(),
          file: f,
          status: FILE_STATUS.FILE_UPLOADED,
        }),
      );
    },
    [addFileToContext],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="h-screen flex justify-center items-center overflow-hidden relative">
      <div
        className={cn(
          "h-1/2 w-1/2 flex flex-col justify-center items-center gap-4 rounded",
          isDragActive && "bg-card",
        )}
        {...getRootProps()}
      >
        <div className="text-input">
          <Upload size={100} />
        </div>
        <input {...getInputProps()} />
        <p className="text-lg">Drop the files here</p>
      </div>
      <Controller
        control={control}
        name="workspaceId"
        render={({ field, fieldState }) => (
          <UploadModal
            isOpen={isOpen}
            onClose={handleClose}
            onUpload={onSubmit}
            files={fileList}
            workspaceId={field.value}
            onWorkspaceChange={field.onChange}
            onWorkspaceBlur={field.onBlur}
            workspaceError={fieldState.error?.message}
            canUpload={formState.isValid}
            workspaces={workspaceOptions}
            workspacesLoading={workspacesLoading}
            workspacesError={workspacesError}
          />
        )}
      />
    </div>
  );
}
