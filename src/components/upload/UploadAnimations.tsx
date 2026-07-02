import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AttachmentStatus from "./AttachmentStatus";
import { FileUploadType } from "@/types/FileTypes";

interface UploadAnimationsProps {
  files: FileUploadType[];
  onRemove: (id: string) => void;
}

export default function UploadAnimations({
  files,
  onRemove,
}: UploadAnimationsProps) {
  const shouldReduceMotion = useReducedMotion();

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };

  return (
    <AnimatePresence initial={false}>
      {files.map((fileContainer) => (
        <motion.div
          key={fileContainer.id}
          layout
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={transition}
        >
          <AttachmentStatus
            status={fileContainer.status}
            file={fileContainer.file}
            onRemove={() => onRemove(fileContainer.id)}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
