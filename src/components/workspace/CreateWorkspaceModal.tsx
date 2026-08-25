import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const createWorkspaceSchema = yup.object({
  name: yup.string().trim().required("Please enter a workspace name"),
});

type CreateWorkspaceFormValues = yup.InferType<typeof createWorkspaceSchema>;

type CreateWorkspaceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  isPending: boolean;
};

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreate,
  isPending,
}: CreateWorkspaceModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceFormValues>({
    resolver: yupResolver(createWorkspaceSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ name: "" });
    }
  }, [isOpen, reset]);

  const handleFormSubmit = handleSubmit((values) => {
    void onCreate(values.name).catch(() => undefined);
  });

  const handleCancel = () => {
    reset({ name: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="rounded">
        <DialogForm onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new workspace</DialogTitle>
            <DialogDescription>
              This workspace will store your files as memory, so you can ask
              questions about them later.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <label htmlFor="workspace-name" className="text-sm font-medium">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              autoFocus
              aria-describedby={errors.name ? "workspace-name-error" : undefined}
              aria-invalid={errors.name ? "true" : "false"}
              className="h-10 border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 rounded"
              {...register("name")}
            />
            {errors.name && (
              <p id="workspace-name-error" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
