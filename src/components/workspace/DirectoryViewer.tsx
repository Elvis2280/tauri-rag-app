import { useEffect, useRef, useState } from 'react';
import { Tree, type NodeApi } from 'react-arborist';
import {
  Folder,
  FolderOpen,
  FolderTree,
  StickyNote,
  ArrowDownNarrowWide,
  Trash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Workspace,
  WorkspaceFileNode,
  WorkspaceTreeItem,
} from '@/types/WorkspaceTypes';
import {
  dispatchWorkspaceFileOpen,
  getWorkspaceFileOpenAction,
} from '@/lib/workspaceFileActions';
import { Button } from '../ui/button';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import DeleteWorkspaceModal from './DeleteWorkspaceModal';
import { useCreateWorkspace, useDisableWorkspace } from '@/hooks/useWorkspace';
import { useDocumentPdf } from '@/hooks/useDocument';
import PdfViewerDialog, { type LoadedPdf } from './PdfViewerDialog';

function getWorkspaceTreeItemId(item: WorkspaceTreeItem): string {
  return `${item.type}:${item.id}`;
}

function canOpenPdf(item: WorkspaceTreeItem): boolean {
  return (
    item.type === 'file' &&
    getWorkspaceFileOpenAction(item) === 'pdf' &&
    item.id.trim().length > 0
  );
}

function getNodeIcon(node: NodeApi<WorkspaceTreeItem>) {
  const data = node.data;
  if (data.type === 'workspace') {
    return <FolderTree size={20} className="shrink-0" />;
  }
  if (data.type === 'file') {
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
  const canOpenPdfFile = canOpenPdf(node.data);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canOpenPdfFile) {
      return;
    }

    event.stopPropagation();
    node.select();
    node.activate();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenPdfFile || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    node.select();
    node.activate();
  };

  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={canOpenPdfFile ? 'button' : undefined}
      tabIndex={canOpenPdfFile ? 0 : undefined}
      aria-label={canOpenPdfFile ? `Open ${node.data.name}` : undefined}
      className={cn(
        'flex items-center gap-y-4 gap-x-2 rounded cursor-pointer text-lg h-10',
        node.isSelected && 'bg-sidebar-accent',
      )}
    >
      {getNodeIcon(node)}
      <span className="truncate">{node.data.name}</span>
      {node.data.type === 'workspace' && (
        <div className="ml-auto">
          <Button
            type="button"
            aria-label={`Delete ${node.data.name}`}
            variant="link"
            className="aspect-square h-6 w-6 rounded-full text-destructive"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (node.data.type === 'workspace') {
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
  const {
    loadPdf,
    savePdf,
    isPending: isDocumentPending,
    isSaving: isDocumentSaving,
  } = useDocumentPdf();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null,
  );
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [requestedPdfName, setRequestedPdfName] = useState<string | null>(null);
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [hasPdfDownloadError, setHasPdfDownloadError] = useState(false);
  const pdfRequestSequence = useRef(0);
  const [windowHeight, setWindowHeight] = useState<number>(
    () => window.innerHeight,
  );

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleOpenPdf = (file: WorkspaceFileNode) => {
    const documentId = file.id.trim();
    if (!documentId || getWorkspaceFileOpenAction(file) !== 'pdf') {
      return;
    }

    const requestSequence = pdfRequestSequence.current + 1;
    pdfRequestSequence.current = requestSequence;
    setRequestedPdfName(file.name);
    setHasPdfDownloadError(false);
    setIsPdfDialogOpen(true);
    setIsPdfLoading(true);

    void loadPdf(documentId)
      .then((data) => {
        if (pdfRequestSequence.current !== requestSequence) {
          return;
        }

        setLoadedPdf({
          documentId,
          name: file.name,
          data,
        });
        setHasPdfDownloadError(false);
      })
      .catch(() => {
        if (pdfRequestSequence.current === requestSequence) {
          setHasPdfDownloadError(true);
        }
      })
      .finally(() => {
        if (pdfRequestSequence.current === requestSequence) {
          setIsPdfLoading(false);
        }
    });
  };

  const handleOpenMarkdown = () => {};
  const handleOpenImage = () => {};

  const handleActivate = (node: NodeApi<WorkspaceTreeItem>) => {
    if (node.data.type === 'file') {
      dispatchWorkspaceFileOpen(node.data, {
        pdf: handleOpenPdf,
        markdown: handleOpenMarkdown,
        image: handleOpenImage,
      });
      return;
    }

    node.toggle();
  };

  const handleDownloadPdf = () => {
    if (!loadedPdf) {
      return;
    }

    void savePdf({ name: loadedPdf.name, data: loadedPdf.data });
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
          <Button className="text-2xl" variant={'ghost'}>
            <ArrowDownNarrowWide size={40} className="w-7! h-7!" />
          </Button>
        </div>
      </div>
      <Tree<WorkspaceTreeItem>
        data={workspaces as WorkspaceTreeItem[]}
        idAccessor={getWorkspaceTreeItemId}
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
        workspaceName={workspaceToDelete?.name ?? ''}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isPending={isDisablingWorkspace}
      />
      <PdfViewerDialog
        open={isPdfDialogOpen}
        requestedName={requestedPdfName}
        pdf={loadedPdf}
        isLoading={isPdfLoading || isDocumentPending}
        hasDownloadError={hasPdfDownloadError}
        onDownload={handleDownloadPdf}
        isDownloading={isDocumentSaving}
        onOpenChange={setIsPdfDialogOpen}
      />
    </div>
  );
}
