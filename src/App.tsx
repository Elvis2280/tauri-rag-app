import { useState } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ApiAccessModal from "@/components/auth/ApiAccessModal";
import ChatSection from "@/components/chat/ChatSection";
import Layout from "@/components/common/Layout";
import HistorySection from "@/components/history/HistorySection";
import { Toaster } from "@/components/ui/sonner";
import UploadSection from "@/components/upload/UploadSection";
import WorkspacePage from "@/components/workspace/WorkspacePage";
import { useApiAccess } from "@/hooks/useApiAccess";
import { useWorkspaceList, workspaceKeys } from "@/hooks/useWorkspace";

function closeCurrentWindow(): void {
  void getCurrentWindow().close();
}

function App() {
  const access = useApiAccess();

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

  if (!access.configured) {
    return (
      <HashRouter>
        <Toaster />
        <Routes>
          <Route path="*" element={<Layout interactive={false} />} />
        </Routes>
        <ApiAccessModal
          open
          required
          serverHost={access.serverHost}
          statusError={access.error}
          onOpenChange={() => undefined}
          onCancelRequired={closeCurrentWindow}
          onSetup={access.setup}
          onUpdateApiKey={access.saveApiKey}
          onUpdateServerHost={access.saveServerHost}
        />
      </HashRouter>
    );
  }

  return <AuthenticatedApp access={access} />;
}

type AuthenticatedAppProps = {
  access: ReturnType<typeof useApiAccess>;
};

function AuthenticatedApp({ access }: AuthenticatedAppProps) {
  const [apiAccessOpen, setApiAccessOpen] = useState(false);
  const queryClient = useQueryClient();
  useWorkspaceList();

  const refreshWorkspaceData = async () => {
    await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
  };

  return (
    <HashRouter>
      <Toaster />
      <Routes>
        <Route
          element={<Layout onManageApiAccess={() => setApiAccessOpen(true)} />}
        >
          <Route path="/" element={<UploadSection />} />
          <Route path="/upload" element={<UploadSection />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/chat" element={<ChatSection />} />
          <Route path="/history" element={<HistorySection />} />
        </Route>
      </Routes>
      <ApiAccessModal
        open={apiAccessOpen}
        serverHost={access.serverHost}
        statusError={access.error}
        onOpenChange={setApiAccessOpen}
        onCancelRequired={closeCurrentWindow}
        onSetup={access.setup}
        onUpdateApiKey={async (apiKey) => {
          await access.saveApiKey(apiKey);
          await refreshWorkspaceData();
          toast.success("API key updated");
        }}
        onUpdateServerHost={async (serverHost) => {
          await access.saveServerHost(serverHost);
          await refreshWorkspaceData();
          toast.success("Server host updated");
        }}
      />
    </HashRouter>
  );
}

export default App;
