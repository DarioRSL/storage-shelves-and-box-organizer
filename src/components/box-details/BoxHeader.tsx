import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface BoxHeaderProps {
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Format ISO date string to localized Polish format
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "Brak daty";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Nieprawidłowa data";
  }
}

/**
 * Calculate relative time (e.g., "2 dni temu")
 */
function getRelativeTime(dateString: string | null): string | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "dzisiaj";
    if (diffDays === 1) return "wczoraj";
    if (diffDays < 7) return `${diffDays} dni temu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tyg. temu`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mies. temu`;
    return `${Math.floor(diffDays / 365)} lat temu`;
  } catch {
    return null;
  }
}

export function BoxHeader({ name, createdAt, updatedAt }: BoxHeaderProps) {
  const createdFormatted = formatDate(createdAt);
  const updatedFormatted = formatDate(updatedAt);
  const updatedRelative = getRelativeTime(updatedAt);

  return (
    <Card>
      <CardHeader className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">{name}</h1>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              <span className="sr-only">Data utworzenia:</span>
              Utworzono: {createdFormatted}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>
              <span className="sr-only">Ostatnia aktualizacja:</span>
              Zaktualizowano: {updatedFormatted}
              {updatedRelative && <span className="text-xs ml-1">({updatedRelative})</span>}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
