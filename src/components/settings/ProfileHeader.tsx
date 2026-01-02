import type { ProfileDto } from "../../types";
import { LogoutButton } from "./LogoutButton";

interface ProfileHeaderProps {
  profile: ProfileDto;
  onLogout: () => Promise<void>;
  isLoggingOut?: boolean;
}

export function ProfileHeader({ profile, onLogout, isLoggingOut = false }: ProfileHeaderProps) {
  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase();

  return (
    <div className="flex items-center justify-between border-b pb-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-semibold text-white">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name || profile.email}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">{profile.full_name || "User"}</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      <LogoutButton onLogout={onLogout} isLoading={isLoggingOut} />
    </div>
  );
}
