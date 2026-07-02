import { useDropzone } from "react-dropzone";
import { useCallback } from "react";
import { Upload } from "lucide-react";
import UploadAnimations from "./UploadAnimations";
import { useFileContext } from "@/context/FileContext";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";

type acceptedFilesType = File[];

export default function UploadSection() {
  const addFileToContext = useFileContext((state) => state.addFile);
  const removeFileToContext = useFileContext((state) => state.removeFile);
  const fileList = useFileContext((state) => state.files);
  const onDrop = useCallback((acceptedFiles: acceptedFilesType) => {
    acceptedFiles.forEach((f) =>
      addFileToContext({
        id: nanoid(),
        file: f,
        status: "uploading",
      }),
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
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
        <div className="text-input">
          <Upload size={100} />
        </div>
        <input {...getInputProps()} />

        <p className="text-lg">Drop the files here</p>
      </div>
      <div className="absolute right-0 z-0">
        <div className="flex flex-col gap-2 bg-background h-3/4 overflow-y-scroll [mask-image:linear-gradient(to_bottom,transparent_0%,#000_8%,#000_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_8%,#000_92%,transparent_100%)]">
          <UploadAnimations files={fileList} onRemove={removeFileToContext} />
        </div>
      </div>
    </div>
  );
}
