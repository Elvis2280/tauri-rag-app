import { useGlobalContext } from "@/context/GlobalContext";
import { cn } from "@/lib/utils";
import { MessageCircleMore, FileUp, Folders, FileClock } from "lucide-react";
import { Button } from "../ui/button";
import { CurrentPageType } from "@/types/GlobalTypes";
import { useMemo } from "react";

type navItemType = {
  pageName: CurrentPageType;
  icon: React.ReactElement;
};
const NavItemsList = [
  {
    pageName: "chat",
    icon: <MessageCircleMore size={20} />,
  },
  {
    pageName: "upload",
    icon: <FileUp size={20} />,
  },
  {
    pageName: "workspace",
    icon: <Folders size={20} />,
  },

  {
    pageName: "history",
    icon: <FileClock size={20} />,
  },
] as navItemType[];

export default function Layout({ children }: { children: React.ReactNode }) {
  const handleSetPage = useGlobalContext((state) => state.setCurrentPage);
  const currentSelectedPage = useGlobalContext((state) => state.currentPage);

  const navList = useMemo(() => {
    return NavItemsList.map((nav) => (
      <NavItem
        onClick={() => handleSetPage(nav.pageName)}
        iconElement={nav.icon}
        label={nav.pageName}
        isSelected={currentSelectedPage === nav.pageName}
      />
    ));
  }, [currentSelectedPage]);

  return (
    <div className="flex h-screen bg-background">
      <nav className="flex flex-col gap-4 p-2 border-r border-sidebar-border min-w-40 bg-sidebar">
        <h2 className="text-xl font-bold text-center">RAG UI</h2>
        {navList}
      </nav>
      <div className="p-4 w-full">{children}</div>
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
        "flex gap-2 items-center px-2 py-1 rounded cursor-pointer",
        isSelected && "bg-sidebar-accent",
      )}
    >
      {iconElement}
      <span>{label}</span>
    </Button>
  );
};
