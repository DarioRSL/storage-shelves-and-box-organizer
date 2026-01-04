import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DescriptionSectionProps {
  description?: string | null;
}

export function DescriptionSection({ description }: DescriptionSectionProps) {
  const hasDescription = description && description.trim().length > 0;

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Opis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasDescription ? (
          <p
            className="text-foreground whitespace-pre-wrap break-words leading-relaxed"
            aria-label="Opis zawartości pudełka"
          >
            {description}
          </p>
        ) : (
          <p className="text-muted-foreground italic">Brak opisu</p>
        )}
      </CardContent>
    </Card>
  );
}
