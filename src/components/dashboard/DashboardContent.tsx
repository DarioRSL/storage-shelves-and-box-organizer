import SearchInput from "./SearchInput";
import LocationTree from "./LocationTree";
import BoxListContainer from "./BoxListContainer";

/**
 * Main dashboard content with two-column layout
 * Left: Search + Location tree
 * Right: Box list
 */
export default function DashboardContent() {
  return (
    <div className="flex h-[calc(100vh-73px)] bg-gray-50">
      {/* Left panel: Search and Location tree */}
      <aside
        className="w-80 border-r border-gray-200 bg-white p-4 overflow-y-auto"
        role="navigation"
        aria-label="Filtry i nawigacja"
      >
        <SearchInput />
        <div className="mt-6">
          <LocationTree />
        </div>
      </aside>

      {/* Right panel: Box list */}
      <main className="flex-1 overflow-hidden" role="main" aria-label="Lista pudełek">
        <BoxListContainer />
      </main>
    </div>
  );
}
