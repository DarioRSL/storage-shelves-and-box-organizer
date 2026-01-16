import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TagsDisplayProps {
  tags?: string[] | null;
}

export function TagsDisplay({ tags }: TagsDisplayProps) {
  const hasTags = tags && tags.length > 0;

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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          Tagi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasTags ? (
          <ul className="flex flex-wrap gap-2" aria-label="Lista tagów">
            {tags.map((tag, index) => (
              <li key={index}>
                <Badge variant="secondary" className="text-sm">
                  {tag}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground italic">Brak tagów</p>
        )}
      </CardContent>
    </Card>
  );
}
