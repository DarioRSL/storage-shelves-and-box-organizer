import type { BoxLocationSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationBreadcrumbsProps {
  location?: BoxLocationSummary | null;
}

interface BreadcrumbItem {
  name: string;
  level: number;
  isLast: boolean;
}

/**
 * Parse ltree path string into breadcrumb items
 * Path format: "root.basement.shelf_a" -> ["root", "basement", "shelf_a"]
 */
function parsePath(path: string | undefined): BreadcrumbItem[] {
  if (!path) return [];

  const segments = path.split(".");
  return segments.map((segment, index) => ({
    name: segment.replace(/_/g, " "), // Replace underscores with spaces for display
    level: index,
    isLast: index === segments.length - 1,
  }));
}

export function LocationBreadcrumbs({ location }: LocationBreadcrumbsProps) {
  // Handle unassigned location
  if (!location) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Lokalizacja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">Pudełko nie ma przypisanej lokalizacji</p>
        </CardContent>
      </Card>
    );
  }

  const breadcrumbs = parsePath(location.path);

  // If no path but location exists, show just the name
  if (breadcrumbs.length === 0 && location.name) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Lokalizacja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-foreground font-medium">{location.name}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Lokalizacja
        </CardTitle>
      </CardHeader>
      <CardContent>
        <nav aria-label="Ścieżka lokalizacji">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center">
                <span
                  className={item.isLast ? "font-medium text-foreground" : "text-muted-foreground"}
                  aria-current={item.isLast ? "page" : undefined}
                >
                  {item.name}
                </span>
                {!item.isLast && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mx-1 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </CardContent>
    </Card>
  );
}
