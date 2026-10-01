# M3 — Refaktoryzacja + GDPR (+i18n stretch): szczegółowy zakres prac i wsad pod GitHub Issues

> Uszczegółowienie milestone'u M3 z `refactoring-launch-plan.md` (milestone GitHub #16, due 2026-09-06).
> Wszystkie założenia **zweryfikowane bezpośrednio w kodzie** (2026-06-12).
> Zależności od M1: konsolidacja błędów (#173), mapper odpowiedzi (#178), zielone testy RLS (#170/#171).

---

## 1. Weryfikacja założeń planu — korekty i odkrycia

| # | Założenie z planu | Stan faktyczny po weryfikacji | Wpływ na plan |
|---|---|---|---|
| 1 | „3 niespójne wzorce autoryzacji" | Są **4 wzorce**: (a) współdzielony helper `isWorkspaceMember` — istnieje w `qr-code.service.ts:155`, używany tylko przez 2 endpointy QR; (b) inline query członkostwa — `export/inventory.ts:99` (zduplikowana logika helpera); (c) SECURITY DEFINER RPC z `p_user_id` — locations (`get_workspace_locations`), workspaces (`create_workspace_for_user`); (d) implicit RLS + łapanie kodu `42501` — boxes (`boxes.ts:127`) | Helper już istnieje — zadanie to **przeniesienie do współdzielonego modułu i rozszerzenie o role**, nie pisanie od zera |
| 2 | *(nowe odkrycie)* | **Rola `read_only` nie jest egzekwowana przy zapisach.** Polityki RLS dla locations/boxes/qr_codes używają `is_workspace_member()` dla WSZYSTKICH operacji (SELECT/INSERT/UPDATE/DELETE) — członek z rolą `read_only` może modyfikować dane. Role enum: `owner/admin/member/read_only`. Jedyne sprawdzenia ról: `workspace.service.ts:301-319` (zarządzanie członkami — owner/admin) | **Nowe zadanie w M3-02**: decyzja + egzekwowanie minimalnej roli dla zapisów w warstwie aplikacji |
| 3 | „DashboardContainer 365 LOC god-component" | Potwierdzone (dokładnie 365 LOC). Struktura: 3× `useEffect` synchronizujący wyniki hooków do atomów nanostores (wątpliwa duplikacja stanu), surowy `fetch` profilu (l. 88-102, z pominięciem `apiFetch`), stan 3 modali, obiekt `actions` z **5× powtórzonym wzorcem** try/setIsSubmitting/apiFetch/refetch/catch/redirect (l. 140-263). Hooki danych (`useWorkspaces`, `useLocations`, `useBoxes`) **już istnieją i są używane** — dekompozycja to wydzielenie sync+mutacji, nie przepisywanie fetchowania | Potwierdzone; dekompozycja na 3 hooki: dane+sync / modale / mutacje (ze wspólnym wrapperem mutacji likwidującym 5× duplikację) |
| 4 | „useBoxForm 467 LOC" | Potwierdzone (467 LOC). Odpowiedzialności: stan formularza (l. 92-98), 3 loadery (lokacje l. 100, QR l. 117, box l. 133), `submitForm` ~108 linii (l. 265-373), `deleteBox` (l. 373), `generateQRCodeBatch` (l. 413) | Potwierdzone; podział: loadery / stan+walidacja / mutacje |
| 5 | „GDPR: brak usunięcia auth.users (TODO l. 171)" | Potwierdzone — i więcej: **(a) brak re-autoryzacji** — `delete-account.ts` wymaga tylko sesji, bez potwierdzenia hasłem przy nieodwracalnej operacji; **(b) ręczna 7-krokowa kaskada w `auth.service.ts` jest w większości zbędna** — schemat ma `on delete cascade` po `workspace_id` na boxes/locations/qr_codes/workspace_members oraz `workspace_members.user_id → profiles` cascade i `profiles.id → auth.users` cascade. Jedyny FK **bez** kaskady: `workspaces.owner_id → profiles` (NOT NULL) — dlatego kolejność: najpierw usunąć własne workspace'y, potem `auth.admin.deleteUser` (kaskaduje profil + członkostwa w cudzych workspace'ach) | M3-06 **upraszcza** serwis zamiast go rozbudowywać: 2 kroki zamiast 7 + re-auth + admin API |
| 6 | „Service role key — brak w kodzie" | Potwierdzone: 0 referencji `SERVICE_ROLE` w `src/` i `.env.example`. **Wzorzec admin-klienta już istnieje** w `tests/helpers/supabase-test-client.ts:20,65` (używa `TEST_SUPABASE_SERVICE_ROLE_KEY` — sekret jest już skonfigurowany w CI) | Wzorzec do skopiowania; do env produkcyjnych trzeba dodać klucz |
| 7 | „i18n: brak infrastruktury" | Potwierdzone: 0 bibliotek i18n w `package.json`. Skala: **44 pliki .tsx z polskimi znakami** (411 wystąpień znaków diakrytycznych) + strony `.astro` + komunikaty w walidatorach Zod i serwisach. Realna skala bliżej **60 plików** | Estymata 15 h jest napięta — status stretch potwierdzony; ekstrakcja per-obszar umożliwia częściowe wykonanie |
| 8 | *(uwaga architektoniczna)* | `src/lib/api/endpoints.ts` to **kliencki** typed API wrapper (`apiClient` używany przez hooki). Planowany w M1-11 `src/lib/api/responses.ts` to kod **serwerowy**. Oba wylądują w tym samym katalogu | W M3-01 helper autoryzacji nazwać jednoznacznie serwerowo: `src/lib/api/guards.ts`; rozdział klient/serwer odnotować w README katalogu |

**Skorygowany budżet M3 core: ~21 h** (było 18 h — doszło egzekwowanie ról `read_only` i re-auth przy usuwaniu konta) + **15 h i18n stretch**.

---

## 2. Przegląd zadań M3 i kolejność wykonania

```
M3-01 Helper requireWorkspaceMember + przepięcie workspaces/locations (3h)  [po M1: #173, #178, #171]
M3-02 Przepięcie boxes/qr/export + egzekwowanie ról przy zapisach (3h)      [po M3-01]
M3-03 Dekompozycja DashboardContainer: dane + mutacje (3h)                  [po M2-10 — mobile zamknięte]
M3-04 Dekompozycja DashboardContainer: modale + finalizacja (3h)            [po M3-03]
M3-05 Podział useBoxForm (3h, P2)                                           [po M3-04]
M3-06 GDPR: admin client + uproszczona kaskada + re-auth (4h)               [po #171; równolegle do M3-01..05]
M3-07 Testy integracyjne GDPR (2h)                                          [po M3-06]
--- stretch (tylko przy budżecie > 110 h) ---
M3-08 Paraglide JS + infrastruktura locale (3h)
M3-09 Ekstrakcja stringów: auth + landing (3h)        → M3-08
M3-10 Ekstrakcja stringów: dashboard (4h)             → M3-09
M3-11 Ekstrakcja stringów: box/settings/qr/scan (3h)  → M3-10
M3-12 Kody błędów API zamiast PL/EN (2h)              → M3-08 + #178
```

Sugerowany rytm (4 tygodnie, core):
- **Tydz. 9:** M3-06, M3-07 (6 h) — GDPR najpierw (P0, niezależne od reszty)
- **Tydz. 10:** M3-01, M3-02 (6 h) — autoryzacja
- **Tydz. 11:** M3-03, M3-04 (6 h) — dashboard
- **Tydz. 12:** M3-05 (3 h) + bufor / start i18n jeśli budżet pozwala

---

## 3. Decyzje produktowe do podjęcia PRZED startem M3

1. **Konto solo-ownera workspace'u z innymi członkami** (blokuje M3-06): usunięcie konta właściciela kasuje workspace razem z danymi, do których inni członkowie mają dostęp. Opcje: (a) kasacja z wyraźnym ostrzeżeniem w 2-krokowym potwierdzeniu *(rekomendacja — najprostsze, zgodne z RODO)*, (b) blokada usunięcia konta dopóki workspace ma innych członków (wymusza transfer/usunięcie ręczne), (c) automatyczny transfer własności najstarszemu adminowi.
2. **Egzekwowanie roli `read_only`** (blokuje M3-02): czy rola ma realnie blokować zapisy? Opcje: (a) tak — minimalna rola `member` dla INSERT/UPDATE/DELETE, egzekwowana w warstwie API *(rekomendacja)*, docelowo też w RLS (osobna migracja, może czekać do M4); (b) nie — usunąć rolę z enuma/UI, żeby nie obiecywała czegoś, czego nie robi.
3. **Re-auth przy usuwaniu konta** (kształtuje M3-06): potwierdzenie hasłem (rekomendacja, wymaga pola w UI) czy fraza potwierdzająca „USUŃ KONTO" (słabsze, ale bez zmian w przepływie auth)?

---

## 4. Wsad issues — gotowe treści

---

### M3-01 `[backend] Współdzielony guard requireWorkspaceMember + przepięcie workspaces i locations`

**Labels:** `faza:core, typ:refactor, obszar:backend, P1` · **Estymacja:** 3 h · **Zależności:** #173 (M1-06), #178 (M1-11), #171 (M1-04)

**Kontekst**
W kodzie funkcjonują 4 wzorce autoryzacji workspace:
- (a) helper `isWorkspaceMember(supabase, workspaceId, userId)` w `qr-code.service.ts:155` — używany tylko przez `qr-codes/index.ts` i `qr-codes/batch.ts`
- (b) inline query członkostwa w `export/inventory.ts:99-116` (duplikat logiki helpera)
- (c) SECURITY DEFINER RPC z `p_user_id` — `location.service.ts:261,381` (`get_workspace_locations`), `workspace.service.ts:94` (`create_workspace_for_user`)
- (d) implicit RLS + łapanie `42501` — `boxes.ts:127`

Cel: jeden jawny guard na początku każdego endpointu operującego na danych workspace; RLS zostaje jako druga warstwa obrony.

**Pliki**
- nowy `src/lib/api/guards.ts` (serwerowy — odróżnić od klienckiego `src/lib/api/endpoints.ts`!)
- `src/lib/services/qr-code.service.ts` (przeniesienie helpera, zostawienie re-eksportu lub poprawa importów)
- `src/pages/api/workspaces.ts`, `src/pages/api/workspaces/[workspace_id].ts`, `.../members.ts`, `.../members/[user_id].ts`
- `src/pages/api/locations/index.ts`, `src/pages/api/locations/[id].ts`

**Zakres**
1. Przenieść `isWorkspaceMember` z `qr-code.service.ts:155` do `src/lib/api/guards.ts`; dodać wariant rzucający:
   ```ts
   // guards.ts — server-only
   export async function requireWorkspaceMember(
     supabase: SupabaseClient,
     workspaceId: string,
     userId: string,
     minRole: "read_only" | "member" | "admin" | "owner" = "read_only"
   ): Promise<void> // rzuca ForbiddenError (errors.ts) gdy brak członkostwa/roli
   ```
   Hierarchia ról: `owner > admin > member > read_only`. Jedno query do `workspace_members` zwracające rolę (nie dwa).
2. Przepiąć endpointy workspaces: zarządzanie członkami używa już inline role-checków w `workspace.service.ts:301-319` — zastąpić wywołaniem guarda z `minRole: "admin"`, logika domenowa (np. zakaz usunięcia ostatniego ownera) zostaje w serwisie.
3. Przepiąć endpointy locations: jawny guard PRZED wywołaniem RPC (RPC nadal weryfikuje wewnętrznie — defense in depth).
4. README-komentarz w `src/lib/api/`: który plik jest kliencki (`endpoints.ts`, `api-client`), a który serwerowy (`guards.ts`, `responses.ts`).

**Kryteria akceptacji**
- [ ] `guards.ts` istnieje; `qr-code.service.ts` nie definiuje własnego helpera
- [ ] Wszystkie endpointy workspaces i locations zaczynają od `requireWorkspaceMember` (grep)
- [ ] Brak inline query członkostwa poza `guards.ts`
- [ ] Testy integracyjne workspaces/locations zielone

---

### M3-02 `[backend] Przepięcie boxes/qr/export na guard + egzekwowanie roli read_only przy zapisach`

**Labels:** `faza:core, typ:refactor, obszar:backend, P1` · **Estymacja:** 3 h · **Zależności:** M3-01 + decyzja produktowa #2 (sekcja 3)

**Kontekst**
Endpointy boxes polegają wyłącznie na RLS (łapią `42501` post-factum — `boxes.ts:127`); export ma własny inline check; QR używa starego helpera. **Odkrycie:** polityki RLS używają `is_workspace_member()` dla wszystkich operacji, więc rola `read_only` jest czysto kosmetyczna — członek read_only może dziś tworzyć/edytować/usuwać boxy, lokalizacje i QR.

**Pliki**
- `src/pages/api/boxes.ts`, `src/pages/api/boxes/[id].ts`, `src/pages/api/boxes/check-duplicate.ts`
- `src/pages/api/qr-codes/index.ts`, `.../batch.ts`, `.../[short_id].ts`
- `src/pages/api/export/inventory.ts`
- testy integracyjne odpowiednich endpointów

**Zakres**
1. Wszystkie odczyty: `requireWorkspaceMember(..., "read_only")`; wszystkie zapisy (POST/PATCH/DELETE na boxes, locations — uzupełnić w ramach tego zadania jeśli M3-01 dał tylko członkostwo — qr batch): `minRole: "member"` (zgodnie z decyzją produktową).
2. `export/inventory.ts`: usunąć inline query (l. 99-116) → guard.
3. Usunąć łapanie `42501` jako głównego mechanizmu w boxes (zostaje jako fallback defense-in-depth z logiem `log.warn` — jeśli RLS odrzuci coś, co przeszło guard, to sygnał błędu w politykach).
4. Testy: nowy scenariusz „member z rolą read_only dostaje 403 przy POST /api/boxes" (+ analogiczne dla locations i qr batch).
5. NIE zmieniamy w tym zadaniu polityk RLS (rozszerzenie polityk o role = osobne issue do M4, założyć przy realizacji).

**Kryteria akceptacji**
- [ ] Każdy endpoint boxes/qr/export zaczyna od guarda z właściwą minimalną rolą
- [ ] Test: `read_only` może GET, dostaje 403 na POST/PATCH/DELETE
- [ ] Założone follow-up issue: „RLS: rozróżnienie ról w politykach INSERT/UPDATE/DELETE"
- [ ] Testy integracyjne zielone

---

### M3-03 `[refactor] Dekompozycja DashboardContainer — useDashboardData + useDashboardMutations`

**Labels:** `faza:core, typ:refactor, obszar:frontend, P1` · **Estymacja:** 3 h · **Zależności:** M2-10 (zamknięte prace mobile na dashboardzie — unikamy konfliktów)

**Kontekst**
`DashboardContainer.tsx` (365 LOC) łączy: 3× `useEffect` kopiujący wyniki hooków (`useWorkspaces/useLocations/useBoxes` — już istnieją, l. 41-54) do atomów nanostores (l. 71-85), surowy `fetch("/api/profiles/me")` z pominięciem `apiFetch` (l. 88-102), oraz obiekt `actions` z 5× powtórzonym wzorcem mutacji: `setIsSubmitting → apiFetch → refetch → catch(shouldRedirectToLogin → redirect; getUserFriendlyErrorMessage → setError) → finally` (submitLocationEditor l. 140, submitBoxEditor l. 188, deleteLocation l. 216, deleteBox l. 241, switchWorkspace l. 265).

**Pliki**
- `src/components/dashboard/DashboardContainer.tsx`
- nowe: `src/components/hooks/useDashboardData.ts`, `src/components/hooks/useDashboardMutations.ts`
- `src/lib/api/endpoints.ts` (użyć typowanego `apiClient` zamiast surowych ścieżek w mutacjach)

**Zakres**
1. `useDashboardData()`: woła `useWorkspaces/useLocations/useBoxes`, synchronizuje do atomów (3 useEffect-y przenoszą się 1:1), pobiera profil przez **`apiFetch`/`apiClient`** (naprawa odstępstwa z l. 91); zwraca `{ workspaces, locations, boxes, totalCount, loading*, errors*, refetchLocations, refetchBoxes }`.
2. `useDashboardMutations({ refetchLocations, refetchBoxes })`: wspólny wrapper
   ```ts
   const runMutation = async (fn: () => Promise<void>) => { /* setIsSubmitting, catch z redirect/setError, finally */ }
   ```
   i na nim: `submitLocation`, `submitBox`, `deleteLocation`, `deleteBox`, `switchWorkspace`. Likwiduje 5× duplikację (~120 LOC → ~50 LOC).
3. Kontener po zmianie: składa hooki + context + render. Zero zmian zachowania — UI i kontrakt `DashboardContextType` bez zmian.
4. Testy jednostkowe nowych hooków (wzorce z `tests/unit/hooks/`).

**Kryteria akceptacji**
- [ ] `DashboardContainer.tsx` < 200 LOC (po M3-04 < 150)
- [ ] Zero surowych `fetch(` w komponencie (grep)
- [ ] Brak zmian w `DashboardContextType` — komponenty-dzieci nietknięte
- [ ] E2E dashboardu zielone (create-box, delete-box specs)

---

### M3-04 `[refactor] Dekompozycja DashboardContainer — useModalState + finalizacja`

**Labels:** `faza:core, typ:refactor, obszar:frontend, P1` · **Estymacja:** 3 h · **Zależności:** M3-03

**Kontekst**
Pozostała odpowiedzialność kontenera: stan modali (`activeModal`, `modalData` — l. 57-67) i ich akcje open/close (l. 130-186) oraz render 3 modali (l. 324-361). Smelle do naprawy przy okazji: (a) `openDeleteConfirm` ustawia `mode: "create"` bezsensownie (l. 179); (b) `DeleteConfirmationDialog` ma sklejany polski tekst z błędem gramatycznym — „usunąć **tę** pudełko" (l. 350); (c) `itemName=""` zawsze puste (l. 351) — dialog nie pokazuje, co usuwa.

**Pliki**
- `src/components/hooks/useModalState.ts` (nowy)
- `src/components/dashboard/DashboardContainer.tsx`
- `src/components/dashboard/DeleteConfirmationDialog.tsx` (poprawka tekstu + itemName)

**Zakres**
1. `useModalState()`: dyskryminowana unia zamiast luźnego `modalData`:
   ```ts
   type ModalState =
     | { kind: "closed" }
     | { kind: "location-editor"; mode: "create" | "edit"; itemId?: string; parentId?: string }
     | { kind: "box-editor"; mode: "create" | "edit"; itemId?: string }
     | { kind: "delete-confirm"; itemType: "location" | "box"; itemId: string; itemName: string };
   ```
   (typ uniemożliwia stany bezsensowne — naprawa smelli a/c z definicji).
2. Akcje open/close przenoszą się do hooka; `openDeleteConfirm` przyjmuje `itemName` (nazwa boxa/lokalizacji z listy) i przekazuje do dialogu.
3. Poprawić teksty dialogu: „Usunąć lokalizację?"/„Usunąć pudełko?" + „Czy na pewno chcesz usunąć «{itemName}»?" (poprawna gramatyka dla obu rodzajów).
4. Finalna struktura kontenera: `useDashboardData` + `useDashboardMutations` + `useModalState` + context + render.

**Kryteria akceptacji**
- [ ] `DashboardContainer.tsx` < 150 LOC
- [ ] Dialog usuwania pokazuje nazwę usuwanego elementu i poprawny gramatycznie tekst
- [ ] Stan modali to dyskryminowana unia (niemożliwe stany niemożliwe)
- [ ] E2E dashboardu zielone

---

### M3-05 `[refactor] Podział useBoxForm (467 LOC) na loadery, stan i mutacje`

**Labels:** `faza:core, typ:refactor, obszar:frontend, P2` · **Estymacja:** 3 h · **Zależności:** M3-04

**Kontekst**
`useBoxForm.ts` (467 LOC) łączy: stan formularza (l. 92-98), 3 loadery danych (lokacje l. 100, dostępne QR l. 117, dane boxa w trybie edit l. 133) z orkiestracją w useEffect (l. 167-196), settery pól/błędów (l. 222-242), `submitForm` o długości ~108 linii (l. 265-373), `deleteBox` (l. 373) i `generateQRCodeBatch` (l. 413). W `tests/unit/hooks/useBoxForm.test.ts` są 3 skipy („module mocking issues") — podział powinien je odblokować.

**Pliki**
- `src/components/hooks/useBoxForm.ts` → rozdzielony na:
  - `src/components/hooks/useBoxFormData.ts` (loadery: lokacje, QR, box)
  - `src/components/hooks/useBoxFormState.ts` (pola, walidacja, dirty-tracking)
  - `useBoxForm.ts` zostaje jako cienka kompozycja + mutacje (submit/delete/generateQR)
- `tests/unit/hooks/useBoxForm.test.ts` (odblokowanie 3 skipów)

**Zakres**
1. Wydzielić loadery do `useBoxFormData(mode, boxId, workspaceId)` — czyste fetchowanie, bez stanu formularza.
2. Wydzielić stan do `useBoxFormState(initial)` — settery, walidacja, reset; bez I/O (testowalny bez mocków sieci).
3. `submitForm` rozbić wewnętrznie: walidacja → budowa payloadu → wywołanie API → obsługa wyniku (4 nazwane funkcje zamiast 108-liniowego bloku).
4. Publiczny interfejs `UseBoxFormReturn` bez zmian — `BoxForm.tsx` nietknięty.
5. Odblokować 3 skipy w testach (po podziale mocki stają się trywialne — stan testowalny bez modułów sieciowych).

**Kryteria akceptacji**
- [ ] Żaden z plików hooków > 200 LOC
- [ ] `UseBoxFormReturn` niezmieniony; `BoxForm.tsx` bez modyfikacji
- [ ] 0 skipów w `useBoxForm.test.ts`
- [ ] Formularz boxa działa: create, edit, delete, generowanie QR (smoke manualny + e2e)

---

### M3-06 `[backend] GDPR: pełne usunięcie konta — admin client, uproszczona kaskada, re-autoryzacja`

**Labels:** `faza:launch, typ:feature, obszar:backend, P0` · **Estymacja:** 4 h · **Zależności:** #171 (M1-04) + decyzje produktowe #1 i #3 (sekcja 3)

**Kontekst**
Trzy zweryfikowane problemy obecnej implementacji:
1. `auth.service.ts:167-174` (TODO): rekord `auth.users` nie jest kasowany → e-mail zostaje zajęty na zawsze, niezgodność z RODO.
2. `delete-account.ts` nie wymaga **re-autoryzacji** — wystarczy ważna sesja (skradziona sesja = nieodwracalna kasacja konta).
3. Ręczna 7-krokowa kaskada (`auth.service.ts:72-165`) jest w większości **zbędna i nieatomowa** — schemat ma kaskady FK: boxes/locations/qr_codes/workspace_members kaskadują po `workspace_id`; `workspace_members.user_id` i `profiles.id` kaskadują w dół od `auth.users`. Jedyny FK bez kaskady: `workspaces.owner_id → profiles` (NOT NULL).

Poprawna minimalna sekwencja: **(1) re-auth → (2) DELETE workspace'y własne (kaskada czyści całą zawartość) → (3) `auth.admin.deleteUser(userId)` (kaskada czyści profil i członkostwa w cudzych workspace'ach)**.

Wzorzec admin-klienta istnieje w `tests/helpers/supabase-test-client.ts:20,65` (sekret `TEST_SUPABASE_SERVICE_ROLE_KEY` już skonfigurowany w CI).

**Pliki**
- nowy `src/lib/services/auth-admin.service.ts`
- `src/lib/services/auth.service.ts` (uproszczenie `deleteUserAccount`)
- `src/pages/api/auth/delete-account.ts` (re-auth + body)
- `src/components/settings/DangerZoneSection.tsx` (pole hasła w potwierdzeniu)
- `.env.example`, env Vercel (PROD) i serwera TEST: `SUPABASE_SERVICE_ROLE_KEY`
- `eslint.config.js` (reguła no-restricted-imports)

**Zakres**
1. `auth-admin.service.ts`:
   ```ts
   import { createClient } from "@supabase/supabase-js";
   // KLUCZ TYLKO PO STRONIE SERWERA — nigdy PUBLIC_*
   const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
     auth: { autoRefreshToken: false, persistSession: false },
   });
   export async function deleteAuthUser(userId: string): Promise<void> // auth.admin.deleteUser + mapowanie błędów
   ```
   Rzucić czytelny błąd przy braku env (fail-fast na starcie requestu, nie w połowie kasacji).
2. Reguła ESLint `no-restricted-imports`: zakaz importu `auth-admin.service` poza `src/pages/api/**` i `src/lib/services/auth.service.ts`.
3. Uproszczenie `deleteUserAccount`: usunąć kroki 3a-3d (l. 72-139 — kaskady FK robią to samo); zostaje: weryfikacja profilu → DELETE workspaces po `owner_id` → `deleteAuthUser(userId)`. Logi bez zmian (anonimizowane).
4. Re-auth w endpointcie: body `{ password: string }` (walidacja Zod), weryfikacja przez `supabase.auth.signInWithPassword({ email, password })` przed kasacją; 403 przy złym haśle. UI: pole hasła w istniejącym dialogu DangerZone.
5. Zgodnie z decyzją produktową #1: jeśli „kasacja z ostrzeżeniem" — treść ostrzeżenia w dialogu wymienia workspace'y z innymi członkami (endpoint zwraca ich listę przed potwierdzeniem albo dialog informuje ogólnie); jeśli „blokada" — endpoint zwraca 409 z listą blokujących workspace'ów.
6. Konfiguracja env: dopisać `SUPABASE_SERVICE_ROLE_KEY` do `.env.example` (z komentarzem ostrzegawczym), ustawić w Vercel i na serwerze TEST.

**Kryteria akceptacji**
- [ ] Po usunięciu konta: brak rekordu w `auth.users`, `profiles`, `workspace_members`; własne workspace'y i ich zawartość skasowane; ponowna rejestracja tym samym e-mailem działa
- [ ] Żądanie bez poprawnego hasła → 403, nic nie skasowane
- [ ] `grep -rn "SERVICE_ROLE" src/components src/stores` → 0; klucz nieobecny w bundlu (`grep` po `dist/` po buildzie)
- [ ] ESLint blokuje import `auth-admin.service` z komponentów
- [ ] TODO z `auth.service.ts:171` usunięte

---

### M3-07 `[test] Testy integracyjne GDPR — pełna kasacja konta`

**Labels:** `faza:launch, typ:test, obszar:backend, P0` · **Estymacja:** 2 h · **Zależności:** M3-06

**Kontekst**
`tests/integration/api/auth/delete-account.test.ts` istnieje (3 skipy). Po M3-06 trzeba pokryć nowy przepływ — w tym scenariusze, które dziś nie mają prawa przejść (re-rejestracja tym samym e-mailem).

**Pliki**
- `tests/integration/api/auth/delete-account.test.ts`
- `tests/helpers/supabase-test-client.ts` (admin client — już istnieje)

**Zakres**
Scenariusze (Arrange-Act-Assert, cleanup w afterEach):
1. **Solo-owner z pełnymi danymi:** user z workspace + lokacje + boxy + przypisane QR → DELETE z poprawnym hasłem → 200; admin-klientem zweryfikować: 0 rekordów we wszystkich tabelach + brak w `auth.users`.
2. **Członek cudzego workspace:** user B członkiem workspace usera A → B usuwa konto → workspace A nietknięty, członkostwo B zniknęło (kaskada).
3. **Re-rejestracja:** po kasacji rejestracja tym samym e-mailem → sukces.
4. **Złe hasło:** → 403, wszystkie dane nietknięte.
5. **Brak sesji:** → 401.
6. Scenariusz zgodny z decyzją produktową #1 (workspace z innymi członkami: ostrzeżenie/409).
7. Zdjąć 3 istniejące skipy lub zastąpić je nowymi testami.

**Kryteria akceptacji**
- [ ] 0 skipów w `delete-account.test.ts`; wszystkie scenariusze zielone w CI
- [ ] Weryfikacja stanu DB przez admin-klienta (nie przez API)

---

### STRETCH: M3-08..M3-12 `[i18n]` — tylko przy budżecie > 110 h

> Skala zweryfikowana: 44 pliki .tsx z polskimi diakrytykami (411 wystąpień) + strony .astro + walidatory Zod + komunikaty serwisów ≈ 60 plików. Wykonywać per-obszar — można przerwać po dowolnym etapie i wypuścić PL-only.

**M3-08 `[i18n] Paraglide JS + infrastruktura locale`** — 3 h, P2 → po M1-12
Instalacja `@inlang/paraglide-js` (komunikaty kompilowane do funkcji TS — działają identycznie w `.astro` i `.tsx`, bez providera w islands); katalog `messages/{pl,en}.json`; locale: cookie `locale` → `Accept-Language` → fallback `pl` (middleware); przełącznik języka w ustawieniach. Bez prefiksów URL dla `/app/**` (aplikacja za loginem).
**AC:** `m.przyklad()` działa w obu typach plików; wybór języka persystowany; build przechodzi.

**M3-09 `[i18n] Ekstrakcja: auth + landing`** — 3 h, P2 → M3-08
`LoginForm`, `RegistrationForm`, `AuthLayout`, `PasswordStrengthIndicator`, `index.astro`, `auth/*.astro`.
**AC:** grep po polskich literałach w tych plikach = 0; oba języki działają.

**M3-10 `[i18n] Ekstrakcja: dashboard`** — 4 h, P2 → M3-09
Wszystkie komponenty `src/components/dashboard/**` (15 plików) + hooki z komunikatami błędów.
**AC:** jw. dla obszaru dashboard.

**M3-11 `[i18n] Ekstrakcja: box-details, settings, qr-generator, scan, formularze`** — 3 h, P2 → M3-10
Pozostałe obszary komponentów + strony `.astro`.
**AC:** jw.; `grep -rl "[ąćęłńóśźż]" src/components --include="*.tsx"` → 0 (poza messages).

**M3-12 `[i18n] Kody błędów API zamiast komunikatów PL`** — 2 h, P2 → M3-08, #178
Po M1-06 każda klasa błędu ma `code`; mapper z M1-11 zwraca `{ error: { code, message } }`. Zakres: frontend tłumaczy po `code` (mapa kod→klucz Paraglide), `message` z API przestaje być pokazywany użytkownikowi (zostaje w logach); komunikaty w walidatorach Zod → klucze.
**AC:** UI nie wyświetla surowych `message` z API; błędy przetłumaczone w PL i EN.

---

## 5. Czego w M3 świadomie NIE ma

- **Rozszerzenie polityk RLS o role** (read_only w DB) — follow-up issue zakładany w M3-02, realizacja najwcześniej w M4 (wymaga migracji + rundy testów RLS).
- **Strony prawne, monitoring, indeksy** → M4 (bez zmian).
- **Wirtualizacja list, real-time** → poza zakresem launchu.

## 6. Definicja ukończenia M3 (core)

- [ ] Każdy endpoint workspace-scoped zaczyna się od `requireWorkspaceMember` z minimalną rolą; rola `read_only` realnie blokuje zapisy (test 403)
- [ ] `DashboardContainer.tsx` < 150 LOC; żaden hook > 200 LOC; 0 skipów w `useBoxForm.test.ts`
- [ ] Usunięcie konta: re-auth hasłem, kasuje `auth.users`, re-rejestracja działa — wszystko pokryte testami integracyjnymi (0 skipów w delete-account.test.ts)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` w env serwera (Vercel + TEST), nieobecny w bundlu klienta
- [ ] E2E dashboardu i formularza boxa zielone (brak regresji po dekompozycji)

## 7. Issues na GitHubie (UTWORZONE 2026-06-12)

Wsad przeniesiony do GitHub Issues — milestone **M3 — Refaktoryzacja + GDPR** (#16, due 2026-09-06), board z polem `Sprint`:

| Zadanie | Issue | Sprint |
|---|---|---|
| M3-01 Guard requireWorkspaceMember (workspaces/locations) | **#179** | Tydz. 10 |
| M3-02 Guard boxes/qr/export + rola read_only | **#180** | Tydz. 10 |
| M3-03 useDashboardData + useDashboardMutations | **#181** | Tydz. 11 |
| M3-04 useModalState + finalizacja | **#182** | Tydz. 11 |
| M3-05 Podział useBoxForm | **#183** | Tydz. 12 |
| M3-06 GDPR: admin client + re-auth | **#184** | Tydz. 9 |
| M3-07 Testy GDPR | **#185** | Tydz. 9 |
| M3-08..12 i18n (stretch) | **#186–#190** | Tydz. 12 |

W body #180 i #184 wpisano **rekomendowane** opcje decyzji produktowych z sekcji 3 (do potwierdzenia przed startem implementacji). Powiązane stare issue: **#94** (lokalizacja PL) — wcielone do M3, pokrywa się z #186–#190; przy cięciu i18n realizuje minimum (spójne polskie komunikaty).
