import { Tree, type NodeApi } from "react-arborist";
import { Folder, FolderOpen, FolderTree, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace, WorkspaceTreeItem } from "@/types/WorkspaceTypes";

function getNodeIcon(node: NodeApi<WorkspaceTreeItem>) {
  const data = node.data;
  if (data.type === "workspace") {
    return <FolderTree size={16} className="shrink-0" />;
  }
  if (data.type === "file") {
    return <StickyNote size={16} className="shrink-0" />;
  }
  return node.isOpen ? (
    <FolderOpen size={16} className="shrink-0" />
  ) : (
    <Folder size={16} className="shrink-0" />
  );
}

type RowProps = {
  node: NodeApi<WorkspaceTreeItem>;
  style: React.CSSProperties;
  dragHandle?: (el: HTMLDivElement | null) => void;
};

function WorkspaceNode({ node, style, dragHandle }: RowProps) {
  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={() => node.select()}
      className={cn(
        "flex items-center gap-2 px-1 py-1 text-sm rounded cursor-pointer",
        node.isSelected && "bg-sidebar-accent",
      )}
    >
      {getNodeIcon(node)}
      <span className="truncate">{node.data.name}</span>
    </div>
  );
}

type DirectoryViewerProps = {
  workspaces: Workspace[];
};

export default function DirectoryViewer({ workspaces }: DirectoryViewerProps) {
  const handleActivate = (node: NodeApi<WorkspaceTreeItem>) => {
    if (node.data.type === "file") {
      console.log("open file", { id: node.data.id, name: node.data.name });
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

  return (
    <div className="relative w-full h-full max-h-[calc(100vh-2rem)] p-2">
      <Tree<WorkspaceTreeItem>
        data={workspaces as WorkspaceTreeItem[]}
        openByDefault={false}
        width="100%"
        height={600}
        indent={20}
        rowHeight={28}
        padding={8}
        disableDrag
        disableDrop
        disableEdit
        onActivate={handleActivate}
        onSelect={handleSelect}
      >
        {WorkspaceNode}
      </Tree>
    </div>
  );
}
