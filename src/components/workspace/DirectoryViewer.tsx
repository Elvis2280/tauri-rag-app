import { useEffect, useState } from "react";
import { Tree, type NodeApi } from "react-arborist";
import { Folder, FolderOpen, FolderTree, StickyNote, ArrowDownNarrowWide, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace, WorkspaceTreeItem } from "@/types/WorkspaceTypes";
import { Button } from "../ui/button";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import DeleteWorkspaceModal from "./DeleteWorkspaceModal";
import {
  useCreateWorkspace,
  useDisableWorkspace,
} from "@/hooks/useWorkspace";

function getNodeIcon(node: NodeApi<WorkspaceTreeItem>) {
  const data = node.data;
  if (data.type === "workspace") {
    return <FolderTree size={20} className="shrink-0" />;
  }
  if (data.type === "file") {
    return <StickyNote size={20} className="shrink-0" />;
  }
  return node.isOpen ? (
    <FolderOpen size={20} className="shrink-0" />
  ) : (
    <Folder size={20} className="shrink-0" />
  );
}

type RowProps = {
  node: NodeApi<WorkspaceTreeItem>;
  style: React.CSSProperties;
  dragHandle?: (el: HTMLDivElement | null) => void;
  onDeleteWorkspace?: (workspace: Workspace) => void;
};

function WorkspaceNode({
  node,
  style,
  dragHandle,
  onDeleteWorkspace,
}: RowProps) {
  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={() => node.select()}
      className={cn(
        "flex items-center gap-y-4 gap-x-2 rounded cursor-pointer text-lg h-10",
        node.isSelected && "bg-sidebar-accent",
      )}
    >
      {getNodeIcon(node)}
      <span className="truncate">{node.data.name}</span>
      {node.data.type === "workspace" && (
        <div className="ml-auto">
          <Button
            type="button"
            aria-label={`Delete ${node.data.name}`}
            variant="link"
            className="aspect-square h-6 w-6 rounded-full text-destructive"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (node.data.type === "workspace") {
                onDeleteWorkspace?.(node.data);
              }
            }}
          >
            <Trash aria-hidden="true" className="h-4! w-4!" />
          </Button>
        </div>
      )}
    </div>
  );
}

type DirectoryViewerProps = {
  workspaces: Workspace[];
};

export default function DirectoryViewer({ workspaces }: DirectoryViewerProps) {
  const { createWorkspace, isPending: isCreatingWorkspace } =
    useCreateWorkspace();
  const { disableWorkspace, isPending: isDisablingWorkspace } =
    useDisableWorkspace();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null,
  );
  const [windowHeight, setWindowHeight] = useState<number>(() =>
    window.innerHeight,
  );

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleActivate = (node: NodeApi<WorkspaceTreeItem>) => {
    if (node.data.type === "file") {
      console.log(`open ${node.data.type}`, {
        id: node.data.id,
        name: node.data.name,
      });
      return;
    }
    node.toggle();
  };

  const handleSelect = (nodes: NodeApi<WorkspaceTreeItem>[]) => {
    console.log(
      "selected",
      nodes.map((n) => ({ id: n.id, name: n.data.name, type: n.data.type })),
    );
  };

  const handleDeleteWorkspace = (workspace: Workspace) => {
    setWorkspaceToDelete(workspace);
  };

  const handleCloseDeleteModal = () => {
    setWorkspaceToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (!workspaceToDelete) {
      return;
    }

    void disableWorkspace(workspaceToDelete.id).then(
      handleCloseDeleteModal,
      () => undefined,
    );
  };

  const handleCreateWorkspace = async (name: string) => {
    await createWorkspace({ name });
    setIsCreateWorkspaceOpen(false);
  };

  return (
    <div className="relative w-full h-screen p-2">
      <div className="flex justify-between my-2 items-center">
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateWorkspaceOpen(true)}
          >
            Create Workspace
          </Button>
        </div>
        <div className="text-2xl">
          <Button className="text-2xl" variant={'ghost'}><ArrowDownNarrowWide size={40} className="w-7! h-7!" /></Button>
        </div>
      </div>
      <Tree<WorkspaceTreeItem>
        data={workspaces as WorkspaceTreeItem[]}
        openByDefault={false}
        width="100%"
        height={windowHeight}
        indent={28}
        rowHeight={36}
        padding={8}
        disableDrag
        disableDrop
        disableEdit
        onActivate={handleActivate}
        onSelect={handleSelect}
      >
        {(rowProps) => (
          <WorkspaceNode
            {...rowProps}
            onDeleteWorkspace={handleDeleteWorkspace}
          />
        )}
      </Tree>
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onCreate={handleCreateWorkspace}
        isPending={isCreatingWorkspace}
      />
      <DeleteWorkspaceModal
        isOpen={workspaceToDelete !== null}
        workspaceName={workspaceToDelete?.name ?? ""}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isPending={isDisablingWorkspace}
      />
    </div>
  );
}
