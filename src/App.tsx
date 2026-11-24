import { useState } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfigurationModal from "@/components/configuration/ConfigurationModal";
import ChatSection from "@/components/chat/ChatSection";
import Layout from "@/components/common/Layout";
import HistorySection from "@/components/history/HistorySection";
import { Toaster } from "@/components/ui/sonner";
import UploadSection from "@/components/upload/UploadSection";
import WorkspacePage from "@/components/workspace/WorkspacePage";
import { useApiAccess } from "@/hooks/useApiAccess";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { resetEnvironmentData } from "@/lib/resetEnvironmentData";
import { normalizeNativeError } from "@/lib/axios";
import { API_ACCESS_MESSAGES } from "@/constants/apiAccess";

function closeCurrentWindow(): void {
  void getCurrentWindow().close();
}

function App() {
  const access = useApiAccess();
  const queryClient = useQueryClient();
  const [environmentRevision, setEnvironmentRevision] = useState(0);

  const resetEnvironment = async () => {
    await resetEnvironmentData(queryClient);
    // Remount environment views to discard local selections and document previews.
    setEnvironmentRevision((revision) => revision + 1);
  };

  if (access.loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
        aria-label="Loading"
      >
        Checking secure API access settings…
      </main>
    );
  }

  if (!access.configured || access.setupPending) {
    return (
      <HashRouter>
        <Toaster />
        <Routes>
          <Route path="*" element={<Layout interactive={false} />} />
        </Routes>
        <ConfigurationModal
          open
          required
          serverHost={access.serverHost}
          statusError={access.error}
          onOpenChange={() => undefined}
          onCancelRequired={closeCurrentWindow}
          onSetup={access.setup}
          onUpdateApiKey={access.saveApiKey}
          onUpdateServerHost={access.saveServerHost}
          onValidateAndClose={async () => {
            await resetEnvironment();
            access.finishSetup();
            try {
              const validated = await access.checkSavedAccess();
              if (validated) toast.success(API_ACCESS_MESSAGES.accessCheckSuccess);
            } catch (error) {
              toast.error(
                normalizeNativeError(
                  error,
                  API_ACCESS_MESSAGES.accessCheckFailed,
                ).message,
              );
            }
          }}
        />
      </HashRouter>
    );
  }

  return (
    <AuthenticatedApp
      key={environmentRevision}
      access={access}
      onResetEnvironment={resetEnvironment}
    />
  );
}

type AuthenticatedAppProps = {
  access: ReturnType<typeof useApiAccess>;
  onResetEnvironment: () => Promise<void>;
};

function AuthenticatedApp({ access, onResetEnvironment }: AuthenticatedAppProps) {
  const [configurationOpen, setConfigurationOpen] = useState(false);
  useWorkspaceList();

  return (
    <HashRouter>
      <Toaster />
      <Routes>
        <Route
          element={<Layout onOpenConfiguration={() => setConfigurationOpen(true)} />}
        >
          <Route path="/" element={<UploadSection />} />
          <Route path="/upload" element={<UploadSection />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/chat" element={<ChatSection />} />
          <Route path="/history" element={<HistorySection />} />
        </Route>
      </Routes>
      <ConfigurationModal
        open={configurationOpen}
        serverHost={access.serverHost}
        statusError={access.error}
        onOpenChange={setConfigurationOpen}
        onCancelRequired={closeCurrentWindow}
        onSetup={access.setup}
        onUpdateApiKey={async (apiKey) => {
          await access.saveApiKey(apiKey);
        }}
        onUpdateServerHost={async (serverHost) => {
          await access.saveServerHost(serverHost);
        }}
        onValidateAndClose={async () => {
          setConfigurationOpen(false);
          try {
            await onResetEnvironment();
            const validated = await access.checkSavedAccess();
            if (!validated) return;
            toast.success(API_ACCESS_MESSAGES.accessCheckSuccess);
          } catch (error) {
            toast.error(
              normalizeNativeError(
                error,
                API_ACCESS_MESSAGES.accessCheckFailed,
              ).message,
            );
          }
        }}
      />
    </HashRouter>
  );
}

export default App;
