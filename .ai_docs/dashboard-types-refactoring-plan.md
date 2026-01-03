# Plan: Refaktoryzacja Typów Dashboard

## Podsumowanie

Centralizacja typów Dashboard z rozproszonych lokalizacji do `src/types.ts` zgodnie z wzorcem użytym dla Settings i QR Generator.

**Status:** ⏳ Oczekuje na implementację (po Box Details i Box Form views)

---

## 1. Typy do Przeniesienia

| Typ | Obecna Lokalizacja | Linie | Problem |
|-----|-------------------|-------|---------|
| `DashboardState` | `src/contexts/DashboardContext.tsx` | 14-51 | Zawiera `any[]` zamiast właściwych typów |
| `LocationTreeNode` | `src/components/hooks/useLocations.ts` | 8-14 | Extends `LocationDto` |
| `BoxListItem` | `src/components/hooks/useBoxes.ts` | 9-13 | Extends `BoxDto` |

---

## 2. Nowe Typy do Dodania

| Typ | Cel | Użycie |
|-----|-----|--------|
| `EmptyStateType` | Union type dla wariantów empty state | `EmptyState.tsx`, `BoxListContainer.tsx` |
| `DashboardModalType` | Union type dla modali | `DashboardContext.tsx` |
| `DashboardModalData` | Interfejs danych modala | `DashboardContext.tsx` |

**Uwaga:** `SearchQuery` i `LocationContextMenuAction` zostają pominięte - obecna implementacja z inline strings jest wystarczająca i nie wymaga dodatkowej abstrakcji.

---

## 3. Definicje Typów (Sekcja 13 w types.ts)

```typescript
// --- 13. Dashboard View Types ---

/**
 * Empty state variant types for the dashboard
 */
export type EmptyStateType = "empty-workspace" | "no-results" | "no-locations";

/**
 * Dashboard modal type variants
 */
export type DashboardModalType = "location-editor" | "box-editor" | "delete-confirm" | null;

/**
 * Modal state data for dashboard operations
 */
export interface DashboardModalData {
  mode: "create" | "edit";
  itemId?: string;
  parentId?: string;
  itemType?: "location" | "box";
}

/**
 * Represents a location in the tree structure with view model fields.
 */
export interface LocationTreeNode extends LocationDto {
  boxCount: number;
  isExpanded: boolean;
  isLoading: boolean;
  level: number;
  children?: LocationTreeNode[];
}

/**
 * Represents a box item in the list with view model fields.
 */
export interface BoxListItem extends BoxDto {
  isLoading?: boolean;
  isSelected?: boolean;
  isHovering?: boolean;
}

/**
 * Dashboard view state with properly typed collections.
 */
export interface DashboardState {
  // Workspace context
  currentWorkspaceId: string | null;
  userWorkspaces: WorkspaceDto[];

  // Location selection and hierarchy
  selectedLocationId: string | null;
  locations: LocationTreeNode[];
  expandedLocationIds: Set<string>;

  // Search state
  searchQuery: string;
  searchResults: BoxDto[];
  isSearchActive: boolean;

  // Boxes data
  boxes: BoxListItem[];
  totalBoxesCount: number;

  // Loading states
  isLoadingLocations: boolean;
  isLoadingBoxes: boolean;
  isLoadingWorkspaces: boolean;

  // UI state
  selectedBoxId: string | null;
  activeModal: DashboardModalType;
  modalData: DashboardModalData;

  // Error handling
  error: string | null;
  lastError: { message: string; timestamp: number } | null;
}
```

---

## 4. Kolejność Implementacji (z walidacją)

**⚠️ WAŻNE:** Każdy krok kończymy pełną walidacją przed przejściem do następnego!

---

### Krok 1: Dodaj typy do `src/types.ts`

**Akcja:** Dodaj sekcję 13 z nowymi typami na końcu pliku (po linii 632)

**Plik:** `src/types.ts`

**Walidacja automatyczna:**
```bash
npm run lint
npm run build
```

**Walidacja 4-eye:** Brak - to tylko dodanie nowych typów, nie ma wpływu na istniejący kod.

**Commit:** `refactor(types): add Dashboard view types section`

---

### Krok 2: Przenieś `LocationTreeNode` z useLocations.ts

**Akcja:**
1. Usuń lokalny interface `LocationTreeNode` (linie 8-14)
2. Dodaj import z `@/types`
3. Dodaj re-eksport dla backward compatibility

**Plik:** `src/components/hooks/useLocations.ts`

**Walidacja automatyczna:**
```bash
npm run lint
npm run build
```

**Walidacja 4-eye:**
1. Otwórz dashboard: `http://localhost:3000/app`
2. ✅ Sprawdź czy drzewo lokalizacji się ładuje
3. ✅ Kliknij na lokalizację - czy rozwija dzieci?
4. ✅ Dodaj nową lokalizację - czy pojawia się w drzewie?

**Commit:** `refactor(hooks): move LocationTreeNode type to central types`

---

### Krok 3: Przenieś `BoxListItem` z useBoxes.ts

**Akcja:**
1. Usuń lokalny interface `BoxListItem` (linie 9-13)
2. Dodaj import z `@/types`
3. Dodaj re-eksport dla backward compatibility

**Plik:** `src/components/hooks/useBoxes.ts`

**Walidacja automatyczna:**
```bash
npm run lint
npm run build
```

