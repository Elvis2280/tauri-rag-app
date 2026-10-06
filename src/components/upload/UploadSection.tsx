import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useController, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FileUp } from 'lucide-react';
import { useFileContext } from '@/context/FileContext';
import { FILE_STATUS } from '@/types/FileTypes';
import useFileUpload from '@/hooks/useFileUpload';
import { useWorkspaceList, useWorkspaceTree } from '@/hooks/useWorkspace';
import { useGlobalContext } from '@/context/GlobalContext';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { ACCEPTED_FILE_TYPES } from '@/constants/upload';
import { findDuplicateUploadFiles } from '@/lib/upload';
import type { FileUploadType } from '@/types/FileTypes';
import UploadModal from './UploadModal';

type acceptedFilesType = File[];

const uploadSchema = yup.object({
  workspaceId: yup
    .string()
    .min(1, 'Please select a workspace')
    .required('Please select a workspace'),
});

type UploadFormValues = yup.InferType<typeof uploadSchema>;

export default function UploadSection() {
  const addFileToContext = useFileContext((state) => state.addFile);
  const clearFiles = useFileContext((state) => state.clearFiles);
  const fileList = useFileContext((state) => state.files);

  const { uploadFiles } = useFileUpload();
  const { loading: workspacesLoading, error: workspacesError } =
    useWorkspaceList({ showErrorToast: false });
  const {
    data: workspaceTree,
    loading: workspaceTreeLoading,
    error: workspaceTreeError,
    refetch: refetchWorkspaceTree,
  } = useWorkspaceTree();
  const workspaces = useGlobalContext((state) => state.workspaces);

  const workspaceOptions = useMemo(
    () => (workspaces ?? []).map((w) => ({ id: w.id, name: w.name })),
    [workspaces],
  );

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [duplicateFiles, setDuplicateFiles] = useState<FileUploadType[]>([]);
  const [duplicateWorkspaceName, setDuplicateWorkspaceName] = useState('');

  const { control, handleSubmit, formState, reset } = useForm<UploadFormValues>(
    {
      resolver: yupResolver(uploadSchema),
      defaultValues: { workspaceId: '' },
      mode: 'onChange',
    },
  );
  const { field, fieldState } = useController({
    control,
    name: 'workspaceId',
  });

  useEffect(() => {
    if (fileList.length > 0) {
      setIsOpen(true);
    }
  }, [fileList.length]);

  useEffect(() => {
    if (fileList.length === 0) {
      setIsOpen(false);
      setDuplicateFiles([]);
      setDuplicateWorkspaceName('');
      reset({ workspaceId: '' });
    }
  }, [fileList.length, reset]);

  const handleClose = useCallback(() => {
    clearFiles();
    setIsOpen(false);
    setDuplicateFiles([]);
    setDuplicateWorkspaceName('');
    reset({ workspaceId: '' });
  }, [clearFiles, reset]);

  const onSubmit = handleSubmit((values) => {
    const files = fileList.map((f) => f.file);
    void uploadFiles({ files, workspaceId: values.workspaceId });
    clearFiles();
    setIsOpen(false);
    setDuplicateFiles([]);
    setDuplicateWorkspaceName('');
    reset({ workspaceId: '' });
  });

  const onWorkspaceChange = (workspaceId: string) => {
    field.onChange(workspaceId);
    const workspace = workspaceTree?.find(
      (candidate) => candidate.id === workspaceId,
    );

    const duplicates = findDuplicateUploadFiles(fileList, workspace);

    if (duplicates.length === 0) {
      setDuplicateFiles([]);
      setDuplicateWorkspaceName('');
      return;
    }

    setDuplicateFiles(duplicates);
    setDuplicateWorkspaceName(
      workspace?.name ??
        workspaceOptions.find((option) => option.id === workspaceId)?.name ??
        workspaceId,
    );
  };

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
  });

  return (
    <div className="h-screen flex justify-center items-center overflow-hidden relative">
      <div
        className={cn(
          'h-1/2 w-1/2 flex flex-col justify-center items-center gap-4 rounded',
          isDragActive && 'bg-card',
        )}
        {...getRootProps()}
      >
        <div className="text-input neon-sun-glow bg-primary/10 rounded-full aspect-square size-24 flex justify-center items-center">
          <FileUp size={52} className="text-primary" />
        </div>
        <input {...getInputProps()} />
        <p className="text-4xl mt-4 font-bold">File Upload</p>
        <p className="text-md text-muted-foreground text-center">
          Add any documents type to your workspace to memorize them !
        </p>
      </div>
      <UploadModal
        isOpen={isOpen}
        onClose={handleClose}
        onUpload={onSubmit}
        files={fileList}
        workspaceId={field.value}
        onWorkspaceChange={onWorkspaceChange}
        onWorkspaceBlur={field.onBlur}
        workspaceError={fieldState.error?.message}
        canUpload={formState.isValid && duplicateFiles.length === 0}
        workspaces={workspaceOptions}
        workspacesLoading={workspacesLoading}
        workspacesError={workspacesError}
        workspaceTreeLoading={workspaceTreeLoading}
        workspaceTreeError={workspaceTreeError}
        onRetryWorkspaceTree={refetchWorkspaceTree}
        duplicateFileNames={[
          ...new Set(duplicateFiles.map(({ file }) => file.name)),
        ]}
        duplicateWorkspaceName={duplicateWorkspaceName}
        onUploadAnyway={() => {
          setDuplicateFiles([]);
          setDuplicateWorkspaceName('');
        }}
        onCancelDuplicateUpload={handleClose}
      />
    </div>
  );
}
