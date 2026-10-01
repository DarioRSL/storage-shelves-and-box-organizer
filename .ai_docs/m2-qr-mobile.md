# M2 — QR scan + Mobile: szczegółowy zakres prac i wsad pod GitHub Issues

> Uszczegółowienie milestone'u M2 z `refactoring-launch-plan.md` (milestone GitHub #15, due 2026-08-09).
> Wszystkie założenia **zweryfikowane bezpośrednio w kodzie** (2026-06-12).
> Zależności od M1: zielone CI (#168), mapper błędów (#178 — opcjonalnie).
> Wcielone stare issue: **#95** (LocationTree keyboard nav, WCAG).

---

## 1. Weryfikacja założeń planu — korekty

| # | Założenie z planu | Stan faktyczny po weryfikacji | Wpływ na plan |
|---|---|---|---|
| 1 | „Trasa /app/scan nie istnieje, QR martwe" | Potwierdzone — w `src/pages/app/` tylko `boxes/` i `qr-generator.astro`. QR generowane w 3 miejscach: `QrCodeDisplay.tsx:26`, `usePDFGeneration.ts:87,135` — wszystkie jako `${globalThis.location.origin}/app/scan?code={short_id}`. **Uwaga:** URL zależny od originu — QR wydrukowane z TEST wskazują na domenę TEST | Bez zmian; trasa musi istnieć na TEST i PROD |
| 2 | „Endpoint resolve do zbudowania" | **Endpoint już istnieje**: `GET /api/qr-codes/[short_id]` zwraca `QrCodeDetailDto { id, short_id, box_id\|null, status, workspace_id }` z 401/404/500. Strona scan **nie musi** wołać go po HTTP — robi SSR lookup bezpośrednio przez `qr-code.service.getQrCodeByShortId()` (szybciej, bez self-call) | M2-03 prostszy niż planowano |
| 3 | „Deep-link: modyfikacja middleware" | **Korekta:** middleware NIE chroni tras stron — każda strona sama sprawdza `Astro.locals.user` i robi `Astro.redirect("/auth")` **bez returnUrl** (`app.astro:9-12`, analogicznie pozostałe). Deep-link = redirect z returnUrl w `scan.astro` + obsługa parametru w stronie/formularzu logowania, middleware bez zmian | M2-04 dotyka `scan.astro` + `auth/index.astro` + `LoginForm.tsx`/`useAuthForm.ts`, NIE middleware |
| 4 | „Sheet (shadcn) do dodania" | Potwierdzone — `src/components/ui/` zawiera 13 komponentów, **bez** `sheet.tsx`. Dodać skillem `add-shadcn-component` | Bez zmian |
| 5 | „Prefill QR przy tworzeniu boxa" | Wzorzec query-param **już istnieje**: `app/boxes/new.astro:13` czyta `location_id` z `Astro.url.searchParams`. Analogicznie dodać `qr_code_id` (+ `useBoxForm` musi przyjąć initial QR) | M2-03 ścieżka „nieprzypisany QR" = kopiowanie wzorca |
| 6 | „Dashboard nieresponsywny — sztywny sidebar" | Potwierdzone — `DashboardContent.tsx` (31 LOC): `<aside className="w-80 border-r ...">` bez breakpointów, layout `flex h-[calc(100vh-73px)]`. Sam plik jest trywialny — realna praca w dzieciach: `DashboardHeader`, `SearchInput`, `BoxList/BoxListItem`, modale | Bez zmian; retrofit kontenera prosty |
| 7 | *(wcielone #95)* | `LocationTreeNode.tsx` ma już 12 linii z `aria-*`/`tabIndex`/`onKeyDown` — częściowa nawigacja klawiaturą istnieje. #95 wymaga audytu i rozszerzenia do pełnego wzorca tree (strzałki, Home/End, screen reader) | Nowe zadanie M2-11 (mapowane na istniejące issue **#95**, nie tworzyć duplikatu) |
| 8 | „E2E: nowy spec" | Page Objects istnieją: `tests/e2e/page-objects/{BoxFormPage,DashboardPage}.ts` — dodać `ScanPage.ts` wg wzorca | Bez zmian |
| 9 | *(nowe)* Kamera wymaga HTTPS | `getUserMedia` działa tylko na HTTPS lub localhost — testy na fizycznym telefonie wymagają środowiska TEST (https) albo tunelu (ngrok/`astro dev --host` nie wystarczy na iOS) | Dodane do zakresu spike'a M2-01 |

**Budżet M2: ~34 h** (31 h plan + 3 h #95).

---

## 2. Kolejność wykonania

```
M2-01 Spike: biblioteka skanowania + test HTTPS na telefonach (2h)
M2-02 Strona /app/scan ze skanerem (4h)            → M2-01
M2-03 Resolucja ?code= → redirect/przypisz/błąd (3h) → M2-02
M2-04 Deep-link returnUrl przez logowanie (3h)      → M2-03
M2-05 E2E skanowania (3h)                           → M2-04
M2-06 Sidebar jako Sheet na mobile (4h)             [równolegle do M2-02..04]
M2-07 Responsywny header/search/selector (3h)       → M2-06
M2-08 Mobilna lista + szczegóły + toast za alert() (3h) → M2-06
M2-09 Modale pełnoekranowe na mobile (3h)           → M2-06
M2-11 (#95) LocationTree keyboard nav WCAG (3h)     → M2-06 (ten sam obszar kodu)
M2-10 Przegląd manualny na urządzeniach (3h)        → wszystko powyżej
```

Rytm tygodniowy (tydz. 5–8): T5: M2-01, M2-02, M2-06 (10 h — cięższy tydzień, można przesunąć M2-06) · T6: M2-03, M2-04, M2-07 (9 h) · T7: M2-08, M2-09, M2-05 (9 h) · T8: M2-11, M2-10 + poprawki (6 h + bufor).

---

## 3. Wsad issues — gotowe treści

### M2-01 `[frontend] Spike: wybór biblioteki skanowania QR + prototyp na fizycznych urządzeniach`
**Labels:** `faza:core, typ:feature, obszar:frontend, P0` · **Estymacja:** 2 h · **Zależności:** brak

**Kontekst**
Produkt generuje QR linkujące do `/app/scan?code={short_id}` (QrCodeDisplay.tsx:26, usePDFGeneration.ts:87,135) — trasa nie istnieje, brak jakiejkolwiek biblioteki skanowania w `package.json` (jest tylko `qrcode` do generowania). Kandydaci: **`html5-qrcode`** (kompletny widget: zgody, wybór kamery, latarka; projekt w trybie maintenance) vs **`qr-scanner`** (nimiq, ~16 kB, worker-based, własne UI). Natywny `BarcodeDetector` niewystarczający (brak w Safari/Firefox).
**Ograniczenie:** `getUserMedia` wymaga HTTPS (poza localhost) — test na fizycznym iPhone/Androidzie wymaga deployu na TEST albo tunelu https.

**Zakres**
1. Prototyp obu bibliotek jako komponent React (`client:only="react"`) na branchu spike.
2. Test na fizycznym iOS Safari + Android Chrome (przez TEST env lub tunel): start kamery, odczyt QR z wydruku, zachowanie przy odmowie zgody.
3. Decyzja zapisana w komentarzu issue: biblioteka + uzasadnienie (rozmiar, UX zgód, jakość odczytu).
4. Skill `add-shadcn-component` NIE dotyczy — to zwykła zależność npm.

**Kryteria akceptacji**
- [ ] Działający prototyp odczytujący wydrukowany QR na obu platformach
- [ ] Decyzja + wnioski w komentarzu (w tym zachowanie iOS przy braku zgody)

---

### M2-02 `[frontend] Strona /app/scan ze skanerem kamery i fallbackiem ręcznym`
**Labels:** `faza:core, typ:feature, obszar:frontend, P0` · **Estymacja:** 4 h · **Zależności:** M2-01

**Pliki:** nowe `src/pages/app/scan.astro`, `src/components/scan/QrScanner.tsx`, `src/components/scan/ManualCodeEntry.tsx`; `package.json` (wybrana biblioteka).

**Zakres**
1. `scan.astro`: gating jak inne strony (`Astro.locals.user` → redirect; returnUrl dodaje M2-04); gdy brak `?code=` → renderuje wyspę skanera `client:only="react"`.
2. `QrScanner.tsx`: start/stop kamery (cleanup w unmount!), po odczycie wyciąga `code` z odczytanego URL-a (lub surowego stringa `QR-XXXXXX`) i nawiguje na `/app/scan?code={short_id}`.
3. Stany: ładowanie kamery / odmowa zgody (instrukcja jak włączyć) / brak kamery → `ManualCodeEntry` (input `QR-XXXXXX` z walidacją formatu jak `GetQrCodeByShortIdSchema`).
4. Przycisk „Skanuj" w nawigacji (docelowe miejsce ustala M2-08 — tu wystarczy dostępna trasa).

**Kryteria akceptacji**
- [ ] Na telefonie: kamera startuje, odczyt wydrukowanego QR nawiguję na `?code=`
- [ ] Odmowa zgody i brak kamery → czytelny fallback ręcznego wpisania
- [ ] Brak wycieku kamery (zatrzymana po opuszczeniu strony)

---

### M2-03 `[frontend] Resolucja ?code= → redirect do pudełka / przypisanie / błąd`
**Labels:** `faza:core, typ:feature, obszar:frontend, P0` · **Estymacja:** 3 h · **Zależności:** M2-02

**Kontekst (zweryfikowane)**
Endpoint resolve **istnieje**: `GET /api/qr-codes/[short_id]` → `QrCodeDetailDto { box_id|null, status, workspace_id }`. Strona robi lookup **SSR bezpośrednio przez serwis** `getQrCodeByShortId(supabase, short_id, user.id)` (bez HTTP self-call). Wzorzec prefill przez query-param już istnieje: `app/boxes/new.astro:13` (`location_id`).

**Pliki:** `src/pages/app/scan.astro` (logika SSR), `src/pages/app/boxes/new.astro` + `src/components/hooks/useBoxForm.ts` + `QRCodeSelector.tsx` (prefill `qr_code_id`).

**Zakres**
1. `scan.astro` z `?code=`: SSR lookup → 3 ścieżki:
   - `box_id` ≠ null → `Astro.redirect(\`/app/boxes/${box_id}\`)`
   - `box_id` = null (status generated/printed) → ekran „QR wolny" z CTA → `/app/boxes/new?qr_code_id={id}`
   - `QrCodeNotFoundError` → ekran błędu „nieznany kod" z CTA do skanera i ręcznego wpisu
2. `new.astro`: czytać `qr_code_id` z searchParams (wzorzec z l. 13) → przekazać do `BoxForm`/`useBoxForm` jako initial; `QRCodeSelector` pre-selekcjonuje ten kod.
3. Multi-workspace: lookup serwisowy filtruje po członkostwie usera (RLS) — kod z cudzego workspace = „nieznany kod" (nie ujawniamy istnienia).

**Kryteria akceptacji**
- [ ] 3 ścieżki działają e2e (przypisany → box; wolny → formularz z pre-wybranym QR; nieznany → błąd)
- [ ] Ten sam URL działa ze skanera systemowego iOS (aparat) — format wydrukowanych QR bez zmian

---

### M2-04 `[frontend] Deep-link przez logowanie — returnUrl`
**Labels:** `faza:core, typ:feature, obszar:frontend, P0` · **Estymacja:** 3 h · **Zależności:** M2-03

**Kontekst (korekta planu)**
Middleware NIE chroni stron — gating jest per-page (`app.astro:9-12`: `Astro.redirect("/auth")` bez returnUrl). Zmiany w stronach i formularzu logowania, middleware nietknięty.

**Pliki:** `src/pages/app/scan.astro`, `src/pages/auth/index.astro`, `src/components/LoginForm.tsx`, `src/components/hooks/useAuthForm.ts`.

**Zakres**
1. `scan.astro`: niezalogowany → `Astro.redirect(\`/auth?returnUrl=${encodeURIComponent('/app/scan?code=' + code)}\`)`.
2. `auth/index.astro`: przekazać `returnUrl` do `LoginForm` (props); zalogowany z returnUrl → redirect na returnUrl zamiast `/app`.
3. `useAuthForm`: po udanym logowaniu redirect na returnUrl zamiast `/app`.
4. **Walidacja anty-open-redirect**: akceptować wyłącznie ścieżki względne zaczynające się od `/` i nie od `//` (helper `sanitizeReturnUrl`, test jednostkowy).
5. Pozostałe strony gated (boxes, settings, qr-generator) — opcjonalnie ten sam wzorzec (1 linia/strona); minimum: scan.

**Kryteria akceptacji**
- [ ] Skan QR na wylogowanym telefonie → login → lądowanie na stronie pudełka
- [ ] `returnUrl=https://evil.com` i `//evil.com` → ignorowane (redirect na `/app`); test jednostkowy helpera

---

### M2-05 `[test] E2E przepływu skanowania (bez kamery, przez ?code=)`
**Labels:** `faza:core, typ:test, obszar:frontend, P1` · **Estymacja:** 3 h · **Zależności:** M2-04

**Pliki:** nowy `tests/e2e/scan.spec.ts`, nowy `tests/e2e/page-objects/ScanPage.ts` (wzorzec: `BoxFormPage.ts`, `DashboardPage.ts`).

**Zakres**
1. Scenariusze (kamera niedostępna w CI — wszystkie przez URL `?code=`): przypisany QR → strona boxa; wolny QR → ekran przypisania → formularz z pre-wybranym QR; nieznany kod → ekran błędu; wylogowany + `?code=` → login → powrót na box.
2. Fixtures QR przez istniejące helpery (`tests/fixtures/qr-codes.ts`).

**Kryteria akceptacji**
- [ ] 4 scenariusze zielone w CI (job e2e w pull-request.yml)

---

### M2-06 `[frontend] Sidebar dashboardu jako Sheet na mobile`
**Labels:** `faza:core, typ:feature, obszar:frontend, P0` · **Estymacja:** 4 h · **Zależności:** brak (równolegle do M2-02..04)

**Kontekst (zweryfikowane)**
`DashboardContent.tsx` (31 LOC): `<aside className="w-80 border-r ...">` bez breakpointów, layout `flex h-[calc(100vh-73px)]`. `sheet.tsx` NIE jest zainstalowany (13 komponentów ui bez niego).

**Pliki:** `src/components/ui/sheet.tsx` (skill `add-shadcn-component`), `src/components/dashboard/DashboardContent.tsx`, `DashboardHeader.tsx` (hamburger), `LocationTree.tsx` (reuse w obu kontekstach).

**Zakres**
1. Dodać `Sheet` skillem add-shadcn-component.
2. `DashboardContent`: `<aside className="hidden lg:block lg:w-80 ...">`; na `< lg` ta sama zawartość (SearchInput + LocationTree) w `<Sheet side="left">`.
3. Hamburger w `DashboardHeader` (widoczny `< lg`, touch target ≥ 44 px), otwiera Sheet.
4. Wybór lokalizacji w Sheet zamyka go (callback z `DashboardContext.actions.selectLocation`).
5. Stan otwarcia Sheet — lokalny state (nie nanostore; resetuje się naturalnie).

**Kryteria akceptacji**
- [ ] 375 px: brak poziomego scrolla, lista boxów na pełnej szerokości, drzewo dostępne przez hamburger
- [ ] ≥ 1024 px: layout jak obecnie (regresja zero)
- [ ] Wybór lokalizacji zamyka Sheet i filtruje listę

---

### M2-07 `[frontend] Responsywny header, wyszukiwarka i selektor workspace`
**Labels:** `faza:core, typ:feature, obszar:frontend, P0` · **Estymacja:** 3 h · **Zależności:** M2-06

**Pliki:** `DashboardHeader.tsx` (84 LOC), `SearchInput.tsx` (87 LOC), `WorkspaceSelector.tsx` (75 LOC), `UserMenu.tsx` (84 LOC).

**Zakres**
1. Header `< lg`: hamburger + skrócony selektor workspace (truncate) + UserMenu; SearchInput przenosi się do Sheet (już w M2-06) lub drugi wiersz headera — wybrać prostsze podczas implementacji.
2. Wszystkie elementy interaktywne ≥ 44×44 px na touch.
3. Przycisk „Skanuj" (ikona QR) w headerze mobile → `/app/scan` (kluczowy punkt wejścia!).

**Kryteria akceptacji**
- [ ] Header mieści się w 375 px bez zawijania łamiącego layout
- [ ] Przycisk Skanuj widoczny na mobile, prowadzi do /app/scan
- [ ] Touch targets ≥ 44 px (audyt devtools)

---

### M2-08 `[frontend] Mobilna lista pudełek + szczegóły + toast zamiast alert()`
**Labels:** `faza:core, typ:feature, obszar:frontend, P0` · **Estymacja:** 3 h · **Zależności:** M2-06

**Pliki:** `BoxList.tsx`, `BoxListItem.tsx` (112 LOC), `BoxListContainer.tsx`, `src/components/box-details/**` (w tym `QrCodeDisplay.tsx:50` — `alert()` przy zablokowanym popupie wydruku).

**Zakres**
1. `BoxListItem`: układ mobilny (większe touch targety, akcje w dropdown zamiast rzędu ikon jeśli ciasno).
2. Strona szczegółów boxa: sekcje w jednej kolumnie `< sm`, przyciski akcji pełnej szerokości.
3. `QrCodeDisplay.tsx:50`: zamienić `alert()` na `ErrorBanner`/inline komunikat (komponent istnieje w shared).

**Kryteria akceptacji**
- [ ] Lista i szczegóły czytelne i klikalne na 375 px
- [ ] `grep -rn "alert(" src/components` → 0

---

### M2-09 `[frontend] Modale pełnoekranowe na mobile`
**Labels:** `faza:core, typ:feature, obszar:frontend, P1` · **Estymacja:** 3 h · **Zależności:** M2-06

**Pliki:** `BoxEditorModal.tsx` (217 LOC), `LocationEditorModal.tsx` (152 LOC), `DeleteConfirmationDialog.tsx`, ew. `src/components/ui/dialog.tsx` (wariant rozmiaru).

**Zakres**
1. Dialog content: `max-sm:h-dvh max-sm:max-w-full max-sm:rounded-none` (dvh — klawiatura iOS!).
2. Formularze przewijalne wewnątrz; przyciski submit/cancel przyklejone na dole, nad klawiaturą.
3. Sprawdzić focus trap i zamykanie gestem/X na mobile.

**Kryteria akceptacji**
- [ ] Tworzenie boxa i lokalizacji wykonalne jedną ręką na telefonie; klawiatura nie zasłania aktywnego pola

---

### M2-11 → **istniejące issue #95** `LocationTree Keyboard Navigation (WCAG 2.1 AA)`
**Labels (uzupełnić):** `faza:core, typ:feature, obszar:frontend, P1` · **Estymacja:** 3 h · **Zależności:** M2-06 (ten sam obszar kodu — robić PO, by uniknąć konfliktów)

**Kontekst (zweryfikowane)**
`LocationTreeNode.tsx` ma już 12 linii z `aria-*`/`tabIndex`/`onKeyDown` — częściowa obsługa istnieje. Brakuje pełnego wzorca [WAI-ARIA tree](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): strzałki ↑↓ (nawigacja), →← (expand/collapse/poziom), Home/End, `aria-expanded`/`aria-level`/`aria-selected`, roving tabindex.

**Zakres:** audyt obecnych 12 atrybutów → uzupełnić do pełnego wzorca; test z VoiceOver (iOS — i tak testujemy mobile w M2-10); test jednostkowy obsługi klawiszy.
**AC:** pełna nawigacja drzewa bez myszy; VoiceOver odczytuje poziom i stan węzła; istniejące AC z #95 odhaczone.

---

### M2-10 `[test] Przegląd manualny na fizycznych urządzeniach + poprawki`
**Labels:** `faza:core, typ:test, obszar:frontend, P1` · **Estymacja:** 3 h (+bufor) · **Zależności:** M2-05, M2-07..09, #95

**Zakres**
1. Checklista ekranów na fizycznym iOS Safari + Android Chrome (TEST env): login → dashboard (Sheet, search, lista) → szczegóły boxa → edycja → qr-generator → wydruk PDF → **skan wydrukowanego QR aparatem systemowym** → strona boxa → scan wewnętrzny → settings.
2. Zrzuty ekranu do komentarza issue; drobne fixy inline (< 30 min każdy), większe → nowe issues.

**Kryteria akceptacji**
- [ ] Checklista odhaczona dla obu platform; krytyczne blockery = 0 (lub zgłoszone i naprawione)
- [ ] **Pełny przepływ produktu działa fizycznie: wydruk → skan → pudełko** ← to jest DoD całego M2

---

## 4. Definicja ukończenia M2
- [ ] Wydrukowany QR zeskanowany aparatem telefonu prowadzi (przez login, jeśli trzeba) do strony pudełka
- [ ] QR wolny → przepływ przypisania do nowego pudełka z pre-wybranym kodem
- [ ] Dashboard w pełni używalny na 375 px; touch targets ≥ 44 px; przycisk Skanuj w nawigacji mobile
- [ ] 4 scenariusze e2e scan zielone w CI; #95 zamknięte; 0 `alert()` w komponentach

## 5. Issues na GitHubie
Do utworzenia po zamknięciu M1 (zgodnie z roadmapą #191). Mapowanie: M2-01..M2-10 → nowe issues; M2-11 → **istniejące #95** (uzupełnić labele/estymację, nie duplikować). Sprinty: pole `Sprint` tydz. 5–8.
