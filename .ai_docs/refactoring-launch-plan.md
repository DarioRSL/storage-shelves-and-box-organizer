# Plan refaktoryzacji i wdrożenia produkcyjnego — Storage & Box Organizer

> Wynik review kodu (2026-06-12). Horyzont: ~16 tygodni (4 milestony miesięczne).
> Budżet: 80–160 h (5–10 h/tydz., zadania 2–4 h). Tracking: GitHub Issues + Projects.
> Status: **ZATWIERDZONY I WDROŻONY DO GITHUB** (2026-06-12) — patrz sekcja „Mapowanie na GitHub".

## Mapowanie na GitHub (uzgodnione 2026-06-12)

**Infrastruktura:** milestony #14–#17 (M1: 2026-07-12, M2: 2026-08-09, M3: 2026-09-06, M4: 2026-10-04) · 18 etykiet (`faza:*`, `typ:*`, `obszar:*`, `P0/P1/P2`) · board: https://github.com/users/DarioRSL/projects/1 (pole `Sprint` = tygodnie 1–16) · roadmapa-tracker: **#191** (przypięty).

| Plan | Issues GitHub | Status |
|---|---|---|
| M1 (B-01..M1-11) | **#166–#178** | utworzone, sprint tydz. 1–4 |
| M2 (M2-01..M2-10) | — | **do utworzenia po zamknięciu M1** |
| M3 (M3-01..M3-12) | **#179–#190** | utworzone, sprint tydz. 9–12 |
| M4 (M4-01..M4-11) | — | **do utworzenia po zamknięciu M3** |
| M4-12 reset hasła *(luka z uzgodnienia)* | **#192** | utworzone |

**Stare issues wcielone do planu** (przypisane do nowych milestonów 2026-06-12):
- #94 (lokalizacja PL) → M3 — pokrywa się z i18n #186–#190
- #95 (LocationTree keyboard nav, WCAG) → M2 — razem z M2-06/07 (ten sam obszar kodu)
- #97 (środowisko PROD Supabase) → M4 — **luka pierwotnego planu M4** (zakładał istniejący PROD)
- #98 (runbook deploy + rollback) → M4 — rozszerza M4-03 (backup) o deploy/rollback
- #99 (final QA staging) → M4 — pokrywa się z M4-10/M4-11
- #155, #157 (testy unit/integration) → M4 — pokrywają się z M4-06/07/08

**Mapowanie user stories z `prd.md` (US-036..US-052):**
US-036 RLS → #169–#171 · US-040 ESLint → #168 · US-041 testy → M4-06/07 + #155/#157 · US-042/US-044 lokalizacja+toasty → #94, M2-08, #186-190 · **US-045 reset hasła → #192 (była LUKA — niezbędne dla publicznego launchu)** · US-049 WCAG → #95 · US-046/047/048/050/051/052 (sortowanie, duplikowanie, wirtualizacja, filtry tagów, DnD, szablony) → **świadomie POZA zakresem launchu** (post-launch backlog).

**Rekomendowane do zamknięcia (wymaga decyzji właściciela — nie zamknięto automatycznie):**
- #75 (stara koordynacja MVP) → zastąpione przez #191
- #104 (CI/CD pipeline) → zrealizowane (workflows `deploy.yml` + `pull-request.yml` działają)
- #111–#116 (TC-RLS-001..006) → scenariusze wcielone do #169–#171
- Katalog #105–#147 (TC-AUTH/QR/LOC/BOX/SEARCH/THEME) → zostawić otwarte jako katalog QA; odhaczać przy M4-06/07 i testach e2e M2

