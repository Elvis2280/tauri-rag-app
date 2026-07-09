import { useHistory } from "@/context/HistoryContext";
import { useHistoryWebsocket } from "@/hooks/useHistoryWebsocket";
import FileStatusItem from "./FileStatusItem";

export default function HistorySection() {
  useHistoryWebsocket();
  const entries = useHistory((s) => s.entries);

  return (
    <div className="flex w-full flex-col gap-2 px-4 pt-6">
      <h1 className="text-3xl font-bold mb-2">File Upload History & Status</h1>
      {entries.map((entry) => (
        <FileStatusItem key={entry.file_id} {...entry} />
      ))}
    </div>
  );
}
