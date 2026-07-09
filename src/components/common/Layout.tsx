import { cn } from "@/lib/utils";
import { MessageCircleMore, FileUp, Folders, FileClock } from "lucide-react";
import { Button } from "../ui/button";
import { CurrentPageType } from "@/types/GlobalTypes";
import { useLocation, useNavigate, Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { useMemo } from "react";

type navItemType = {
  path: string;
  pageName: CurrentPageType;
  icon: React.ReactElement;
};

const NavItemsList: navItemType[] = [
  { path: "/chat", pageName: "chat", icon: <MessageCircleMore size={20} /> },
  { path: "/upload", pageName: "upload", icon: <FileUp size={20} /> },
  { path: "/workspace", pageName: "workspace", icon: <Folders size={20} /> },
  { path: "/history", pageName: "history", icon: <FileClock size={20} /> },
];

const pathToPage: Record<string, CurrentPageType> = {
  "/": "upload",
  "/chat": "chat",
  "/upload": "upload",
  "/workspace": "workspace",
  "/history": "history",
};

export default function Layout() {
  const navigate = useNavigate();
  const currentSelectedPage = pathToPage[useLocation().pathname] ?? "upload";

  const navList = useMemo(() => {
    return NavItemsList.map((nav) => (
      <NavItem
        key={nav.path}
        onClick={() => navigate(nav.path)}
        iconElement={nav.icon}
        label={nav.pageName}
        isSelected={currentSelectedPage === nav.pageName}
      />
    ));
  }, [currentSelectedPage, navigate]);

  return (
    <div className="flex h-screen bg-background w-full">
      {/* Sidebar Navigation */}
      <nav className="flex flex-col gap-4 p-2 border-r border-sidebar-border min-w-40 bg-sidebar h-full">
        <h2 className="text-xl font-bold text-center">RAG UI</h2>
        {navList}
      </nav>

      {/* Main Content Window */}
      <main className="flex-1 h-full overflow-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

interface NavItemProps {
  iconElement: React.ReactNode;
  label: string;
  isSelected?: boolean;
  onClick: () => void;
}

const NavItem = ({ iconElement, label, isSelected, onClick }: NavItemProps) => {
  return (
    <Button
      variant={"ghost"}
      onClick={onClick}
      className={cn(
        "flex gap-2 items-center px-2 py-1 rounded cursor-pointer justify-start w-full",
        isSelected && "bg-sidebar-accent",
      )}
    >
      {iconElement}
      <span className="capitalize">{label}</span>
    </Button>
  );
};
