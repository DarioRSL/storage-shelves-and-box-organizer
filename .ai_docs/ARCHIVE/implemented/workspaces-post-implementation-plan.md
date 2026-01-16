# API Endpoint Implementation Plan: POST /workspaces

## 1. Przegląd punktu końcowego

Endpoint `POST /workspaces` służy do tworzenia nowego workspace'a (przestrzeni roboczej). Workspace jest jednostką izolacji danych (tenant) w systemie. Po utworzeniu workspace'a, użytkownik tworzący automatycznie staje się jego właścicielem (owner) i jest dodawany do tabeli `workspace_members` z rolą `owner`.

**Kluczowe aspekty:**

- Wymaga uwierzytelnienia użytkownika
- Operacja musi być atomowa (utworzenie workspace + przypisanie użytkownika jako owner)
- Zwraca pełny obiekt workspace po pomyślnym utworzeniu

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

`/api/workspaces`

### Parametry

**Wymagane parametry (Request Body):**

- `name` (string) - Nazwa workspace'a
  - Minimalna długość: 1 znak
  - Maksymalna długość: 255 znaków
  - Automatyczne usuwanie białych znaków (trim)

**Opcjonalne parametry:**

- Brak

**Headers:**

- `Content-Type: application/json`
- `Authorization: Bearer <token>` (automatycznie zarządzane przez Supabase)

### Request Body Schema

```typescript
{
  "name": string // required, min: 1, max: 255
}
```

**Przykład żądania:**

```json
{
  "name": "My Home Storage"
}
```

---

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

Z pliku `src/types.ts`:

**Input:**

```typescript
export type CreateWorkspaceRequest = Pick<Tables<"workspaces">, "name">;
```

**Output:**

```typescript
export type WorkspaceDto = Tables<"workspaces">;
// Struktura:
// {
//   id: string (UUID)
//   owner_id: string (UUID)
//   name: string
//   created_at: string
//   updated_at: string
// }
```

**Error:**

```typescript
export interface ErrorResponse {
  error: string;
  details?: unknown;
}
```

### Schemat Walidacji (Zod)

Należy utworzyć w pliku endpoint:

```typescript
import { z } from "zod";

const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nazwa workspace'a nie może być pusta")
    .max(255, "Nazwa workspace'a nie może przekraczać 255 znaków"),
});
```

---

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)

**Status Code:** `201 Created`

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "My Home Storage",
  "created_at": "2023-10-27T10:05:00.000Z",
  "updated_at": "2023-10-27T10:05:00.000Z"
}
```

### Błędy

#### 400 Bad Request

Nieprawidłowe dane wejściowe:

```json
{
  "error": "Nieprawidłowe dane wejściowe",
  "details": {
    "name": ["Nazwa workspace'a nie może być pusta"]
  }
}
```

#### 401 Unauthorized

Brak uwierzytelnienia:

```json
{
  "error": "Nie jesteś uwierzytelniony"
}
```

#### 500 Internal Server Error

Błąd serwera:

```json
{
  "error": "Wystąpił błąd podczas tworzenia workspace'a",
  "details": "Database connection failed"
}
```

---

## 5. Przepływ danych

### Architektura warstwowa

```
Client Request
    ↓
Astro API Endpoint (/api/workspaces.ts)
    ↓
1. Middleware: Weryfikacja uwierzytelnienia (context.locals.supabase)
    ↓
2. Walidacja: Zod Schema (CreateWorkspaceSchema)
    ↓
3. Service Layer: workspace.service.ts
    ↓
4. Supabase Client: Operacje bazodanowe
    ↓
5. Database: PostgreSQL + RLS
    ↓
