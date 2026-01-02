import WorkspaceSelector from "./WorkspaceSelector";
import UserMenu from "./UserMenu";

/**
 * Header component with workspace selector and user menu
 */
export default function DashboardHeader() {
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

        {/* Right side: Workspace selector and user menu */}
        <div className="flex items-center gap-4">
          <WorkspaceSelector />
          <div className="h-6 w-px bg-border" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
