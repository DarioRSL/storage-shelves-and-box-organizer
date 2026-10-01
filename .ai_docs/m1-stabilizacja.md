# M1 — Stabilizacja: szczegółowy zakres prac i wsad pod GitHub Issues

> Uszczegółowienie milestone'u M1 z `refactoring-launch-plan.md`.
> Wszystkie założenia poniżej **zweryfikowane bezpośrednio w kodzie** (2026-06-12).
> Każde zadanie ma treść gotową do wklejenia jako issue (sekcja „Wsad issues" na końcu pliku to format pod skrypt `gh issue create`).

---

## 1. Weryfikacja założeń planu — korekty

Przed rozpisaniem zadań sprawdzono każde założenie M1 w kodzie. Wynik:

| # | Założenie z planu | Stan faktyczny po weryfikacji | Wpływ na plan |
|---|---|---|---|
| 1 | „96 błędów ESLint w kodzie" | **Wszystkie 96 błędów pochodzi z `.claude/worktrees/friendly-bose/`** (stary worktree z kopią repo). W `src/` jest **0 błędów i 4 warningi**. Plik `test-rls-isolation.js` w korzeniu istnieje, ale jest poza lintem (gitignore). | M1-01 spada z 3 h do **1 h** — czysta konfiguracja + sprzątnięcie worktree |
| 2 | „66 testów RLS pominiętych, brak infrastruktury" | Infrastruktura **już istnieje** (`tests/helpers/db-setup.ts`, `auth-helper.ts`, `supabase-test-client.ts`, `fixtures/initial-dataset.ts`) i część testów RLS jest **aktywna**. Pominięte: **13 × `it.skip` + 2 × `describe.skip`** w `rls-policies.test.ts`. Łącznie w całym `tests/` jest **~156 markerów skip** (np. `boxes.test.ts` — 31, `locations.test.ts` — 15). | M1-02 (budowa infrastruktury) **wypada**; zostaje diagnoza + odblokowanie. Reszta skipów (poza RLS) zostaje w M4, ale skala M4-06/07 jest większa niż zakładano |
| 3 | „Bug: soft-deleted lokalizacje widoczne" | **Fałszywy alarm** — filtrowanie `is_deleted = false` istnieje w `location.service.ts:186,279,309` oraz w funkcjach RPC (`20260130150000_add_rls_bypass_functions.sql:117,181,201`). | Zostaje tylko tani test regresyjny (M1-05) |
| 4 | „Duplikaty klas błędów" | Potwierdzone, skala większa: **19 klas zduplikowanych** — `box.service.ts` (5), `location.service.ts` (7), `workspace.service.ts` (6), `qr-code.service.ts` (1). `errors.ts` (254 linie) zawiera komplet z bazą `AppError(message, statusCode)` — ale **bez pola `code`**. 12 plików endpointów importuje błędy z serwisów. Dodatkowo `box.service.ts:155,158,185` rzuca surowe `new Error("polski komunikat")` zamiast klas typowanych | M1-06 potwierdzone; dodać pole `code` do `AppError` i zamianę surowych `Error` na typowane |
| 5 | „Nietransakcyjne tworzenie box+QR" | Potwierdzone — `box.service.ts:133-187`: insert boxa, potem osobny update `qr_codes`; błąd update'u zostawia osierocony box (komentarz w kodzie l. 183-184 to przyznaje). **Korekta schematu:** `qr_codes` ma kolumny `status` (enum `generated/printed/assigned`) i `box_id` — **nie ma `assigned_at`**, którego używał szkic SQL z planu | M1-07/08 potwierdzone; poprawiony SQL poniżej |
| 6 | „Bug klucza motywu theme vs theme-mode" | **Nieaktualny jako bug.** Aktywna ścieżka (`ThemeInitializer.astro:55,63` + `useTheme.ts:59,71` + `SettingsContainer`) spójnie używa klucza `"theme"`. Klucz `"theme-mode"` jest tylko w `theme.store.ts`, który ma **0 importów** — to martwy kod | Zadanie „naprawa motywu" wypada; `theme.store.ts` do usunięcia w M1-09 |
| 7 | „Martwe store'y: auth.store, workspace.store" | `workspace.store.ts` — **0 importów, martwy**. `theme.store.ts` — **0 importów, martwy**. `auth.store.ts` — **używany** przez `LoginForm.tsx` i `RegistrationForm.tsx` (nie usuwać bez analizy; co najwyżej odchudzić). Aktywny store to `src/stores/dashboard.ts` (7 importerów) | M1-09 doprecyzowane: usunąć 2 pliki, `auth.store` tylko przejrzeć |
| 8 | „Middleware loguje prefiksy tokenów" | Potwierdzone — `middleware/index.ts:34-42`: `console.log` z `accessTokenPrefix: …substring(0, 20)`; używa `console.log` zamiast `logger` | M1-10 potwierdzone |
| 9 | „/api/auth/session bez Zod" | Potwierdzone — `session.ts:25-40`: ręczne rzutowanie `body as {…}` i ify; reszta endpointów używa Zod | M1-11 potwierdzone |

**Skorygowany budżet M1: ~26 h** (było 33 h — odpadła budowa infrastruktury testowej i „naprawa" motywu, ESLint stopniał do 1 h; doszła rezerwa na diagnozę skipów).

---

## 2. Przegląd zadań M1 i kolejność wykonania

```
B-01 Etykiety+milestony (2h) ─→ B-02 Board+skrypt issues (3h)
M1-01 ESLint/worktree (1h)  ─→ (odblokowuje czyste CI dla wszystkiego)
M1-02 Diagnoza skipów RLS (2h) ─→ M1-03 Odblokowanie RLS cz.1 (3h) ─→ M1-04 Odblokowanie RLS cz.2 (3h)
M1-05 Test regresyjny soft-delete (1h)            [niezależne]
M1-06 Konsolidacja błędów + pole code (4h)        [po M1-01]
M1-07 Migracja RPC create_box_with_qr (3h)        [po M1-04]
M1-08 Przepięcie box.service na RPC (2h)          [po M1-07]
M1-09 Usunięcie martwego kodu (1h)                [niezależne]
M1-10 Middleware: logger zamiast console (1h)     [niezależne]
M1-11 Zod dla session + mapper błędów (3h)        [po M1-06]
```

Suma: **26 h** (+5 h bootstrap trackingu = 31 h w 4 tygodnie przy 7-8 h/tydz.).

Sugerowany rytm tygodniowy:
- **Tydz. 1:** B-01, B-02, M1-01, M1-09, M1-10 (8 h) — szybkie domknięcia, czyste CI, board działa
- **Tydz. 2:** M1-02, M1-03, M1-05 (6 h) — RLS część 1
- **Tydz. 3:** M1-04, M1-06 (7 h) — RLS część 2 + konsolidacja błędów
- **Tydz. 4:** M1-07, M1-08, M1-11 (8 h) — transakcja box+QR + spójne API

---

## 3. Wsad issues — gotowe treści

Konwencja tytułów: `[M1-xx][obszar] Tytuł`. Każde body ma sekcje: Kontekst / Pliki / Zakres / Kryteria akceptacji / Zależności / Estymacja.

---

### M1-01 `[ci] Wyłączenie .claude/ z lintu i usunięcie martwego worktree`

**Labels:** `faza:stabilizacja, typ:infra, obszar:ci, P0` · **Estymacja:** 1 h · **Zależności:** brak

**Kontekst**
`npm run lint` zgłasza 96 błędów — **wszystkie** pochodzą z `.claude/worktrees/friendly-bose/` (porzucony worktree agenta zawierający kopię repo, m.in. `cleanup-e2e-data.mjs` — 37 błędów, `test-rls-isolation.js` — 33 błędy). W faktycznym kodzie (`src/`) jest 0 błędów i 4 warningi. Konfiguracja `eslint.config.js` używa `includeIgnoreFile(.gitignore)` (l. 16, 60), ale `.claude/worktrees/` nie jest w `.gitignore` (widoczne jako `??` w `git status`).

**Pliki**
- `eslint.config.js`
- `.gitignore`
- `.claude/worktrees/friendly-bose/` (do usunięcia)

**Zakres**
1. Usunąć porzucony worktree: `git worktree list`, potem `git worktree remove .claude/worktrees/friendly-bose --force` (albo `rm -rf`, jeśli nie jest zarejestrowany jako worktree).
2. Dodać `.claude/` do `.gitignore` (zabezpieczenie na przyszłość — eslint dziedziczy ignory z gitignore).
3. Dodatkowo jawny wpis w `eslint.config.js`: `{ ignores: [".claude/**"] }` (defense-in-depth, gdyby gitignore się zmienił).
4. Naprawić 4 warningi w `src/` (sprawdzić: `npx eslint src/`).
5. Zweryfikować, że root-owy `test-rls-isolation.js` jest świadomie poza repo (gitignore) — jeśli ma zostać jako narzędzie, przenieść do `scripts/` w osobnym zadaniu; jeśli nie — usunąć.

**Kryteria akceptacji**
- [ ] `npm run lint` → **0 errors, 0 warnings**
- [ ] `git status` nie pokazuje `.claude/worktrees/`
- [ ] Job lint w CI (`.github/workflows/pull-request.yml`) zielony

---

### M1-02 `[test] Diagnoza przyczyn pominięcia testów RLS`

**Labels:** `faza:stabilizacja, typ:test, obszar:db, P0` · **Estymacja:** 2 h · **Zależności:** M1-01

**Kontekst**
`tests/integration/database/rls-policies.test.ts` (619 linii) zawiera **13 × `it.skip` + 2 × `describe.skip`** („Profile Access Control" — cała grupa, „Workspace Member Management" — cała grupa). Część testów RLS jest aktywna i przechodzi (np. „should prevent non-member from viewing locations"), więc infrastruktura (helpers: `db-setup.ts`, `auth-helper.ts`, `supabase-test-client.ts`, fixtures: `initial-dataset.ts`) **działa**. Skipy nie mają komentarzy z uzasadnieniem — przyczyna nieznana (podejrzenia: brak admin-klienta w CI, race conditions na współdzielonych fixtures, polityki INSERT/UPDATE/DELETE faktycznie zwracają inny błąd niż oczekiwany).

**Pliki**
- `tests/integration/database/rls-policies.test.ts`
- `tests/helpers/supabase-test-client.ts`, `tests/helpers/db-setup.ts`, `tests/fixtures/initial-dataset.ts`
- `supabase/migrations/20260106200458_enable_rls_policies.sql` (referencja polityk)

**Zakres**
1. Lokalnie (`supabase start`) zdjąć **wszystkie** skipy tymczasowo i uruchomić: `npx vitest run tests/integration/database/rls-policies.test.ts`.
2. Skatalogować wyniki w komentarzu issue: które testy przechodzą od ręki / które failują i dlaczego (zły assert? luka w polityce? problem fixtures?).
3. Dla każdego faila zaklasyfikować: (a) do naprawy w teście, (b) **luka w polityce RLS → osobne issue P0 z migracją naprawczą**, (c) problem infrastruktury.
4. NIE naprawiać w tym zadaniu — wynik to plan naprawczy dla M1-03/M1-04 (zaktualizować ich opisy).

**Kryteria akceptacji**
- [ ] Tabela w issue: test → status → przyczyna → klasyfikacja (a/b/c)
- [ ] Każda wykryta luka RLS zgłoszona jako osobne issue `P0, typ:bug, obszar:db`
- [ ] Opisy M1-03/M1-04 zaktualizowane o konkrety

---

### M1-03 `[test] Odblokowanie testów RLS — workspaces, locations, boxes`

**Labels:** `faza:stabilizacja, typ:test, obszar:db, P0` · **Estymacja:** 3 h · **Zależności:** M1-02

**Kontekst**
Pominięte testy w grupach: Workspace Isolation (4 × `it.skip`, l. 37-105), Location Isolation (3 × `it.skip` — INSERT/UPDATE/DELETE non-membera, l. 188-228), Box Isolation (3 × `it.skip`, l. 328-368). To są asercje typu „non-member nie może utworzyć/zmienić/usunąć zasobu w cudzym workspace" — **rdzeń weryfikacji multi-tenant**.

**Pliki**
- `tests/integration/database/rls-policies.test.ts` (l. 28-420)
- ew. nowe migracje naprawcze w `supabase/migrations/` (jeśli M1-02 wykrył luki)

**Zakres**
1. Wg planu z M1-02: zdjąć skipy z grup Workspace/Location/Box, naprawić asercje (uwaga na semantykę PostgREST: RLS przy SELECT zwraca pustą listę, nie błąd; przy INSERT/UPDATE/DELETE — błąd 42501 albo 0 zmodyfikowanych wierszy — asercje muszą to odzwierciedlać).
2. Luki w politykach (klasyfikacja „b" z M1-02): migracja `YYYYMMDDHHmmss_fix_rls_<table>.sql` (lowercase SQL, komentarz nagłówkowy, granularne polityki per operacja — zgodnie z konwencją repo).
3. Upewnić się, że testy są deterministyczne przy `fileParallelism: false` (konfiguracja vitest już wymusza sekwencyjność).

**Kryteria akceptacji**
- [ ] 0 skipów w grupach Workspace/Location/Box Isolation
- [ ] Wszystkie testy grup zielone lokalnie i w CI (`npm run test:integration`)
- [ ] Potwierdzone scenariusze: non-member nie może SELECT/INSERT/UPDATE/DELETE na cudzych `workspaces`, `locations`, `boxes`

---

### M1-04 `[test] Odblokowanie testów RLS — qr_codes, profiles, workspace_members`

**Labels:** `faza:stabilizacja, typ:test, obszar:db, P0` · **Estymacja:** 3 h · **Zależności:** M1-03

**Kontekst**
Pozostałe pominięcia: QR Code Isolation (2 × `it.skip`, l. 466-489), **cała grupa** „Profile Access Control" (`describe.skip`, l. 513 — w środku też aktywne testy, które przez describe.skip nie biegają), **cała grupa** „Workspace Member Management" (`describe.skip`, l. 555). Grupa members jest szczególnie ważna: to tu siedzi ryzyko eskalacji uprawnień (kto może dodawać/usuwać członków).

**Pliki**
- `tests/integration/database/rls-policies.test.ts` (l. 422-619)
- ew. migracje naprawcze

**Zakres**
1. Zdjąć `describe.skip` z obu grup i `it.skip` z QR; naprawić wg diagnozy z M1-02.
2. Dopisać brakujący scenariusz, jeśli go nie ma: **member (nie-owner/admin) nie może dodać ani usunąć członka** (eskalacja uprawnień przez `workspace_members`).
3. Dopisać scenariusz: użytkownik nie może czytać cudzego `profiles` (jest aktywny test l. 540 — upewnić się, że biega po zdjęciu describe.skip).

**Kryteria akceptacji**
- [ ] 0 markerów skip w całym `rls-policies.test.ts` (`grep -c "\.skip" → 0`)
- [ ] Cały plik zielony lokalnie i w CI
- [ ] Pokryte: izolacja qr_codes, profile self-only, zarządzanie członkami tylko owner/admin

---

### M1-05 `[test] Test regresyjny: soft-deleted lokalizacje niewidoczne na listach`

**Labels:** `faza:stabilizacja, typ:test, obszar:backend, P1` · **Estymacja:** 1 h · **Zależności:** brak

**Kontekst**
Review zewnętrzny zgłosił „bug: soft-deleted lokalizacje widoczne". Weryfikacja wykazała, że filtrowanie **istnieje** (`location.service.ts:186` `.eq("is_deleted", false)`, `:521` check przy pojedynczym GET; funkcje RPC w `20260130150000_add_rls_bypass_functions.sql:117,181,201` filtrują `l.is_deleted = false`). Brakuje jednak testu, który by to gwarantował — regresja byłaby niewidoczna.

**Pliki**
- `tests/integration/api/locations/locations.test.ts` (dopisać przypadki)

**Zakres**
1. Test: utwórz lokalizację → DELETE (soft) → GET `/api/locations` nie zawiera jej; GET `/api/locations/[id]` zwraca 404.
2. Test: lokalizacja-dziecko usuniętego rodzica — sprawdzić zachowanie drzewa (dokumentowane w `db-plan.md`: boxy odpinane, dzieci?) — jeśli zachowanie niejasne, opisać faktyczne w asercji + komentarz.

**Kryteria akceptacji**
- [ ] Oba testy zielone w CI; usunięcie filtra `is_deleted` w serwisie wywala test (sprawdzić mutacyjnie raz, lokalnie)

---

### M1-06 `[refactor] Konsolidacja 19 zduplikowanych klas błędów do errors.ts + pole code`

**Labels:** `faza:stabilizacja, typ:refactor, obszar:backend, P0` · **Estymacja:** 4 h · **Zależności:** M1-01

**Kontekst**
19 klas błędów jest zdefiniowanych podwójnie — lokalnie w serwisach (rozszerzają gołe `Error`) i centralnie w `errors.ts` (rozszerzają `AppError` ze `statusCode`):
- `box.service.ts:18-66`: `QrCodeAlreadyAssignedError`, `QrCodeNotFoundError`, `LocationNotFoundError`, `WorkspaceMismatchError`, `BoxNotFoundError`
- `location.service.ts:9-53`: `WorkspaceMembershipError`, `ParentNotFoundError`, `MaxDepthExceededError`, `SiblingConflictError`, `NotFoundError`, `ConflictError`, `ForbiddenError`
- `workspace.service.ts:17-67`: `InsufficientPermissionsError`, `DuplicateMemberError`, `InvalidOperationError`, `OwnerRemovalError`, `WorkspaceNotFoundError`, `WorkspaceOwnershipError`
- `qr-code.service.ts:9`: `QrCodeNotFoundError`

12 plików endpointów w `src/pages/api/**` importuje wersje **z serwisów**, więc `instanceof` nigdy nie złapie wersji z `errors.ts`. Dodatkowo `AppError` (errors.ts:10-19) ma `statusCode`, ale **nie ma maszynowego `code`** (potrzebnego później pod i18n komunikatów, M3-12), a `box.service.ts:155,158,185` rzuca surowe `new Error("polski komunikat")`.

**Pliki**
- `src/lib/services/errors.ts` (jedyne źródło)
- `src/lib/services/{box,location,workspace,qr-code}.service.ts` (usunięcie duplikatów)
- `src/pages/api/**` — 12 plików (poprawa importów): `workspaces.ts`, `boxes.ts`, `qr-codes/{index,batch,[short_id]}.ts`, `workspaces/[workspace_id].ts`, `workspaces/[workspace_id]/members.ts`, `workspaces/[workspace_id]/members/[user_id].ts`, `locations/{index,[id]}.ts`, `boxes/{check-duplicate,[id]}.ts`
- testy jednostkowe serwisów w `tests/unit/services/`

**Zakres**
1. Do `AppError` dodać `public readonly code: string` (konstruktor: `message, statusCode, code`); każdej klasie nadać stały kod, np. `WORKSPACE_NOT_FOUND`, `QR_ALREADY_ASSIGNED`, `MAX_DEPTH_EXCEEDED`.
2. Porównać sygnatury duplikatów (część lokalnych ma inne defaultowe message) — wyrównać do wersji `errors.ts`, przenosząc lepsze komunikaty tam.
3. Usunąć definicje lokalne z 4 serwisów; w serwisach importować z `./errors`.
4. Poprawić importy w 12 endpointach wprost na `@/lib/services/errors` (bez re-eksportów przejściowych — zmiana mechaniczna, jeden PR).
5. W `box.service.ts:154-158` zamienić surowe `Error` na `ForbiddenError` (kod 42501/PGRST301 → 403); `:185` → `QrCodeNotFoundError`/`QrCodeAlreadyAssignedError` zależnie od przyczyny.
6. Uruchomić testy jednostkowe i integracyjne — handlery łapią błędy przez `instanceof`, więc to główne ryzyko regresji.

**Kryteria akceptacji**
- [ ] `grep -rn "extends Error" src/lib/services/ | grep -v errors.ts` → 0 wyników
- [ ] `grep -rn "class .*Error" src/lib/services/*.service.ts` → 0 wyników
- [ ] Każda klasa w `errors.ts` ma `statusCode` + `code`
- [ ] `npm run test` i `npm run test:integration` zielone

---

### M1-07 `[db] Migracja: transakcyjna funkcja create_box_with_qr`

**Labels:** `faza:stabilizacja, typ:bug, obszar:db, P0` · **Estymacja:** 3 h · **Zależności:** M1-04 (stabilne, zweryfikowane polityki)

**Kontekst**
`box.service.ts:133-187`: tworzenie boxa to insert do `boxes`, a potem **osobny** update `qr_codes` (`box_id`, `status='assigned'`). Komentarz w kodzie (l. 183-184) wprost przyznaje: „Box was created but QR assignment failed... consider implementing transaction rollback". Race condition: dwa równoległe requesty mogą dostać ten sam wolny QR.
Schemat `qr_codes` (initial_schema.sql:149-164): `status public.qr_status` (enum: `generated/printed/assigned`), `box_id` UNIQUE FK, `short_id`. **Nie ma kolumny `assigned_at`** (szkic z planu głównego ją błędnie zakładał).

**Pliki**
- nowa migracja `supabase/migrations/YYYYMMDDHHmmss_create_box_with_qr_function.sql`
- `src/db/database.types.ts` (regeneracja: `supabase gen types typescript --local`)

**Zakres**
1. Migracja (lowercase, komentarz nagłówkowy — konwencja repo):

```sql
-- migration: transactional box creation with optional qr assignment
-- prevents orphaned boxes when qr update fails (box.service.ts step 4)
create or replace function public.create_box_with_qr(
  p_workspace_id uuid,
  p_name text,
  p_description text default null,
  p_tags text[] default null,
  p_location_id uuid default null,
  p_qr_code_id uuid default null
) returns public.boxes
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_box public.boxes;
begin
  insert into public.boxes (workspace_id, name, description, tags, location_id)
  values (p_workspace_id, p_name, p_description, p_tags, p_location_id)
  returning * into v_box;

  if p_qr_code_id is not null then
    update public.qr_codes
       set box_id = v_box.id,
           status = 'assigned'
     where id = p_qr_code_id
       and workspace_id = p_workspace_id
       and box_id is null;

    if not found then
      raise exception 'QR_ALREADY_ASSIGNED_OR_NOT_FOUND'
        using errcode = 'P0001';
    end if;
  end if;

  return v_box;
end;
$$;
```

Kluczowe decyzje:
- **`security invoker`** — RLS nadal obowiązuje wewnątrz funkcji (insert/update przejdą przez polityki); jawna autoryzacja zostaje w endpointcie.
- Warunek `and box_id is null` w UPDATE = atomowa ochrona przed podwójnym przypisaniem (race condition znika — UPDATE z warunkiem jest atomowy).
- `raise exception` cofa **cały** insert (funkcja plpgsql = jedna transakcja).
- Triggery (auto `short_id`, `search_vector`) działają normalnie przy insercie.
2. Test SQL w migracji-weryfikacji lub w `tests/integration/database/triggers.test.ts`: wywołanie z zajętym QR → wyjątek → box nie istnieje.
3. Regeneracja `database.types.ts` — przy okazji zniknie część rzutowań `(supabase.rpc as any)` (występują w `location.service.ts:261,381`).

**Kryteria akceptacji**
- [ ] `supabase db reset` przechodzi z nową migracją
- [ ] Test: QR przypisany/cudzy/nieistniejący → wyjątek, **0 nowych wierszy w `boxes`**
- [ ] Test: poprawny QR → box utworzony, QR `status='assigned'`, `box_id` ustawiony
- [ ] `database.types.ts` zawiera typ funkcji `create_box_with_qr`

---

### M1-08 `[backend] Przepięcie box.service.createBox na RPC create_box_with_qr`

**Labels:** `faza:stabilizacja, typ:bug, obszar:backend, P0` · **Estymacja:** 2 h · **Zależności:** M1-07, M1-06

**Kontekst**
Po M1-07 funkcja istnieje w DB — trzeba przepiąć serwis i zmapować nowy błąd.

**Pliki**
- `src/lib/services/box.service.ts` (l. 129-194: kroki 3-4 zastąpione jednym `rpc`)
- `src/pages/api/boxes.ts` / `boxes/index.ts` (mapowanie błędu na HTTP, jeśli nie łapie go już handler)
- `tests/integration/api/boxes/boxes.test.ts`

**Zakres**
1. Zastąpić sekwencję insert→update wywołaniem `supabase.rpc("create_box_with_qr", {...})` (typowane po regeneracji typów — bez `as any`).
2. Mapowanie błędów: komunikat `QR_ALREADY_ASSIGNED_OR_NOT_FOUND` → `QrCodeAlreadyAssignedError` (z `errors.ts`, po M1-06) → HTTP 409; kod `42501` → `ForbiddenError` → 403.
3. Zachować walidacje wstępne (lokalizacja należy do workspace — l. 100-127) — zostają w serwisie przed RPC.
4. Testy integracyjne: scenariusz „QR już przypisany → 409 i box NIE istnieje" (to jest właściwy dowód naprawy buga); odblokować powiązane skipy w `boxes.test.ts`, jeśli dotyczą tego przepływu.

**Kryteria akceptacji**
- [ ] `createBox` wykonuje dokładnie jedno wywołanie DB (RPC) dla insertu+przypisania
- [ ] Test: konflikt QR → 409, `select count(*) from boxes` bez zmian
- [ ] Testy boxes zielone w CI

---

### M1-09 `[refactor] Usunięcie martwego kodu: theme.store.ts, workspace.store.ts`

**Labels:** `faza:stabilizacja, typ:refactor, obszar:frontend, P1` · **Estymacja:** 1 h · **Zależności:** brak

**Kontekst**
Zweryfikowane importy:
- `src/lib/stores/theme.store.ts` — **0 importerów** (motyw obsługuje duet `ThemeInitializer.astro` + `useTheme.ts`, spójnie na kluczu localStorage `"theme"`; store używał `"theme-mode"` — stąd pozorny „bug niespójnego klucza" z review, który znika wraz z plikiem)
- `src/lib/stores/workspace.store.ts` — **0 importerów** (stan workspace trzyma `src/stores/dashboard.ts`, 7 importerów)
- `src/lib/stores/auth.store.ts` — **używany** przez `LoginForm.tsx`, `RegistrationForm.tsx` — NIE usuwać; tylko przejrzeć, czy używane są wszystkie eksporty (martwe helpery wyciąć)

**Pliki**
- `src/lib/stores/theme.store.ts` (delete), `src/lib/stores/workspace.store.ts` (delete)
- `src/lib/stores/auth.store.ts` (przegląd eksportów)
- ew. testy jednostkowe tych store'ów w `tests/unit/`

**Zakres**
1. Usunąć oba martwe pliki + ich testy jednostkowe (jeśli istnieją).
2. `grep` po nazwach eksportów z `auth.store.ts` — nieużywane funkcje wyciąć, używane zostawić bez zmian.
3. Build + testy.

**Kryteria akceptacji**
- [ ] `npm run build` przechodzi; `grep -rn "theme.store\|workspace.store" src/` → 0
- [ ] Motyw działa: przełączenie w ustawieniach → reload → motyw zachowany (sprawdzić ręcznie)

---

### M1-10 `[backend] Middleware: logger zamiast console.log, bez prefiksów tokenów`

**Labels:** `faza:stabilizacja, typ:refactor, obszar:backend, P1` · **Estymacja:** 1 h · **Zależności:** brak

**Kontekst**
`src/middleware/index.ts:34-42` loguje przez `console.log` zawartość sesji, w tym `accessTokenPrefix: access_token.substring(0, 20)`. Prefiks JWT sam w sobie nie jest sekretem (to nagłówek base64), ale logowanie fragmentów credentiali to zły wzorzec i szum w logach produkcyjnych; projekt ma własny logger (`src/lib/services/logger.ts`, winston).

**Pliki**
- `src/middleware/index.ts` (wszystkie `console.log` — sprawdzić cały plik, nie tylko l. 34-42)

**Zakres**
1. Zamienić `console.log` na `log.debug` (poziom debug — niewidoczny na produkcji przy domyślnej konfiguracji).
2. Usunąć pole `accessTokenPrefix`; zostawić tylko boolean `hasAccessToken`/`hasRefreshToken`.
3. Przejrzeć resztę middleware pod kątem innych `console.*`.

**Kryteria akceptacji**
- [ ] `grep -n "console\." src/middleware/index.ts` → 0
- [ ] Żaden log nie zawiera fragmentu tokenu; logowanie działa (smoke lokalny)

---

### M1-11 `[backend] Zod dla /api/auth/session + centralny mapper błędów API`

**Labels:** `faza:stabilizacja, typ:refactor, obszar:backend, P1` · **Estymacja:** 3 h · **Zależności:** M1-06

**Kontekst**
`src/pages/api/auth/session.ts:25-40` waliduje body ręcznie (`body as { token?: string... }` + ify) — jedyny endpoint bez Zod. Ponadto kształt odpowiedzi błędów różni się między endpointami (`{ error: "..." }` vs `{ error: "...", details }`), a mapowanie wyjątków na statusy HTTP jest powielone w 12 handlerach (drabinki `instanceof`).

**Pliki**
- `src/pages/api/auth/session.ts`
- nowy `src/lib/api/responses.ts` (mapper + helpery odpowiedzi)
- stopniowo: pozostałe endpointy w `src/pages/api/**` (mechaniczna podmiana drabinek na mapper)

**Zakres**
1. Schemat Zod dla session: `z.object({ token: z.string().min(1), refreshToken: z.string().min(1) })`; zachować obecne kody odpowiedzi.
2. Nowy moduł `src/lib/api/responses.ts`:
   - `jsonResponse(data, status)` — sukcesy,
   - `errorResponse(error: unknown)` — jeśli `error instanceof AppError` → `{ error: { code: error.code, message: error.message } }` ze statusem `error.statusCode`; `ZodError` → 400 z `details`; inaczej → 500 generyczne + `log.error`.
3. Podmienić drabinki `instanceof` w endpointach na `return errorResponse(error)` — zacząć od auth + boxes, resztę mechanicznie (jeśli przekracza estymację — podział: pozostałe endpointy jako kontynuacja w M3-01/02 przy standaryzacji autoryzacji).
4. Zaktualizować asercje testów integracyjnych na nowy kształt `{ error: { code, message } }`.

**Kryteria akceptacji**
- [ ] `session.ts` używa Zod; brak rzutowań `body as {…}`
- [ ] Wszystkie odpowiedzi błędów (przerobione endpointy) mają kształt `{ error: { code, message } }`
- [ ] Testy integracyjne zielone po aktualizacji asercji

---

## 4. Czego w M1 świadomie NIE ma (i dlaczego)

- **Odblokowanie ~140 pozostałych skipów** w `tests/integration/api/**` (boxes — 31, locations — 31, workspaces — 35, inne) → M4-06/07. W M1 tylko RLS (bezpieczeństwo) — reszta to regresja funkcjonalna, ważna, ale nie blokuje prac M2/M3. Uwaga: skala jest większa, niż zakładał plan główny (~156 markerów, nie 46+66) — przy planowaniu M4 zrewidować estymaty.
- **GDPR / service-role deletion** → M3-06 (wymaga decyzji produktowej o solo-ownerze).
- **Dekompozycja DashboardContainer/useBoxForm** → M3 (ryzyko konfliktów z pracami mobile w M2).
- **Standaryzacja autoryzacji we wszystkich endpointach** → M3-01/02 (fundament — mapper błędów — powstaje tu w M1-11).

## 5. Definicja ukończenia M1

- [ ] `npm run lint` → 0/0; CI w pełni zielone na `test`
- [ ] `rls-policies.test.ts` bez żadnego skipa, wszystkie testy zielone — izolacja multi-tenant **udowodniona testami**
- [ ] Tworzenie box+QR atomowe (RPC), regresja pokryta testem 409
- [ ] Jedno źródło klas błędów z polami `statusCode` + `code`; spójny kształt odpowiedzi błędów w przerobionych endpointach
- [ ] Zero martwych store'ów; middleware bez `console.*`
- [ ] Wszystkie issues M1 zamknięte na boardzie, wnioski z M1-02 odzwierciedlone w opisach zadań M4

---

## 6. Issues na GitHubie (UTWORZONE 2026-06-12)

Wsad z tego dokumentu został przeniesiony 1:1 do GitHub Issues — milestone **M1 — Stabilizacja** (#14, due 2026-07-12), board: https://github.com/users/DarioRSL/projects/1 (pole `Sprint`):

| Zadanie | Issue | Sprint |
|---|---|---|
| B-01 Etykiety i milestony | **#166** | Tydz. 1 |
| B-02 Board + skrypt issues | **#167** | Tydz. 1 |
| M1-01 ESLint / worktree | **#168** | Tydz. 1 |
| M1-02 Diagnoza skipów RLS | **#169** | Tydz. 2 |
| M1-03 RLS: workspaces/locations/boxes | **#170** | Tydz. 2 |
| M1-04 RLS: qr/profiles/members | **#171** | Tydz. 3 |
| M1-05 Test regresyjny soft-delete | **#172** | Tydz. 2 |
| M1-06 Konsolidacja klas błędów | **#173** | Tydz. 3 |
| M1-07 Migracja RPC create_box_with_qr | **#174** | Tydz. 4 |
| M1-08 Przepięcie box.service na RPC | **#175** | Tydz. 4 |
| M1-09 Usunięcie martwych store'ów | **#176** | Tydz. 1 |
| M1-10 Middleware → logger | **#177** | Tydz. 1 |
| M1-11 Zod session + mapper błędów | **#178** | Tydz. 4 |

Zależności wpisane jako komentarze `Blocked by #nr`. Powiązane stare issues: **#111–#116** (TC-RLS-001..006) — scenariusze wcielone do #169–#171 (rekomendowane do zamknięcia po ich realizacji).
