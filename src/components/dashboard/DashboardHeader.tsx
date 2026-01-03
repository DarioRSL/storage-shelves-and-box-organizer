import WorkspaceSelector from "./WorkspaceSelector";
import UserMenu from "./UserMenu";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import { Plus } from "lucide-react";

/**
 * Header component with workspace selector and user menu
 */
export default function DashboardHeader() {
  const { actions } = useDashboard();

  const handleNavigateToQRGenerator = () => {
    globalThis.location.href = "/app/qr-generator";
  };

  const handleAddBox = () => {
    actions.openBoxEditor("create");
  };

  return (
    <header className="border-b border-border bg-card shadow-sm" role="banner">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary" aria-hidden="true">
            <span className="text-sm font-bold text-primary-foreground">📦</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Organizator Pudełek</h1>
        </div>

        {/* Right side: Actions, workspace selector and user menu */}
        <div className="flex items-center gap-4">
          <Button size="sm" onClick={handleAddBox} className="gap-2" aria-label="Dodaj nowe pudełko">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Dodaj pudełko
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigateToQRGenerator}
            className="gap-2"
            aria-label="Generuj kody QR"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            Generuj QR
          </Button>
          <div className="h-6 w-px bg-border" aria-hidden="true" />
          <WorkspaceSelector />
          <div className="h-6 w-px bg-border" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
