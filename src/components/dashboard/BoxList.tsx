import { useDashboard } from "@/contexts/DashboardContext";
import BoxListItem from "./BoxListItem";

/**
 * Virtualized box list component
 * Renders boxes with optional virtualization for performance with large datasets
 */
export default function BoxList() {
  const { state } = useDashboard();

  // TODO: Implement react-window virtualization for large lists (100+ items)
  // For now, render all items (fine for typical use cases)

  return (
    <div className="h-full overflow-y-auto" role="list" aria-label="Lista pudełek">
      <div className="divide-y divide-gray-200">
        {state.boxes.map((box) => (
          <div key={box.id} role="listitem">
            <BoxListItem box={box} />
          </div>
        ))}
      </div>
    </div>
  );
}
