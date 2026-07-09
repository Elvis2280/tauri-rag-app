import { HashRouter, Routes, Route } from "react-router";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/common/Layout";
import UploadSection from "./components/upload/UploadSection";
import WorkspacePage from "./components/workspace/WorkspacePage";
import HistorySection from "./components/history/HistorySection";

function App() {
  return (
    <HashRouter>
      <Toaster />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<UploadSection />} />
          <Route path="/upload" element={<UploadSection />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route
            path="/chat"
            element={<div className="p-4">Chat (todo)</div>}
          />
          <Route path="/history" element={<HistorySection />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