Response (201 Created / Error)
```

### Szczegółowy przepływ

1. **Request otrzymany przez endpoint**
   - Parsowanie JSON body
   - Wydobycie `supabase` client z `context.locals`
   - Pobranie `user` z sesji Supabase

2. **Walidacja uwierzytelnienia**
   - Sprawdzenie czy użytkownik jest zalogowany
   - Jeśli nie: zwróć 401 Unauthorized
   - Jeśli tak: kontynuuj

3. **Walidacja danych wejściowych**
   - Parsowanie body przez Zod schema
   - Jeśli błąd: zwróć 400 Bad Request z detalami
   - Jeśli OK: kontynuuj

4. **Wywołanie service layer**
   - `workspaceService.createWorkspace(supabase, user.id, validatedData)`
5. **Operacje bazodanowe (w service)**
   - **Krok 1**: Utworzenie workspace w tabeli `workspaces`
     ```typescript
     const { data: workspace, error: workspaceError } = await supabase
       .from("workspaces")
       .insert({
         owner_id: userId,
         name: data.name,
       })
       .select()
       .single();
     ```
   - **Krok 2**: Dodanie użytkownika do `workspace_members` jako owner
     ```typescript
     const { error: memberError } = await supabase.from("workspace_members").insert({
       workspace_id: workspace.id,
       user_id: userId,
       role: "owner",
     });
     ```
   - **Obsługa błędów transakcyjności**: Jeśli krok 2 się nie powiedzie, należy rozważyć rollback (lub polegać na database constraints)

6. **Zwrócenie odpowiedzi**
   - Sukces: 201 Created z obiektem WorkspaceDto
   - Błąd: odpowiedni kod błędu z ErrorResponse

### Interakcje z bazą danych

**Tabele zaangażowane:**

- `public.workspaces` - utworzenie nowego rekordu
- `public.workspace_members` - dodanie rekordu membership z rolą 'owner'

**RLS Policies:**

- Polityki RLS zapewniają, że użytkownik może widzieć tylko workspace'y, do których należy
- Owner automatycznie otrzymuje pełne uprawnienia do workspace'a

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- **Wymagane**: Endpoint musi weryfikować, czy użytkownik jest zalogowany
- **Implementacja**: Użycie `context.locals.supabase` w Astro
- **Weryfikacja**: Sprawdzenie `user` z `supabase.auth.getUser()`

### Autoryzacja

- **Brak dodatkowych wymagań**: Każdy zalogowany użytkownik może tworzyć workspace'y
- **Automatyczne uprawnienia**: Tworzący użytkownik staje się owner z pełnymi prawami

### Walidacja danych

- **Sanityzacja**: Trim whitespace z nazwy workspace'a
- **Ograniczenia długości**: Min 1, max 255 znaków
- **Zapobieganie XSS**: Walidacja przez Zod eliminuje problemy z nieoczekiwanymi znakami

### Row Level Security (RLS)

- **Tabela workspaces**: RLS włączony
- **Polityki**:
  - Użytkownik może widzieć workspace'y, do których należy (przez workspace_members)
  - Owner może edytować i usuwać workspace

### Zabezpieczenia przed atakami

- **SQL Injection**: Zapobiegane przez Supabase Client (parametryzowane zapytania)
- **CSRF**: Token CSRF (jeśli implementowany na poziomie middleware)
- **Rate Limiting**: Należy rozważyć w przyszłości (ograniczenie liczby workspace'ów na użytkownika)

### Integralność danych

- **Atomowość operacji**: Utworzenie workspace + dodanie do workspace_members powinno być atomowe
- **Foreign key constraints**: `workspace_members.workspace_id` REFERENCES `workspaces(id)`
- **Rollback**: W przypadku błędu przy dodawaniu do workspace_members, workspace może pozostać sierocą (rozważyć transakcje)

---

## 7. Obsługa błędów

### Scenariusze błędów i odpowiedzi

#### 1. Brak uwierzytelnienia

**Warunek:**

- Użytkownik nie jest zalogowany
- Token jest nieprawidłowy lub wygasł

**Kod statusu:** `401 Unauthorized`

**Odpowiedź:**

```json
{
  "error": "Nie jesteś uwierzytelniony"
}
```

**Implementacja:**

```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  return new Response(JSON.stringify({ error: "Nie jesteś uwierzytelniony" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
```

---

#### 2. Nieprawidłowe dane wejściowe

**Warunek:**

- Brak pola `name`
- `name` jest pusty po trim
- `name` przekracza 255 znaków
- Nieprawidłowy format JSON

**Kod statusu:** `400 Bad Request`

**Odpowiedź:**

```json
{
  "error": "Nieprawidłowe dane wejściowe",
  "details": {
    "name": ["Nazwa workspace'a nie może być pusta"]
  }
}
```

**Implementacja:**

```typescript
const parseResult = CreateWorkspaceSchema.safeParse(body);

if (!parseResult.success) {
  return new Response(
    JSON.stringify({
      error: "Nieprawidłowe dane wejściowe",
      details: parseResult.error.flatten().fieldErrors,
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

---

#### 3. Błąd parsowania JSON

**Warunek:**

- Request body nie jest prawidłowym JSON

**Kod statusu:** `400 Bad Request`

**Odpowiedź:**

```json
{
  "error": "Nieprawidłowy format żądania"
}
```

**Implementacja:**

```typescript
let body;
try {
  body = await request.json();
} catch (e) {
  return new Response(JSON.stringify({ error: "Nieprawidłowy format żądania" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
```

---

#### 4. Błąd bazy danych

**Warunek:**

- Błąd przy tworzeniu workspace w bazie danych
- Błąd przy dodawaniu do workspace_members
- Naruszenie constraintów

**Kod statusu:** `500 Internal Server Error`

**Odpowiedź:**

```json
{
  "error": "Wystąpił błąd podczas tworzenia workspace'a"
}
```

**Implementacja:**

```typescript
const { data: workspace, error: dbError } = await workspaceService.createWorkspace(supabase, user.id, validatedData);

if (dbError || !workspace) {
  console.error("Database error:", dbError);
  return new Response(
    JSON.stringify({
      error: "Wystąpił błąd podczas tworzenia workspace'a",
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

---

#### 5. Błąd dodawania do workspace_members (częściowa transakcja)

**Warunek:**

- Workspace został utworzony pomyślnie
- Błąd przy dodawaniu użytkownika do workspace_members

**Kod statusu:** `500 Internal Server Error`

**Odpowiedź:**

```json
{
  "error": "Workspace utworzony, ale wystąpił błąd przy przypisywaniu użytkownika"
}
```

**Uwaga:** To jest edge case - należy rozważyć:

- Database trigger na `workspaces` który automatycznie dodaje owner do `workspace_members`
- Transakcję bazodanową (Supabase nie wspiera natywnie, ale można użyć RPC function)
- Cleanup orphaned workspaces w tle

---

### Logowanie błędów

**Co logować:**

- Wszystkie błędy 500 (z pełnym stack trace)
- Błędy bazy danych (z detalami błędu Supabase)
- Nieoczekiwane wyjątki

**Gdzie logować:**

- `console.error()` - dla development
- External logging service (np. Sentry) - dla production

**Przykład:**

```typescript
catch (error) {
  console.error("Unexpected error in POST /workspaces:", error);
  return new Response(
    JSON.stringify({ error: "Wystąpił nieoczekiwany błąd" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Dwie operacje bazodanowe**
   - Insert do `workspaces`
   - Insert do `workspace_members`
   - **Optymalizacja**: Można rozważyć database trigger lub RPC function

2. **Brak connection pooling**
   - Supabase Client zarządza tym automatycznie
   - **Brak akcji wymaganej**

3. **Walidacja po stronie serwera**
   - Zod parsing jest szybki
   - **Brak znaczącego wpływu na wydajność**

### Strategie optymalizacji

#### 1. Database Trigger (Zalecane)

Utworzenie triggera który automatycznie dodaje owner do workspace_members:

```sql
CREATE OR REPLACE FUNCTION add_owner_to_workspace_members()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_workspace_insert
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION add_owner_to_workspace_members();
```

**Zalety:**

- Atomowość operacji
- Pojedyncze wywołanie API
- Gwarancja integralności danych

#### 2. RPC Function (Alternatywa)

Utworzenie PostgreSQL funkcji która tworzy workspace i dodaje członka:

```sql
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
  p_owner_id UUID,
  p_name TEXT
)
RETURNS TABLE(
  id UUID,
  owner_id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Insert workspace
  INSERT INTO public.workspaces (owner_id, name)
  VALUES (p_owner_id, p_name)
  RETURNING * INTO id, owner_id, name, created_at, updated_at;

  v_workspace_id := id;

  -- Insert workspace member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_owner_id, 'owner');

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

**Użycie:**

```typescript
const { data, error } = await supabase.rpc("create_workspace_with_owner", {
  p_owner_id: userId,
  p_name: validatedData.name,
});
```

#### 3. Caching

- **Nie dotyczy**: POST endpoints nie są cachowane
- **Lista workspace'ów**: Można cachować na poziomie klienta

#### 4. Indexy bazodanowe

Sprawdzić czy istnieją indexy:

- `workspaces.owner_id` - dla szybkiego wyszukiwania workspace'ów użytkownika
- `workspace_members.user_id` - dla szybkiego sprawdzania membership
- `workspace_members.workspace_id` - dla szybkiego listowania członków

### Monitoring wydajności

**Metryki do śledzenia:**

- Czas odpowiedzi endpoint (target: < 500ms)
- Liczba utworzonych workspace'ów (rate)
- Wskaźnik błędów (error rate)
- Database query time

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie database triggera lub RPC function (Opcjonalnie, ale zalecane)

**Cel:** Zapewnić atomowość operacji tworzenia workspace + dodawania owner do workspace_members

**Pliki:**

- Nowa migracja: `supabase/migrations/[timestamp]_workspace_creation_trigger.sql`

**Zadania:**

1. Utworzyć nową migrację SQL
2. Dodać funkcję `add_owner_to_workspace_members()`
3. Dodać trigger `after_workspace_insert`
4. Przetestować migrację lokalnie
5. Zastosować migrację: `supabase migration up`

**Kod do dodania:**

```sql
-- Add trigger to automatically add owner to workspace_members after workspace creation
CREATE OR REPLACE FUNCTION add_owner_to_workspace_members()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_workspace_insert
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION add_owner_to_workspace_members();
```

---

### Krok 2: Utworzenie service layer

**Cel:** Wyodrębnić logikę biznesową do reużywalnego service

**Pliki:**

- Nowy plik: `src/lib/services/workspace.service.ts`

**Zadania:**

1. Utworzyć katalog `src/lib/services/` (jeśli nie istnieje)
2. Utworzyć plik `workspace.service.ts`
3. Zaimplementować funkcję `createWorkspace()`
4. Dodać obsługę błędów
5. Dodać dokumentację JSDoc

**Kod do dodania:**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateWorkspaceRequest, WorkspaceDto } from "@/types";

/**
 * Creates a new workspace and adds the creating user as owner.
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the user creating the workspace
 * @param data - Workspace creation data
 * @returns Created workspace or error
 */
export async function createWorkspace(
  supabase: SupabaseClient,
  userId: string,
  data: CreateWorkspaceRequest
): Promise<{ data: WorkspaceDto | null; error: Error | null }> {
  try {
    // Insert workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        owner_id: userId,
        name: data.name,
      })
      .select()
      .single();

    if (workspaceError) {
      console.error("Error creating workspace:", workspaceError);
      return {
        data: null,
        error: new Error("Failed to create workspace"),
      };
    }

    if (!workspace) {
      return {
        data: null,
        error: new Error("Workspace creation returned no data"),
      };
    }

    // If trigger exists, workspace_members entry is automatically created
    // If not, we need to manually add the user to workspace_members:
    // Uncomment if trigger is not implemented:
    /*
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding owner to workspace_members:', memberError);
      // Note: workspace is created but user is not added as member
      // Consider cleanup or manual intervention
      return { 
        data: null, 
        error: new Error('Workspace created but failed to assign owner') 
      };
    }
    */

    return { data: workspace, error: null };
  } catch (error) {
    console.error("Unexpected error in createWorkspace:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
```

**Uwaga:** Jeśli trigger z Kroku 1 został zaimplementowany, kod dodawania do `workspace_members` jest zbędny (zakomentowany).

---

### Krok 3: Utworzenie API endpoint

**Cel:** Zaimplementować endpoint REST API w Astro

**Pliki:**

- Nowy plik: `src/pages/api/workspaces.ts`

**Zadania:**

1. Utworzyć plik endpoint w `src/pages/api/`
2. Dodać `export const prerender = false`
3. Zaimplementować handler `POST`
4. Dodać walidację Zod
5. Zintegrować z service layer
6. Dodać obsługę błędów
7. Dodać dokumentację

**Kod do dodania:**

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { createWorkspace } from "@/lib/services/workspace.service";
import type { CreateWorkspaceRequest, WorkspaceDto, ErrorResponse } from "@/types";

export const prerender = false;

// Validation schema
const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nazwa workspace'a nie może być pusta")
    .max(255, "Nazwa workspace'a nie może przekraczać 255 znaków"),
});

/**
 * POST /api/workspaces
 * Creates a new workspace with the authenticated user as owner.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Nie jesteś uwierzytelniony",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy format żądania",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Validate input
    const parseResult = CreateWorkspaceSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          details: parseResult.error.flatten().fieldErrors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedData: CreateWorkspaceRequest = parseResult.data;

    // 5. Call service layer
    const { data: workspace, error: serviceError } = await createWorkspace(supabase, user.id, validatedData);

    if (serviceError || !workspace) {
      console.error("Service error:", serviceError);
      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas tworzenia workspace'a",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 6. Return success response
    return new Response(JSON.stringify(workspace as WorkspaceDto), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/workspaces:", error);
    return new Response(
      JSON.stringify({
        error: "Wystąpił nieoczekiwany błąd",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

---

### Krok 4: Testowanie manualne

**Cel:** Zweryfikować poprawność działania endpoint

**Narzędzia:**

- cURL, Postman, lub Thunder Client (VS Code extension)
- Supabase Dashboard (do sprawdzania danych w bazie)

**Scenariusze testowe:**

#### Test 1: Pomyślne utworzenie workspace (zalogowany użytkownik)

```bash
curl -X POST http://localhost:4321/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "Test Workspace"}'
```

**Oczekiwany rezultat:**

- Status: 201 Created
- Body: Obiekt WorkspaceDto z id, owner_id, name, created_at, updated_at
- W bazie: Nowy rekord w `workspaces` i `workspace_members`

#### Test 2: Brak uwierzytelnienia

```bash
curl -X POST http://localhost:4321/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workspace"}'
```

**Oczekiwany rezultat:**

- Status: 401 Unauthorized
- Body: `{"error": "Nie jesteś uwierzytelniony"}`

#### Test 3: Pusta nazwa

```bash
curl -X POST http://localhost:4321/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": ""}'
```

**Oczekiwany rezultat:**

- Status: 400 Bad Request
- Body: Błąd walidacji dla pola `name`

#### Test 4: Brak pola name

```bash
curl -X POST http://localhost:4321/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{}'
```

**Oczekiwany rezultat:**

- Status: 400 Bad Request
- Body: Błąd walidacji dla pola `name`

#### Test 5: Nazwa zbyt długa (> 255 znaków)

```bash
curl -X POST http://localhost:4321/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "A... (256+ znaków)"}'
```

**Oczekiwany rezultat:**

- Status: 400 Bad Request
- Body: Błąd walidacji dla pola `name`

#### Test 6: Nieprawidłowy JSON

```bash
curl -X POST http://localhost:4321/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d 'invalid json'
```

**Oczekiwany rezultat:**

- Status: 400 Bad Request
- Body: `{"error": "Nieprawidłowy format żądania"}`

---

### Krok 5: Weryfikacja RLS i bezpieczeństwa

**Cel:** Upewnić się, że polityki bezpieczeństwa działają poprawnie

**Zadania:**

1. **Sprawdzić RLS policies na tabeli workspaces:**
   - Zalogować się jako User A
   - Utworzyć workspace W1
   - Zalogować się jako User B
   - Spróbować odczytać workspace W1
   - **Oczekiwany rezultat:** User B nie powinien widzieć W1 (jeśli nie jest członkiem)

2. **Sprawdzić automatyczne dodawanie do workspace_members:**
   - Utworzyć workspace
   - Sprawdzić w Supabase Dashboard czy rekord w `workspace_members` istnieje
   - **Oczekiwany rezultat:** Rekord z `role = 'owner'` powinien istnieć

3. **Sprawdzić owner_id:**
   - Utworzyć workspace jako User A
   - Sprawdzić czy `owner_id` w workspace odpowiada `user_id` User A
   - **Oczekiwany rezultat:** `owner_id` === `user.id`

---

### Krok 6: Obsługa edge cases i cleanup

**Cel:** Rozwiązać potencjalne problemy z integralnością danych

**Zadania:**

1. **Orphaned workspaces (jeśli trigger nie istnieje):**
   - Zidentyfikować workspace'y bez wpisów w `workspace_members`
   - Utworzyć skrypt cleanup lub migrację do naprawienia danych

   ```sql
   -- Find orphaned workspaces
   SELECT w.*
   FROM workspaces w
   LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
   WHERE wm.workspace_id IS NULL;

   -- Fix orphaned workspaces
   INSERT INTO workspace_members (workspace_id, user_id, role)
   SELECT w.id, w.owner_id, 'owner'
   FROM workspaces w
   LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
   WHERE wm.workspace_id IS NULL;
   ```

2. **Rate limiting (opcjonalnie):**
   - Rozważyć implementację rate limiting na poziomie middleware
   - Ograniczenie: np. 10 workspace'ów na użytkownika lub 5 workspace'ów na minutę

3. **Monitoring:**
   - Dodać logging dla wszystkich utworzeń workspace'ów
   - Dodać metryki (jeśli używany jest system monitoringu)

---

### Krok 7: Dokumentacja i code review

**Cel:** Zapewnić, że kod jest czytelny i dobrze udokumentowany

**Zadania:**

1. **Dokumentacja kodu:**
   - Upewnić się, że wszystkie funkcje mają JSDoc comments
   - Dodać inline comments dla skomplikowanej logiki

2. **Dokumentacja API:**
   - Zaktualizować plik `api-plan.md` (jeśli implementacja różni się od specyfikacji)
   - Dodać przykłady użycia

3. **README:**
   - Dodać informacje o nowym endpoincie do README (jeśli istnieje)
   - Dodać instrukcje testowania

4. **Code review:**
   - Przegląd kodu przez innego developera
   - Sprawdzenie zgodności z coding guidelines
   - Weryfikacja obsługi błędów

---

### Krok 8: Deployment i monitoring

**Cel:** Wdrożyć endpoint na produkcję i monitorować

**Zadania:**

1. **Pre-deployment checklist:**
   - [ ] Wszystkie testy manualne przeszły pomyślnie
   - [ ] RLS policies działają poprawnie
   - [ ] Migracje bazy danych gotowe do wdrożenia
   - [ ] Kod przeszedł code review
   - [ ] Dokumentacja zaktualizowana

2. **Deployment:**
   - Zastosować migracje bazy danych (jeśli dotyczy)
   - Wdrożyć kod na staging
   - Przetestować na staging
   - Wdrożyć na production

3. **Post-deployment monitoring:**
   - Monitorować logi na błędy 500
   - Sprawdzić metryki wydajności
   - Monitorować rate utworzeń workspace'ów
   - Sprawdzić czy trigger działa poprawnie (jeśli zaimplementowany)

4. **Rollback plan:**
   - Przygotować plan rollback na wypadek problemów
   - Zidentyfikować krytyczne problemy wymagające natychmiastowego rollback

---

## 10. Checklist implementacji

### Database

- [ ] Utworzenie migracji dla triggera `add_owner_to_workspace_members()` (opcjonalne, ale zalecane)
- [ ] Przetestowanie migracji lokalnie
- [ ] Zastosowanie migracji: `supabase migration up`
- [ ] Weryfikacja że trigger działa poprawnie

### Backend

- [ ] Utworzenie `src/lib/services/workspace.service.ts`
- [ ] Implementacja funkcji `createWorkspace()`
- [ ] Dodanie obsługi błędów w service
- [ ] Dodanie JSDoc documentation

### API Endpoint

- [ ] Utworzenie `src/pages/api/workspaces.ts`
- [ ] Dodanie `export const prerender = false`
- [ ] Implementacja handlera `POST`
- [ ] Dodanie schematu walidacji Zod
- [ ] Integracja z service layer
- [ ] Obsługa wszystkich scenariuszy błędów (401, 400, 500)

### Testing

- [ ] Test: Pomyślne utworzenie workspace (201)
- [ ] Test: Brak uwierzytelnienia (401)
- [ ] Test: Brak pola name (400)
- [ ] Test: Pusta nazwa (400)
- [ ] Test: Nazwa zbyt długa (400)
- [ ] Test: Nieprawidłowy JSON (400)
- [ ] Test: Weryfikacja RLS policies
- [ ] Test: Automatyczne dodawanie do workspace_members

### Security & RLS

- [ ] Weryfikacja że RLS działa poprawnie
- [ ] Sprawdzenie że tylko zalogowani użytkownicy mogą tworzyć workspace'y
- [ ] Weryfikacja że owner_id jest poprawnie przypisany

### Documentation

- [ ] Dodanie JSDoc do wszystkich funkcji
- [ ] Aktualizacja `api-plan.md` (jeśli potrzebne)
- [ ] Dodanie przykładów użycia w dokumentacji

### Deployment

- [ ] Code review
- [ ] Deployment na staging
- [ ] Testowanie na staging
- [ ] Deployment na production
- [ ] Monitoring post-deployment

---

## 11. Potencjalne rozszerzenia (Future enhancements)

### 1. Workspace templates

- Możliwość tworzenia workspace'ów z predefiniowanych szablonów
- Automatyczne dodawanie przykładowych lokacji i boxów

### 2. Limity dla użytkowników

- Ograniczenie liczby workspace'ów na użytkownika (np. 5 dla free tier)
- Walidacja limitu w endpoincie

### 3. Webhook notifications

- Powiadomienie na webhook po utworzeniu workspace'a
- Integracja z systemami zewnętrznymi

### 4. Workspace slug/URL-friendly ID

- Generowanie przyjaznego URL slug dla workspace'a
- Np. "my-home-storage" zamiast UUID

### 5. Soft delete dla workspace'ów

- Dodanie pola `is_deleted` do tabeli workspaces
- Możliwość przywrócenia usuniętych workspace'ów

### 6. Audit log

- Logowanie wszystkich operacji na workspace'ach
- Kto i kiedy utworzył workspace

---

## 12. Znane ograniczenia i trade-offs

### 1. Brak transakcyjności natywnej w Supabase Client

**Ograniczenie:** Supabase JS Client nie wspiera natywnie transakcji bazodanowych.

**Wpływ:** Jeśli utworzenie workspace się powiedzie, ale dodanie do workspace_members nie, workspace pozostanie w bazie bez owner.

**Rozwiązanie:**

- **Zalecane:** Użycie database triggera (automatycznie dodaje owner)
- **Alternatywa:** RPC function z natywną transakcją PostgreSQL

### 2. Brak rate limiting na poziomie aplikacji

**Ograniczenie:** Użytkownik może utworzyć nieograniczoną liczbę workspace'ów.

**Wpływ:** Potencjalne nadużycia (spam workspace'ów).

**Rozwiązanie:**

- Implementacja rate limiting w middleware
- Dodanie limitu workspace'ów na użytkownika w business logic

### 3. Brak soft delete

**Ograniczenie:** Usunięcie workspace'a jest permanentne.

**Wpływ:** Brak możliwości przywrócenia przypadkowo usuniętych danych.

**Rozwiązanie:**

- Dodanie pola `is_deleted` w przyszłości
- Implementacja archiwizacji zamiast usuwania

---

## 13. Podsumowanie

Endpoint `POST /workspaces` jest kluczowym elementem aplikacji, umożliwiającym użytkownikom tworzenie nowych przestrzeni roboczych. Implementacja wymaga:

1. **Database trigger** - dla zapewnienia integralności danych (workspace + workspace_members)
2. **Service layer** - dla wyodrębnienia logiki biznesowej
3. **API endpoint** - z pełną walidacją i obsługą błędów
4. **RLS policies** - dla bezpieczeństwa i izolacji danych

**Szacowany czas implementacji:** 4-6 godzin (włączając testy)

**Priorytet:** Wysoki (core functionality)

**Zależności:**

- Tabele `workspaces` i `workspace_members` muszą istnieć
- Middleware uwierzytelniania musi być skonfigurowane
- Supabase client musi być dostępny w `context.locals`
