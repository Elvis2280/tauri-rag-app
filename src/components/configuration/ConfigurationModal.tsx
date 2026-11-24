import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONFIGURATION_LABELS } from "@/constants/configuration";
import ConnectionConfiguration from "./ConnectionConfiguration";
import LlmModelsConfiguration from "./LlmModelsConfiguration";
import LogsConfiguration from "./LogsConfiguration";

export type ConfigurationModalProps = {
  open: boolean;
  required?: boolean;
  serverHost: string;
  statusError?: string | null;
  onOpenChange: (open: boolean) => void;
  onCancelRequired: () => void;
  onSetup: (apiKey: string, serverHost: string) => Promise<void>;
  onUpdateApiKey: (apiKey: string) => Promise<void>;
  onUpdateServerHost: (serverHost: string) => Promise<void>;
  onValidateAndClose: () => Promise<void>;
};

export default function ConfigurationModal({
  open,
  required = false,
  serverHost,
  statusError,
  onOpenChange,
  onCancelRequired,
  onSetup,
  onUpdateApiKey,
  onUpdateServerHost,
  onValidateAndClose,
}: ConfigurationModalProps) {
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  const closeModal = () => {
    if (busy || closing) return;
    setClosing(true);
    onOpenChange(false);
    void onValidateAndClose().finally(() => setClosing(false));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeModal();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded sm:max-w-2xl"
        showCloseButton={!required && !busy && !closing}
        onEscapeKeyDown={(event) => {
          if (required || busy || closing) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (required || busy || closing) event.preventDefault();
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>{CONFIGURATION_LABELS.title}</DialogTitle>
          <DialogDescription>
            {required
              ? CONFIGURATION_LABELS.requiredDescription
              : CONFIGURATION_LABELS.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <ConnectionConfiguration
            open={open}
            required={required}
            serverHost={serverHost}
            statusError={statusError}
            onBusyChange={setBusy}
            onCancelRequired={onCancelRequired}
            onRequestClose={closeModal}
            onSetup={onSetup}
            onUpdateApiKey={onUpdateApiKey}
            onUpdateServerHost={onUpdateServerHost}
          />
          {!required && (
            <>
              <LlmModelsConfiguration />
              <LogsConfiguration />
            </>
          )}
        </div>

        {!required && (
          <DialogFooter>
            <Button type="button" disabled={busy || closing} onClick={closeModal}>
              {CONFIGURATION_LABELS.done}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