**Walidacja 4-eye:**
1. Otwórz dashboard: `http://localhost:3000/app`
2. ✅ Sprawdź czy lista boxów się ładuje
3. ✅ Kliknij na lokalizację - czy boxy się filtrują?
4. ✅ Wyszukaj box (min 3 znaki) - czy wyniki się pokazują?

**Commit:** `refactor(hooks): move BoxListItem type to central types`

---

### Krok 4: Przenieś `DashboardState` z DashboardContext.tsx

**Akcja:**
1. Usuń lokalny interface `DashboardState` (linie 14-51)
2. Dodaj import z `@/types`: `DashboardState`, `DashboardModalType`, `DashboardModalData`
3. `DashboardContextType` zostaje na miejscu

**Plik:** `src/contexts/DashboardContext.tsx`

**Walidacja automatyczna:**
```bash
npm run lint
npm run build
```

**Walidacja 4-eye:**
1. Otwórz dashboard: `http://localhost:3000/app`
2. ✅ Sprawdź czy cały dashboard działa (lokalizacje + boxy)
3. ✅ Otwórz modal dodawania lokalizacji (+ przy Locations)
4. ✅ Otwórz modal dodawania boxa (+ przy Boxes)
5. ✅ Otwórz modal usuwania (menu kontekstowe → Delete)
6. ✅ Przełącz workspace (jeśli masz więcej niż 1)

**Commit:** `refactor(context): move DashboardState type to central types`

---

### Krok 5: Aktualizuj komponenty Dashboard

**Akcja:** Aktualizuj importy w 4 plikach:
1. `DashboardContainer.tsx` - zmień importy typów na `@/types`
2. `EmptyState.tsx` - dodaj import `EmptyStateType` z `@/types`
3. `LocationTreeNode.tsx` - zmień import typu na `@/types`
4. `BoxListItem.tsx` - zmień import typu na `@/types`

**Pliki:**
- `src/components/dashboard/DashboardContainer.tsx`
- `src/components/dashboard/EmptyState.tsx`
- `src/components/dashboard/LocationTreeNode.tsx`
- `src/components/dashboard/BoxListItem.tsx`

**Walidacja automatyczna:**
```bash
npm run lint
npm run build
```

**Walidacja 4-eye:**
1. Otwórz dashboard: `http://localhost:3000/app`
2. ✅ Full test flow:
   - Rozwiń lokalizację w drzewie
   - Dodaj nową podlokalizację
   - Dodaj nowy box
   - Wyszukaj box
   - Usuń box
   - Sprawdź empty state (usuń wszystkie boxy z lokalizacji)

**Commit:** `refactor(dashboard): update component imports to use central types`

---

### Krok 6: Finalna Walidacja

**Walidacja automatyczna:**
```bash
npm run lint
npm run build
```

**Walidacja 4-eye - Full Regression:**
1. ✅ Dashboard ładuje się poprawnie
2. ✅ Drzewo lokalizacji działa (expand/collapse)
3. ✅ Lista boxów ładuje się
4. ✅ Filtrowanie boxów po lokalizacji
5. ✅ Wyszukiwanie (min 3 znaki)
6. ✅ CRUD lokalizacji (Create, Read, Update, Delete)
7. ✅ CRUD boxów (Create, Read, Update, Delete)
8. ✅ Modale działają poprawnie
9. ✅ Empty states wyświetlają się
10. ✅ Przełączanie workspace (jeśli dostępne)

**Commit finalny:** `refactor(types): complete Dashboard types centralization`

---

## 5. Backward Compatibility

Re-eksport z oryginalnych lokalizacji zapewnia działanie istniejących importów:

```typescript
// Te importy nadal działają:
import { type LocationTreeNode } from "@/components/hooks/useLocations";
import { type BoxListItem } from "@/components/hooks/useBoxes";

// Te są teraz preferowane:
import type { LocationTreeNode, BoxListItem, DashboardState } from "@/types";
```

---

## 6. Poprawki Type Safety

| Pole w DashboardState | Przed | Po |
|----------------------|-------|-----|
| `locations` | `any[]` | `LocationTreeNode[]` |
| `searchResults` | `any[]` | `BoxDto[]` |
| `boxes` | `any[]` | `BoxListItem[]` |

---

## 7. Pliki do Modyfikacji

| Plik | Akcja |
|------|-------|
| `src/types.ts` | ADD sekcja 13 |
| `src/components/hooks/useLocations.ts` | UPDATE - przenieś typ |
| `src/components/hooks/useBoxes.ts` | UPDATE - przenieś typ |
| `src/contexts/DashboardContext.tsx` | UPDATE - przenieś DashboardState |
| `src/components/dashboard/DashboardContainer.tsx` | UPDATE - importy |
| `src/components/dashboard/EmptyState.tsx` | UPDATE - import EmptyStateType |
| `src/components/dashboard/LocationTreeNode.tsx` | UPDATE - import |
| `src/components/dashboard/BoxListItem.tsx` | UPDATE - import |

---

## 8. Szacowany Zakres

- **Nowe linie kodu:** ~80 (w types.ts)
- **Pliki do edycji:** 8
- **Ryzyko:** Niskie (refaktoryzacja bez zmiany logiki)

---

## 9. Powiązane Plany

- `.ai_docs/box-details-view-implementation-plan.md` - implementuj najpierw
- `.ai_docs/box-form-view-implementation-plan.md` - implementuj najpierw
- `.ai_docs/profile-view-implementation-plan.md` - osobna sesja