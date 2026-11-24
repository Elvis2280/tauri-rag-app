import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CONFIGURATION_LABELS } from "@/constants/configuration";
import { openLogsFolder } from "@/lib/errorLogging";

export default function LogsConfiguration() {
  const handleOpenLogsFolder = async () => {
    try {
      await openLogsFolder();
    } catch {
      toast.error(CONFIGURATION_LABELS.logsFolderError);
    }
  };

  return (
    <section
      aria-labelledby="logs-configuration-title"
      className="space-y-3 rounded border border-border bg-card p-4"
    >
      <h2 id="logs-configuration-title" className="font-heading text-base font-semibold">
        {CONFIGURATION_LABELS.logsCategory}
      </h2>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {CONFIGURATION_LABELS.logsDescription}
        </p>
        <Button type="button" variant="outline" onClick={() => void handleOpenLogsFolder()}>
          <FolderOpen aria-hidden="true" />
          {CONFIGURATION_LABELS.openLogsFolder}
        </Button>
      </div>
    </section>
  );
}
