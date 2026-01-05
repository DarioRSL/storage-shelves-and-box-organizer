import { useStore } from "@nanostores/react";
import { userProfile } from "@/stores/dashboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User } from "lucide-react";
import { log } from "@/lib/services/logger";

/**
 * User menu with profile options and logout
 */
export default function UserMenu() {
  const $userProfile = useStore(userProfile);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/session", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/auth";
      }
    } catch (err) {
      log.error("UserMenu logout error", { error: err });
    }
  };

  const userInitial = $userProfile?.email?.[0]?.toUpperCase() || "U";
  const userName = $userProfile?.full_name || "Użytkownik";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={`Menu użytkownika: ${userName}`}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {userInitial}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-gray-500">{$userProfile?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2" aria-label="Przejdź do profilu">
          <User className="h-4 w-4" aria-hidden="true" />
          <span>Profil</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          aria-label="Otwórz ustawienia"
          onClick={() => (window.location.href = "/settings")}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          <span>Ustawienia</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
          aria-label="Wyloguj się"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Wyloguj</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