**Skorygowane budżety:** M4 = ~34 h (28 h + 6 h #192). Suma core: ~117 h (nadal w widełkach 80–160 h).

## Kontekst

Review kodu (3 równoległe analizy: backend, frontend, DB/testy/CI) wykazał, że MVP jest funkcjonalnie kompletne (26/26 endpointów z api-plan.md, schemat DB solidny, granularne polityki RLS), ale projekt **nie jest gotowy na publiczny launch**:

**Ustalenia krytyczne (zweryfikowane w kodzie):**

1. **Martwy link QR** — `QrCodeDisplay.tsx:26` i `usePDFGeneration.ts:87,135` generują QR-y wskazujące na `/app/scan?code=…`, a ta trasa **nie istnieje** (w `src/pages/app/` tylko `boxes/` i `qr-generator.astro`). Kluczowa funkcja produktu nie działa; wydrukowane PDF-y już zawierają te URL-e.
2. **Niezweryfikowana izolacja RLS** — wszystkie testy izolacji multi-tenant w `tests/integration/database/rls-policies.test.ts` są pominięte (15 bloków skip, ~66 testów). Publiczny launch bez tego = ryzyko wycieku danych między workspace'ami.
3. **96 błędów ESLint** blokuje CI (zanieczyszczenie `.claude/worktrees/`, `test-rls-isolation.js`, unused vars) + 398 warningów.
4. **Nietransakcyjne tworzenie box+QR** — `box.service.ts:166-186`: insert boxa i update QR to dwa osobne zapytania; awaria drugiego zostawia osierocony box.
5. **GDPR** — `auth.service.ts:167-174` (TODO): usunięcie konta nie kasuje rekordu `auth.users` (brak service-role); e-mail zostaje zajęty.
6. **Dashboard nieużywalny na mobile** — `DashboardContent.tsx`: sztywny sidebar `w-80` bez breakpointów, a skanowanie odbywa się na telefonie.
7. Duplikaty klas błędów (serwisy vs `errors.ts`), 3 niespójne wzorce autoryzacji, god-component `DashboardContainer.tsx` (365 LOC) i hook `useBoxForm.ts` (467 LOC), niespójny klucz localStorage motywu (`theme` vs `theme-mode`), `(supabase.rpc as any)` — typy DB nie obejmują funkcji RPC.

**Fałszywy alarm (skorygowany po weryfikacji):** zgłoszony „bug soft-delete lokalizacji" nie istnieje — `location.service.ts:186,521` i funkcje RPC w migracji `20260130150000` filtrują `is_deleted = false`. W planie zostaje tylko tani test regresyjny.

**Decyzje wiążące:**

- Kolejność: **stabilizacja → skanowanie QR + mobile dashboard → i18n PL+EN**; pełne PWA (offline/SW) poza zakresem.
- Cel: **publiczny produkt** → pełny rygor (RLS, GDPR, monitoring, backupy, strony prawne).
- Tracking: **GitHub Issues + Projects**, milestony miesięczne, zadania 2–4 h.
- Tempo: 5–10 h/tydz. (~80–160 h na 16 tygodni); i18n = cel rozszerzony przy budżecie 80 h.

---

## Struktura milestonów

| Milestone | Tygodnie | Cel | Godziny |
|---|---|---|---|
| **M1 — Stabilizacja** | 1–4 | Zielone CI, zweryfikowane RLS, transakcje, konsolidacja błędów | ~26 h (zweryfikowane) |
| **M2 — QR + Mobile** | 5–8 | Działający przepływ skanowania e2e, dashboard mobilny | ~31 h |
| **M3 — Refaktoryzacja + GDPR (+i18n)** | 9–12 | Dekompozycja komponentów, standaryzacja autoryzacji, GDPR; i18n stretch | ~18 h (+15 h i18n) |
| **M4 — Launch hardening** | 13–16 | Monitoring, backupy, legal, testy, go-live | ~28 h |
| **Razem** | | | **~110 h core / ~125 h z i18n** |

---

## Bootstrap trackingu (początek M1)

**B-01. `[infra] Etykiety i milestony GitHub`** — 2 h, P0
`gh label create` dla: `faza:{stabilizacja,core,i18n,launch}`, `typ:{bug,refactor,feature,test,infra,docs}`, `obszar:{backend,frontend,db,ci,ops}`, `P0/P1/P2`; 4 milestony z datami (M1: 2026-07-12, M2: 2026-08-09, M3: 2026-09-06, M4: 2026-10-04).
**AC:** etykiety + milestony widoczne w repo.

**B-02. `[infra] Tablica Projects + skrypt masowego tworzenia issues`** — 3 h, P0 → B-01
`gh project create`, kolumny `Backlog/Ready/In Progress/Blocked/Done`, widoki per-milestone. Plik `tasks.json` + pętla `gh issue create` (skrypt do `scripts/`). Body issue: *Pliki / Zakres / Kryteria akceptacji / Zależności / Estymacja*.
**AC:** zadania M1 jako issues na boardzie.

---

## M1 — Stabilizacja (~33 h)

> **AKTUALIZACJA 2026-06-12:** sekcja zastąpiona szczegółowym, zweryfikowanym w kodzie rozpisaniem w **`.ai_docs/m1-stabilizacja.md`** (skorygowany budżet: ~26 h). Najważniejsze korekty: wszystkie 96 błędów ESLint pochodzi z martwego worktree `.claude/worktrees/` (w `src/` 0 błędów); infrastruktura testów RLS już istnieje (skipów w tym pliku jest 15, w całym `tests/` ~156); „bug klucza motywu" to martwy plik `theme.store.ts` (0 importów); `qr_codes` nie ma kolumny `assigned_at` (poprawiony SQL funkcji RPC). Poniższa lista zachowana dla kontekstu historycznego — wiążąca wersja w m1-stabilizacja.md.

**M1-01. `[ci] Naprawa 96 błędów ESLint`** — 3 h, P0
`eslint.config.js`: ignore `.claude/**`; `test-rls-isolation.js` → `scripts/` z override globals; usunięcie unused vars; `lint:fix`.
**AC:** `npm run lint` = 0 errors.

**M1-02. `[test] Infrastruktura testów RLS — fixtures 2 tenantów`** — 3 h, P0 → M1-01
`tests/integration/database/rls-policies.test.ts`: setup 2 userów/2 workspace'y/dane krzyżowe, helpery klientów, teardown.
**AC:** setup/teardown zielony na lokalnym Supabase.

**M1-03/04/05. `[test] Odblokowanie testów RLS`** (3×3 h, P0, sekwencyjnie → M1-02)
03: workspaces+members; 04: locations+boxes; 05: qr_codes+profiles. Zdjąć skipy, naprawić asercje; każda wykryta luka w polityce = migracja naprawcza (>1 h → osobny issue).
**AC:** tenant A nie czyta/nie pisze danych tenanta B; grupa zielona w CI.

**M1-06. `[test] Test regresyjny: soft-deleted lokalizacje niewidoczne`** — 1 h, P1
Test integracyjny potwierdzający istniejące filtrowanie (`location.service.ts:186`, RPC `get_workspace_locations`).
**AC:** usunięta lokalizacja nie pojawia się w GET liście/drzewie.

**M1-07. `[refactor] Konsolidacja klas błędów do errors.ts`** — 3 h, P0 → M1-01
Usunąć duplikaty z `workspace.service.ts:67`, `location.service.ts:9-39`, `box.service.ts:29`, `qr-code.service.ts:9`; poprawić importy w `src/pages/api/**` wprost na `errors.ts`; każda klasa dostaje pole `code` (fundament pod i18n).
**AC:** `grep "class .*Error" src/lib/services/ | grep -v errors.ts` = 0; testy API zielone.

**M1-08. `[db] Funkcja RPC create_box_with_qr (transakcja)`** — 3 h, P0 → M1-05
Nowa migracja: `create or replace function create_box_with_qr(...) returns boxes language plpgsql security invoker` — insert box + warunkowy update QR (`where box_id is null`), `raise exception 'QR_ALREADY_ASSIGNED'` cofa całość. **`security invoker`** — RLS nadal obowiązuje. Regeneracja `database.types.ts` (przy okazji usunie `(supabase.rpc as any)`).
**AC:** awaria przypisania QR cofa insert (test SQL).

**M1-09. `[backend] Przepięcie box.service.ts na RPC`** — 2 h, P0 → M1-08
`box.service.ts:166-186` → `supabase.rpc("create_box_with_qr", …)`; mapowanie wyjątku na 409.
**AC:** test: QR już przypisany → 409, box nie istnieje.

**M1-10. `[bug] Klucz localStorage motywu (theme vs theme-mode)`** — 2 h, P1
`ThemeInitializer.astro` + `theme.store.ts` + `useTheme.ts` → jeden klucz.
**AC:** motyw przeżywa reload, brak FOUC.

**M1-11. `[backend] Zod dla /api/auth/session + jednolity kształt błędów`** — 3 h, P1 → M1-07
Centralny mapper błędów→HTTP (`src/lib/api/responses.ts`), format `{ error: { code, message } }` we wszystkich endpointach.

**M1-12. `[refactor] Usunięcie martwych store'ów i logów debug`** — 2 h, P1
`auth.store.ts`, `workspace.store.ts` (nieużywane), prefiksy tokenów w `middleware/index.ts:34-38`, `console.error` w `useAuthForm.ts:179`.

---

## M2 — QR scan + mobile (~31 h)

> **AKTUALIZACJA 2026-06-12:** sekcja zastąpiona zweryfikowanym rozpisaniem w **`.ai_docs/m2-qr-mobile.md`** (budżet: ~34 h, w tym #95 keyboard nav). Najważniejsze korekty: endpoint resolve `GET /api/qr-codes/[short_id]` **już istnieje** (scan robi SSR lookup przez serwis, nie HTTP); deep-link to zmiana w stronach (`Astro.redirect` bez returnUrl w `app.astro:9-12`), **nie w middleware**; wzorzec prefill query-param istnieje (`new.astro:13`); `Sheet` (shadcn) niezainstalowany; kamera wymaga HTTPS (testy przez TEST env). Poniższa lista historyczna.

**M2-01. `[spike] Wybór biblioteki skanowania + prototyp`** — 2 h, P0
Rekomendacja: **`html5-qrcode`** (kompletny komponent: zgody, wybór kamery, latarka); alternatywa przy problemach z iOS Safari: **`qr-scanner`** (nimiq, worker-based). Test na fizycznym iOS Safari + Android Chrome. Nie polegać wyłącznie na natywnym `BarcodeDetector`.

**M2-02. `[feature] Strona /app/scan ze skanerem`** — 4 h, P0 → M2-01
Nowy `src/pages/app/scan.astro` (auth-gated przez middleware) + `src/components/scan/QrScanner.tsx` (`client:only="react"`). Obsługa: brak zgody na kamerę, brak kamery → fallback ręcznego wpisania kodu.

**M2-03. `[feature] Resolucja ?code= → redirect do pudełka`** — 3 h, P0 → M2-02
SSR lookup w `scan.astro` przez `qr-code.service.ts` (istniejący endpoint resolve `/api/qr-codes/[short_id]`) → `Astro.redirect` do `/app/boxes/{id}`. Dzięki temu ten sam URL działa ze skanera systemowego (aparat iOS) i wewnętrznego — **bez zmiany formatu wydrukowanych QR**. 3 ścieżki: przypisany → box; nieprzypisany → ekran „przypisz do nowego pudełka" (prefilled QR); nieznany → czytelny błąd.

**M2-04. `[feature] Deep-link przez logowanie (returnUrl)`** — 3 h, P0 → M2-03
`middleware/index.ts` + login: redirect z `?returnUrl=…` (walidacja: tylko ścieżki względne — ochrona przed open-redirect).

**M2-05. `[test] E2E skanowania (mock, bez kamery)`** — 3 h, P1 → M2-04
`tests/e2e/scan.spec.ts`: ścieżka `?code=` + przejście przez login.

**M2-06. `[feature] Sidebar jako Sheet/drawer na mobile`** — 4 h, P0
`DashboardContent.tsx`: `hidden lg:block lg:w-80`; na `< lg` drzewo lokalizacji w Shadcn `Sheet` (side="left") otwieranym hamburgerem w `DashboardHeader`. Jeden `LocationTree` w obu kontenerach. Wybór lokalizacji zamyka Sheet.
**AC:** viewport 375 px w pełni używalny, brak poziomego scrolla.

**M2-07. `[feature] Responsywny header/search/workspace selector`** — 3 h, P0 → M2-06
Touch targets ≥ 44 px.

**M2-08. `[feature] Mobilna lista pudełek + szczegóły`** — 3 h, P0 → M2-06
`BoxList`, `BoxListItem`, `box-details/**`; przy okazji `alert()` w `QrCodeDisplay.tsx:50` → toast/inline. Przycisk „Skanuj" w nawigacji mobilnej.

**M2-09. `[feature] Modale pełnoekranowe na mobile`** — 3 h, P1 → M2-06
`BoxEditorModal`, `LocationEditorModal`, dialogi: `max-sm:h-dvh max-sm:max-w-full`.

**M2-10. `[test] Przegląd manualny na urządzeniach`** — 3 h, P1 → M2-07..09
Checklista ekranów na iOS+Android, zrzuty do issue, blockery jako nowe issues.

---

## M3 — Refaktoryzacja + GDPR (+i18n stretch)

> **AKTUALIZACJA 2026-06-12:** sekcja zastąpiona szczegółowym, zweryfikowanym w kodzie rozpisaniem w **`.ai_docs/m3-refaktoryzacja-gdpr.md`** (skorygowany budżet core: ~21 h). Najważniejsze korekty: helper `isWorkspaceMember` już istnieje (`qr-code.service.ts:155`); odkryto, że rola `read_only` nie jest egzekwowana przy zapisach (nowy zakres w M3-02); ręczna 7-krokowa kaskada w `auth.service.ts` jest zbędna (kaskady FK robią to samo — M3-06 upraszcza zamiast rozbudowywać); endpoint delete-account nie wymaga re-autoryzacji (dodane do M3-06). Trzy decyzje produktowe do podjęcia przed startem — sekcja 3 dokumentu. Poniższa lista zachowana historycznie.

**M3-01/02. `[refactor] Standaryzacja autoryzacji`** (2×3 h, P1 → M1-05, M1-07)
Helper `requireWorkspaceMember(supabase, workspaceId, userId)` w `src/lib/api/`; każdy endpoint zaczyna od jawnego sprawdzenia; RLS = druga warstwa; SECURITY DEFINER tylko gdzie konieczny. 01: workspaces+locations; 02: boxes+qr+export+profiles.

**M3-03/04. `[refactor] Dekompozycja DashboardContainer`** (2×3 h, P1 → M2-10)
Wydzielenie `useDashboardData` / `useModalState`; reuse istniejących `useBoxes`/`useLocations`/`useWorkspaces`.
**AC:** DashboardContainer < 150 LOC, zero zmian zachowania.

**M3-05. `[refactor] Podział useBoxForm (467 LOC)`** — 3 h, P2 → M3-04
**AC:** żaden hook > 200 LOC.

**M3-06. `[feature] GDPR: pełne usunięcie konta (service role)`** — 4 h, P0 → M1-05
Nowy `src/lib/services/auth-admin.service.ts`: `createClient(URL, SERVICE_ROLE_KEY, {auth:{autoRefreshToken:false, persistSession:false}})`. Klucz **tylko** w env serwera (bez `PUBLIC_`); reguła ESLint `no-restricted-imports` dla `src/components/**`. Przepływ: re-auth → workspace'y solo-ownera (kasacja kaskadowa, kroki SQL w jednej funkcji `security definer`) → członkostwa → profile → `auth.admin.deleteUser` → czyszczenie cookies. Zamyka TODO w `auth.service.ts:171`.

**M3-07. `[test] Test integracyjny GDPR`** — 2 h, P0 → M3-06
Scenariusze: solo-owner, członek cudzego workspace, konto z boxami; ponowna rejestracja tym samym e-mailem.

**i18n (stretch — tylko przy budżecie > 110 h):**

**M3-08.** Paraglide JS (inlang) + locale cookie/Accept-Language + przełącznik — 3 h, P2. Komunikaty kompilowane do funkcji TS działających identycznie w `.astro` i `.tsx`; bez prefiksów URL dla `/app/**`.
**M3-09/10/11.** Ekstrakcja stringów per obszar: auth+landing (3 h) → dashboard (4 h) → box-details/settings/qr/scan (3 h), P2.
**M3-12.** Kody błędów API zamiast mieszanki PL/EN — backend zwraca `code`, frontend tłumaczy — 2 h, P2 → M1-11.

---

## M4 — Launch hardening (~34 h)

> **AKTUALIZACJA 2026-06-12 (2):** sekcja zastąpiona zweryfikowanym rozpisaniem w **`.ai_docs/m4-launch-hardening.md`** (budżet: ~38 h — przekracza tydz. 13–16; mitygacja: #97 i #192 wciągalne do tydz. 12). Najważniejsze korekty: coverage gate **częściowo już istnieje** (`pull-request.yml` odpala `test:coverage` z progami 80% — zadanie to audyt/kalibracja, nie budowa); **TEST = self-hosted Supabase w Dockerze, PROD = hosted** (#97 — projekt PROD nieskonfigurowany, backupy TEST w 100% nasze); skipów ~156, nie 46 (podejście triage); `vercel.json` bez nagłówków bezpieczeństwa. Wcielone: #97→M4-10, #192→M4-12, #98→M4-03, #99→M4-11/13, #155/#157→M4-06/07. Poniższa lista historyczna.

**M4-01. `[ops] Sentry free tier (front + SSR)`** — 3 h, P0 — `@sentry/astro`, source maps, integracja z `logger.ts`.
**M4-02. `[ops] /api/health + UptimeRobot`** — 2 h, P0 — lekki select do DB; monitor 5-min PROD+TEST, alert e-mail.
**M4-03. `[ops] Backupy Supabase + runbook restore`** — 2 h, P0 — jedno **przećwiczone** przywrócenie; udokumentowane RTO/RPO.
**M4-04. `[feature] /privacy + /terms + zgoda przy rejestracji`** — 3 h, P0 → M3-06 — checkbox w `RegistrationForm.tsx`, stopka w layoucie.
**M4-05. `[db] Indeksy: (workspace_id, location_id) na boxes + created_at`** — 2 h, P1 — weryfikacja `EXPLAIN`.
**M4-06/07. `[test] Odblokowanie ~46 pominiętych testów integracyjnych API`** (2×3 h, P1 → M1-09, M3-02) — 0 nieuzasadnionych skipów (uzasadnione → komentarz + issue).
**M4-08. `[ci] Egzekwowanie progu coverage w CI`** — 2 h, P1 → M4-07 — próg skalibrowany do realnego stanu (nie sztucznie 80%), podnoszony stopniowo.
**M4-09. `[ops] Multi-stage Dockerfile + persystencja logów TEST`** — 3 h, P2.
**M4-10. `[launch] Audyt przedstartowy`** — 3 h, P0 → wszystkie P0 — checklista DoD, security review, grep `dist/` pod kątem service-role key, nagłówki bezpieczeństwa.
**M4-11. `[launch] Merge test→master, smoke na PROD, go-live`** — 2 h, P0 → M4-10 — pełny przepływ: rejestracja → workspace → lokalizacja → box → wydruk QR → skan telefonem → szczegóły; 48 h obserwacji Sentry/UptimeRobot.

---

## Rejestr ryzyk (scenariusz 80 h)

| Ryzyko | Mitygacja |
|---|---|
| Budżet bliżej 80 h | Cięcia w kolejności: i18n (−15 h) → M4-09, M3-05, M2-05, M1-12, M4-08, M3-03/04, część M4-06/07 → zostaje ~80 h |
| Testy RLS ujawnią luki w politykach | Każda luka = migracja naprawcza; M1 może zjeść początek M2 — wtedy QR scan ma pierwszeństwo nad refaktoryzacją M3 |
| Kamera na iOS Safari | Spike M2-01 najpierw; fallback ręcznego kodu; URL `?code=` działa z systemowym aparatem nawet bez własnego skanera |
| Decyzja produktowa: konto solo-ownera | Domyślnie: kasacja workspace'ów z 2-krokowym potwierdzeniem; spisać w issue przed implementacją M3-06 |
| Nieregularne sesje / wypalenie | Zadania 2–4 h domykalne w 1 wieczór; board pokazuje postęp |

**Nienegocjowalne (nigdy nie ciąć):** RLS (M1-02..05), ESLint/CI (M1-01), transakcyjny box+QR (M1-08/09), `/app/scan` + deep-link (M2-02..04), mobilny dashboard (M2-06..08), GDPR (M3-06/07), monitoring+backup+legal (M4-01..04), audyt + go-live (M4-10/11).

---

## Definition of Done — launch

**Bezpieczeństwo:** testy RLS aktywne i zielone; jawne sprawdzenie członkostwa we wszystkich endpointach; usunięcie konta kasuje `auth.users` (test); service-role key nieobecny w bundlu klienta (grep `dist/`); middleware nie loguje tokenów.
**Core:** wydrukowany QR → skan telefonem → strona pudełka (także przez login); dashboard używalny na 375 px; tworzenie box+QR transakcyjne.
**Jakość:** lint 0 errors; CI lint→unit→integration zielone; brak nieuzasadnionych skipów; coverage gate; e2e smoke na TEST przed merge.
**Operacje/prawo:** Sentry + UptimeRobot aktywne; runbook restore przećwiczony; `/privacy` + `/terms` + zgoda; indeksy założone; 48 h po go-live bez alertów krytycznych.

---

## Weryfikacja end-to-end

1. Po M1: `npm run lint` (0 errors), `npm run test:integration` z lokalnym `supabase start` — testy RLS zielone; test SQL transakcji box+QR.
2. Po M2: fizyczny telefon — wydruk QR z `/app/qr-generator`, skan aparatem systemowym (wylogowanym), login, lądowanie na stronie pudełka; `npm run test:e2e`.
3. Po M3: test integracyjny GDPR + ponowna rejestracja tym samym e-mailem; grep importów `auth-admin.service` poza `src/pages/api/` = 0.
4. Po M4: checklista DoD + security review + smoke na PROD.

---

## Konspekt zmian (do przeglądu i doprecyzowania)

**Krytyczne naprawy**
- Aktywacja ~66 pominiętych testów izolacji RLS — weryfikacja realnej separacji danych workspace'ów (warunek startu publicznego).
- Naprawa martwego linku QR: nowa trasa `/app/scan` ze skanerem kamery i przekierowaniem do pudełka — bez tego QR-y są bezużyteczne.
- Transakcyjne tworzenie pudełka z przypisaniem QR (funkcja Postgres) — koniec z osieroconymi pudełkami.
- 96 błędów ESLint blokujących CI; bug klucza localStorage motywu.

**Refaktoryzacja**
- Jedno źródło klas błędów (`errors.ts`) + jednolity kształt odpowiedzi błędów API (`{ error: { code, message } }`).
- Standaryzacja autoryzacji: jawne sprawdzenie członkostwa w każdym endpointcie, RLS jako druga linia obrony.
- Rozbicie `DashboardContainer` (365 LOC) i `useBoxForm` (467 LOC); usunięcie martwych store'ów; regeneracja typów DB (eliminacja `rpc as any`).

**Nowe funkcje**
- Mobilny dashboard: sidebar jako wysuwany Sheet, responsywne listy, modale pełnoekranowe — aplikacja używalna na telefonie, gdzie odbywa się skanowanie.
- i18n PL+EN przez Paraglide JS (**cel rozszerzony** — wypada pierwszy przy budżecie 80 h).

**Produkcja / operacje**
- GDPR: pełne usuwanie konta (łącznie z `auth.users`) przez service-role key trzymany wyłącznie po stronie serwera.
- Monitoring: Sentry (free) + `/api/health` + UptimeRobot; przećwiczony runbook backup/restore Supabase.
- Strony `/privacy` i `/terms` + zgoda przy rejestracji; indeksy wydajnościowe; egzekwowane pokrycie w CI; multi-stage Dockerfile dla TEST.
- Tracking: etykiety, milestony M1–M4, board GitHub Projects i skrypt `gh` do masowego zakładania issues — wszystkie zadania po 2–4 h.

**Otwarte decyzje do doprecyzowania:**
1. Reguła usuwania konta solo-ownera workspace'u: kasacja kaskadowa czy transfer własności?
2. i18n: wchodzi do zakresu od razu czy po launchu (PL-only)?
3. Treść `/privacy` i `/terms` — szablon własny czy konsultacja prawna?
4. Daty milestonów: propozycja M1 do 2026-07-12, M4 (go-live) do 2026-10-04 — do potwierdzenia.
