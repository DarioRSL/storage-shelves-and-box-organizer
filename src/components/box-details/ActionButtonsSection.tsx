import { Button } from "@/components/ui/button";

interface ActionButtonsSectionProps {
  boxId: string;
  onDeleteClick: () => void;
  isDeleting?: boolean;
}

export function ActionButtonsSection({ boxId, onDeleteClick, isDeleting = false }: ActionButtonsSectionProps) {
  const handleEditClick = () => {
    window.location.href = `/app/boxes/${boxId}/edit`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
      {/* Edit Button */}
      <Button variant="default" onClick={handleEditClick} disabled={isDeleting} className="gap-2">
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
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Edytuj pudełko
      </Button>

      {/* Delete Button */}
      <Button variant="destructive" onClick={onDeleteClick} disabled={isDeleting} className="gap-2">
        {isDeleting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Usuwanie...
          </>
        ) : (
          <>
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Usuń pudełko
          </>
        )}
      </Button>
    </div>
  );
}
