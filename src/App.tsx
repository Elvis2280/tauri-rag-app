import { useState } from "react";
import { HashRouter, Routes, Route } from "react-router";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/common/Layout";
import UploadSection from "./components/upload/UploadSection";
import WorkspacePage from "./components/workspace/WorkspacePage";
import HistorySection from "./components/history/HistorySection";
import ChatSection from "./components/chat/ChatSection";
import { useWorkspaceList } from "@/hooks/useWorkspace";
import { useCredential } from "@/hooks/useCredential";
import ApiAccessScreen from "@/components/auth/ApiAccessScreen";
import { getCurrentWindow } from "@tauri-apps/api/window";

function closeCurrentWindow(): void {
  void getCurrentWindow().close();
}

function App() {
  const credential = useCredential();
  const [credentialError, setCredentialError] = useState<string | null>(null);

  if (credential.loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
        aria-label="Loading"
      >
        Checking secure credential store…
      </main>
    );
  }

  if (!credential.configured) {
    return (
      <ApiAccessScreen
        error={credentialError}
        vaultError={credential.error}
        apiBaseUrl={credential.apiBaseUrl}
        onClose={closeCurrentWindow}
        onConfigure={async (apiKey) => {
          setCredentialError(null);
          try {
            await credential.configure(apiKey);
          } catch (error) {
            setCredentialError(
              error instanceof Error
                ? error.message
                : "The API key could not be validated.",
            );
            throw error;
          }
        }}
      />
    );
  }

  return <AuthenticatedApp onClearCredential={() => void credential.clear()} />;
}

function AuthenticatedApp({ onClearCredential }: { onClearCredential: () => void }) {
  useWorkspaceList();

  return (
    <HashRouter>
      <Toaster />
      <Routes>
        <Route
          element={
            <Layout
              onManageCredential={() => {
                onClearCredential();
              }}
            />
          }
        >
          <Route path="/" element={<UploadSection />} />
          <Route path="/upload" element={<UploadSection />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/chat" element={<ChatSection />} />
          <Route path="/history" element={<HistorySection />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
