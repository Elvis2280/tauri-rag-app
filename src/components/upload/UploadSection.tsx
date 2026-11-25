import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp } from "lucide-react";
import { useFileContext } from "@/context/FileContext";
import { FILE_STATUS } from "@/types/FileTypes";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import { ACCEPTED_FILE_TYPES } from "@/constants/upload";
import UploadModal from "./UploadModal";

export default function UploadSection() {
  const addFile = useFileContext((state) => state.addFile);
  const clearFiles = useFileContext((state) => state.clearFiles);
  const files = useFileContext((state) => state.files);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (files.length > 0) setIsOpen(true);
    else setIsOpen(false);
  }, [files.length]);

  const closeModal = useCallback(() => {
    clearFiles();
    setIsOpen(false);
  }, [clearFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) =>
      addFile({ id: nanoid(), file, status: FILE_STATUS.FILE_UPLOADED }),
    );
  }, [addFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
  });

  return (
    <div className="h-screen flex justify-center items-center overflow-hidden relative">
      <div
        className={cn(
          "h-1/2 w-1/2 flex flex-col justify-center items-center gap-4 rounded",
          isDragActive && "bg-card",
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
      <UploadModal open={isOpen} onClose={closeModal} />
    </div>
  );
}
