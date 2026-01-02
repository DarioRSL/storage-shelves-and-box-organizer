import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";

interface SettingsHeaderProps {
  onBack: () => void;
}

/**
 * Settings page header with back navigation
 */
export function SettingsHeader({ onBack }: SettingsHeaderProps) {
  return (
    <header className="border-b border-border bg-card shadow-sm" role="banner">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo/Title with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-lg"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary" aria-hidden="true">
              <span className="text-sm font-bold text-primary-foreground">⚙️</span>
            </div>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>

        {/* Right side: Empty for now, could add user menu later */}
        <div className="flex items-center gap-4">{/* Future: User menu */}</div>
      </div>
    </header>
  );
}
