import { statusFileType } from "@/types/FileTypes";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "../ui/attachment";
import { FileUp, X } from "lucide-react";

interface AttachmentStatusProps {
  status: statusFileType;
  file: File;
  onRemove: () => void;
}

export default function AttachmentStatus({
  status,
  file,
  onRemove,
}: AttachmentStatusProps) {
  switch (status) {
    case "uploading":
      return (
        <StatusComponent
          icon={<FileUp />}
          title="Uploading File"
          description={`${file?.name} - ${file?.size}`}
          onCloseStatus={onRemove}
        />
      );
    default:
      break;
  }
}

interface StatusComponentProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onCloseStatus: () => void;
}
const StatusComponent = ({
  icon,
  title,
  description,
  onCloseStatus,
}: StatusComponentProps) => {
  return (
    <Attachment state="idle" className="w-full">
      <AttachmentMedia>{icon}</AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{title}</AttachmentTitle>
        <AttachmentDescription>{description}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction
          onClick={onCloseStatus}
          aria-label="Remove selected-file.pdf"
        >
          <X />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
};
