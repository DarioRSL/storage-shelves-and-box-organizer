import React from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import type { BoxListItem as BoxListItemType } from "@/components/hooks/useBoxes";

interface BoxListItemProps {
  box: BoxListItemType;
}

/**
 * Single box list item component
 * Shows box details with context menu for actions
 */
export default function BoxListItem({ box }: BoxListItemProps) {
  const { actions } = useDashboard();

  const handleEdit = () => {
    actions.openBoxEditor("edit", box.id);
  };

  const handleDelete = () => {
    actions.openDeleteConfirm("box", box.id, box.name);
  };

  const location = box.location ? `${box.location.name}` : "Bez lokalizacji";

  const tagsDisplay =
    box.tags && box.tags.length > 0 ? box.tags.slice(0, 2).join(", ") + (box.tags.length > 2 ? `...` : "") : null;

  return (
    <article className="group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors focus-within:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset rounded-lg">
      {/* Box info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{box.name}</h3>
            <div className="mt-1 flex flex-col gap-1 text-xs text-gray-500">
              <p aria-label={`Lokalizacja: ${location}`}>{location}</p>
              {box.description && (
                <p className="line-clamp-1 text-gray-600" aria-label={`Opis: ${box.description}`}>
                  {box.description}
                </p>
              )}
              {tagsDisplay && (
                <p className="text-gray-600" aria-label={`Tagi: ${tagsDisplay}`}>
                  {tagsDisplay}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR code */}
      {box.qr_code && (
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-mono text-gray-600" aria-label={`Kod QR: ${box.qr_code.short_id}`}>
            {box.qr_code.short_id}
          </p>
        </div>
      )}

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={`Opcje dla pudełka ${box.name}`}
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer gap-2">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Szczegóły</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit} className="cursor-pointer gap-2">
            <Edit2 className="h-4 w-4" aria-hidden="true" />
            <span>Edytuj</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="cursor-pointer gap-2 text-red-600">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Usuń</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}
