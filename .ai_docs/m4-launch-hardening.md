# M4 — Launch Hardening: szczegółowy zakres prac i wsad pod GitHub Issues

> Uszczegółowienie milestone'u M4 z `refactoring-launch-plan.md` (milestone GitHub #17, due 2026-10-04).
> Wszystkie założenia **zweryfikowane bezpośrednio w kodzie** (2026-06-12).
> Wcielone stare issues: **#97** (PROD Supabase), **#98** (runbook deploy/rollback), **#99** (final QA), **#155/#157** (testy), **#192** (reset hasła — luka z PRD US-045).

---

## 1. Weryfikacja założeń planu — korekty

| # | Założenie z planu | Stan faktyczny po weryfikacji | Wpływ na plan |
|---|---|---|---|
| 1 | „Sentry, /api/health — brak" | Potwierdzone: 0 zależności monitoringu w `package.json`, brak `src/pages/api/health*` | Bez zmian |
| 2 | „Coverage threshold 80% nieegzekwowany w CI" | **Nieprecyzyjne.** `pull-request.yml:54-55` JUŻ uruchamia `npm run test:coverage` = `vitest run --coverage`, a `vitest.config.ts:37-42` ma progi 80% — vitest failuje przy progach poniżej. Realne problemy: (a) skrypt odpala **unit+integration razem** (include w configu) — w kontekście PR integracja może nie mieć Supabase; (b) nieznana realna wartość pokrycia (raport stale'owy ze stycznia); (c) progi mogły nigdy realnie nie zadziałać, jeśli job omija ścieżkę | M4-08 = **audyt i kalibracja** istniejącego gate'a, nie budowa od zera |
| 3 | „Brakujące indeksy" | Potwierdzone — `initial_schema.sql:144-147`: boxes ma GIN(search_vector), GIN(tags), B-tree(location_id), B-tree(workspace_id); **brak** composite `(workspace_id, location_id)` i indeksów `created_at` na boxes/locations | Bez zmian |
| 4 | „Dockerfile single-stage, brak logów" | Potwierdzone: `Dockerfile` kopiuje pre-built `dist` (komentarz: „must be built before docker build"); `docker-compose.test.yml` — 0 sekcji `volumes` | Bez zmian (P2) |
| 5 | *(wcielone #97 — luka planu)* | Architektura wg `deployment.md` + commitów CI: **TEST = self-hosted Supabase w Dockerze na własnym serwerze** (internal URL `http://kong:8000`, commit 07e56b5); **PROD = Vercel + zdalny projekt Supabase**. Otwarte #97 „Setup Production Supabase Environment" wskazuje, że **projekt PROD Supabase nie jest jeszcze skonfigurowany** — plan M4 zakładał, że istnieje | **Nowe zadanie M4-10** (3 h): projekt supabase.com, migracje, env/secrets, auth redirect URLs |
| 6 | „Runbook backupów Supabase" | **Zakres podwójny** (konsekwencja #5): PROD = hosted (backupy/PITR wg planu Supabase), TEST = self-hosted (pg_dump cron na serwerze, własna odpowiedzialność!). Plus #98: runbook deploy+rollback | M4-03 rozszerzone do 3 h (oba środowiska + rollback) |
| 7 | „vercel.json — nagłówki bezpieczeństwa" | `vercel.json` istnieje, minimalny (framework, build) — **0 nagłówków bezpieczeństwa** (CSP, HSTS, X-Frame-Options...) | Jawnie w zakresie M4-11 |
| 8 | „~46 pominiętych testów integracyjnych" | **Skala 3× większa: ~156 markerów skip** w całym `tests/` (boxes 31, locations 31, workspaces 35, auth 10, db 22, inne) | M4-06/07: podejście **triage** — nie wszystko musi być odblokowane przed launchem; priorytet wg ryzyka, reszta → backlog z odhaczaniem katalogu TC-* (#105–#147) |
| 9 | „RegistrationForm — zgoda" | Potwierdzone: 0 trafień `terms/regulamin/privacy/zgod` w `RegistrationForm.tsx`; brak stron `/privacy`, `/terms` | Bez zmian |
| 10 | *(wcielone #192)* | Reset hasła: US-045 w PRD, **brak w kodzie** (0 trafień reset/forgot w auth). Supabase Auth ma wbudowany przepływ recovery; lokalny Inbucket (port 54324) do testów e-mail | Zadanie M4-12 (6 h) |

**Budżet M4: ~38 h** (28 h plan + 6 h #192 + 3 h #97 + 1 h rozszerzenie runbooków). Przy 7-8 h/tydz. to ~4,5–5 tygodni — **przekracza tydz. 13–16**. Mitygacja: M4-12 (reset hasła) i M4-10 (PROD Supabase) nie zależą od M3 — można je wciągnąć do tygodnia 12 (M3 ma tam tylko 3 h core M3-05); alternatywnie ciąć M4-09 (P2, 3 h).

---

## 2. Kolejność wykonania

```
Tydz. 12 (przedbiegi, jeśli bufor): M4-10 PROD Supabase (3h), M4-12 reset hasła (6h) — start
Tydz. 13: M4-01 Sentry (3h) · M4-02 health+UptimeRobot (2h) · M4-03 runbooki (3h)
Tydz. 14: M4-04 legal+zgoda (3h) · M4-05 indeksy (2h) · M4-12 dokończenie
Tydz. 15: M4-06 triage+testy cz.1 (3h) · M4-07 testy cz.2 (3h) · M4-08 coverage audit (2h)
Tydz. 16: M4-09 Dockerfile (3h, P2 — pierwszy do cięcia) · M4-11 audyt+headers (3h) · M4-13 go-live (2h)
```

Zależności twarde: M4-10 → przed M4-11 (audyt wymaga PROD env) · M4-04 → po M3-06/#184 (link „usuń konto" w polityce) · M4-13 → po wszystkim P0.

---

## 3. Wsad issues — gotowe treści

### M4-01 `[ops] Sentry (free tier) dla klienta i SSR`
**Labels:** `faza:launch, typ:infra, obszar:ops, P0` · **Estymacja:** 3 h · **Zależności:** brak

**Pliki:** `astro.config.mjs` (`@sentry/astro`), `package.json`, env Vercel + TEST (`SENTRY_DSN`), `src/lib/services/logger.ts` (hook error→Sentry), `.env.example`.

**Zakres**
1. `npx astro add @sentry/astro`; konfiguracja DSN przez env (bez hardcodu); `environment: TEST/PROD` z BUILD_TARGET.
2. Source maps upload w CI (`SENTRY_AUTH_TOKEN` jako secret) — krok w `deploy.yml`.
3. `log.error` w logger.ts dodatkowo raportuje do Sentry (serwer); klient: domyślna integracja astro.
4. Filtrowanie PII: `beforeSend` usuwa nagłówki auth/cookies; sample rate 1.0 errors, 0 transactions (oszczędność free tier 5k/msc).
5. Test: celowy błąd na TEST → event widoczny w Sentry z czytelnym stack trace (source maps działają).

**AC:** błąd testowy z TEST i PROD widoczny w Sentry z odmapowanym stackiem; eventy nie zawierają tokenów/cookies.

---

### M4-02 `[ops] Endpoint /api/health + monitoring UptimeRobot`
**Labels:** `faza:launch, typ:infra, obszar:ops, P0` · **Estymacja:** 2 h · **Zależności:** brak

**Pliki:** nowy `src/pages/api/health.ts`, konfiguracja UptimeRobot (poza repo), `docker-compose.test.yml` (healthcheck może użyć endpointu).

**Zakres**
1. `GET /api/health`: bez auth, `{ status: "ok", db: true|false }` — lekki select (`from("workspaces").select("id").limit(1)` przez anon client lub prostsze `select 1` rpc); 200 gdy DB odpowiada, 503 gdy nie; timeout 3 s; bez szczegółów wersji (nie ujawniać stacku).
2. UptimeRobot free: 2 monitory HTTP (PROD, TEST), interwał 5 min, alert e-mail po 2 failach.
3. Healthcheck w `docker-compose.test.yml` przepiąć na `/api/health` (obecnie goły node HTTP call).

**AC:** oba monitory zielone; symulowany down (stop kontenera TEST) → alert e-mail; endpoint nie wymaga auth i nie ujawnia wewnętrznych detali.

---

### M4-03 `[ops] Runbooki: backup/restore (PROD hosted + TEST self-hosted) + deploy/rollback` *(scala #98)*
**Labels:** `faza:launch, typ:docs, obszar:ops, P0` · **Estymacja:** 3 h · **Zależności:** M4-10 (PROD musi istnieć, by przetestować restore)

**Kontekst (zweryfikowane)**
Architektura dwoista: PROD = hosted Supabase (backupy wg planu — Pro ma daily, free NIE MA automatycznych backupów!), TEST = **self-hosted w Dockerze** (kong:8000) — backupy to w 100% nasza odpowiedzialność. Wcielone #98: procedura deploy + rollback.

**Pliki:** nowy `.ai_docs/runbook-ops.md` (backup/restore/deploy/rollback), ew. `scripts/backup-test-db.sh` + cron na serwerze TEST.

**Zakres**
1. PROD: zweryfikować plan Supabase i dostępność backupów; na free → skrypt `pg_dump` przez connection string z crona (GitHub Actions schedule albo serwer TEST) do storage; udokumentować RTO/RPO.
2. TEST: `pg_dump` cron na serwerze (np. codziennie, retencja 7 dni).
3. **Jedno przećwiczone przywrócenie** (restore do świeżej lokalnej instancji z dumpa) — z notatkami czasu trwania.
4. Runbook deploy/rollback (#98): jak wygląda deploy TEST (docker-compose, IMAGE_TAG) i PROD (Vercel); rollback = poprzedni IMAGE_TAG / Vercel instant rollback; kto/jak decyduje.

**AC:** runbook w repo; restore przećwiczony 1× z timingiem; na PROD potwierdzony mechanizm backupu (plan lub własny cron); #98 zamknięte tym zadaniem.

---

### M4-04 `[frontend] Strony /privacy + /terms + zgoda przy rejestracji`
**Labels:** `faza:launch, typ:feature, obszar:frontend, P0` · **Estymacja:** 3 h · **Zależności:** #184 (M3-06 — opis usuwania konta w polityce musi być prawdziwy)

**Pliki:** nowe `src/pages/privacy.astro`, `src/pages/terms.astro`; `src/layouts/Layout.astro` (stopka z linkami); `src/components/RegistrationForm.tsx` + `useAuthForm.ts` (checkbox zgody — zweryfikowane: dziś 0 elementów zgody).

**Zakres**
1. Strony statyczne (prerender ok), dostępne bez logowania; treść PL: zakres danych (e-mail, nazwa, dane pudełek), procesorzy (Supabase, Vercel — lokalizacje serwerów), prawo do usunięcia (działający przepływ z M3-06), kontakt; bez ról prawniczych — szablon rzetelny, do ewentualnej konsultacji po launchu.
2. RegistrationForm: wymagany checkbox „Akceptuję regulamin i politykę prywatności" z linkami; walidacja przed submit.
3. Stopka w Layout: linki /privacy, /terms.

**AC:** rejestracja niemożliwa bez zgody; strony linkowane ze stopki i formularza; treść pokrywa wymagane minimum RODO.

---

### M4-05 `[db] Indeksy wydajnościowe`
**Labels:** `faza:launch, typ:infra, obszar:db, P1` · **Estymacja:** 2 h · **Zależności:** brak

**Kontekst (zweryfikowane):** `initial_schema.sql:144-147` — brak composite `(workspace_id, location_id)` na boxes (najczęstsze zapytanie listy: filtr workspace+lokalizacja) i `created_at` na boxes/locations.

**Zakres:** migracja `create index ... on boxes (workspace_id, location_id);` + `(workspace_id, created_at desc)` na boxes; `EXPLAIN ANALYZE` listowania boxów per lokalizacja przed/po (na seedzie ~1k boxów); rozważyć usunięcie zbędnego już `boxes_location_id_idx` jeśli composite go pokrywa (lewa kolumna inna — NIE pokrywa; zostawić).

**AC:** migracja przechodzi; `EXPLAIN` pokazuje użycie nowego indeksu dla zapytania listy.

---

### M4-06 `[test] Triage ~156 markerów skip + odblokowanie: auth, workspaces` *(scala #155/#157 cz.1)*
**Labels:** `faza:launch, typ:test, obszar:backend, P1` · **Estymacja:** 3 h · **Zależności:** #175 (M1-08), #180 (M3-02)

**Kontekst (zweryfikowane — skala 3× większa niż w planie)**
Markery skip per plik: boxes.test.ts **31**, locations.test.ts 15 + location-detail 16, workspace-members 14 + workspace-detail 13 + workspaces 8, session 7, triggers 7, delete-account 3 (→ #185), inne drobne. Razem ~156. Nie wszystko musi być zielone przed launchem — potrzebny triage.

**Zakres**
1. **Triage (1 h):** tabela w issue — każdy plik: ile skipów, powód (stub bez implementacji? broken mock? brak danych?), kategoria: (a) odblokować przed launchem, (b) backlog po launchu, (c) usunąć (martwy stub duplikujący inne testy).
2. Odblokowanie kategorii (a) dla auth (session 7) + workspaces (35) — testy krytyczne dla bezpieczeństwa dostępu.
3. Mapowanie na katalog TC-AUTH (#105–#110): odhaczyć pokryte przypadki w issues katalogu.

**AC:** tabela triage opublikowana; 0 nieuzasadnionych skipów w auth/workspaces (uzasadnione = komentarz + link do issue backlogu); CI zielone.

---

### M4-07 `[test] Odblokowanie testów: boxes, locations, qr-codes` *(scala #155/#157 cz.2)*
**Labels:** `faza:launch, typ:test, obszar:backend, P1` · **Estymacja:** 3 h · **Zależności:** M4-06 (triage)

**Zakres:** wg tabeli triage — kategoria (a) dla boxes (31), locations (31), qr-codes (5), triggers (7); kategoria (c) usunąć; backlog (b) → jedno zbiorcze issue post-launch. Odhaczanie katalogu TC-LOC/TC-BOX/TC-QR/TC-SEARCH (#117–#143).

**AC:** 0 nieuzasadnionych skipów w plikach kategorii (a); #155 i #157 zamknięte (z odnośnikiem do backlogu post-launch dla reszty).

---

### M4-08 `[ci] Audyt i kalibracja coverage gate`
**Labels:** `faza:launch, typ:infra, obszar:ci, P1` · **Estymacja:** 2 h · **Zależności:** M4-07

**Kontekst (KOREKTA założenia z planu)**
Gate **częściowo istnieje**: `pull-request.yml:54` uruchamia `npm run test:coverage` (= `vitest run --coverage`), a `vitest.config.ts:37-42` ma progi 80% — vitest z progami failuje poniżej. Niewiadome: czy job realnie egzekwuje (przechodzi przy <80%? skrypt odpala też integrację — czy ma sekrety w PR?), jaka jest realna wartość pokrycia (raport stale ze stycznia).

**Zakres**
1. Audyt: uruchomić `npm run test:coverage` lokalnie → realne liczby; sprawdzić logi ostatniego PR-joba (czy progi zadziałały / czy integracja failuje cicho).
2. Rozdzielić: coverage gate tylko na unit (`vitest run tests/unit --coverage`), integracja osobnym jobem (już jest w deploy.yml z sekretami).
3. Skalibrować progi do realnej wartości (np. realne 62% → próg 60%, podnoszony przy każdym milestone) — próg ma łapać regresję, nie być fikcją.
4. Wynik coverage w komentarzu PR (krok status comment już istnieje — uzupełnić o liczby).

**AC:** świadomie ustawiony, działający gate (test: sztuczne obniżenie pokrycia → job czerwony); realna wartość pokrycia udokumentowana w issue.

---

### M4-09 `[ops] Multi-stage Dockerfile + persystencja logów TEST`
**Labels:** `faza:launch, typ:infra, obszar:ops, P2` · **Estymacja:** 3 h · **Zależności:** brak · **(pierwszy kandydat do cięcia)**

**Kontekst (zweryfikowane):** Dockerfile wymaga pre-built `dist` (build w CI); `docker-compose.test.yml` bez `volumes` — logi winston (daily-rotate-file) giną z kontenerem.

**Zakres:** stage builder (node:22-alpine, `npm ci` + `npm run build:test`) + stage runtime (jak obecny); `volumes: - ./logs:/app/logs` w compose; sprawdzić ścieżkę logów winston.

**AC:** `docker build` od zera bez wcześniejszego dist; logi przeżywają restart kontenera.

---

### M4-10 → **istniejące issue #97** `Setup Production Supabase Environment` *(luka planu — NIE duplikować, uzupełnić #97)*
**Labels (uzupełnić):** `faza:launch, typ:infra, obszar:ops, P0` · **Estymacja:** 3 h · **Zależności:** brak (można wciągnąć do tydz. 12)

**Kontekst:** PROD = Vercel + zdalny Supabase; projekt PROD **nie istnieje/nieskonfigurowany** (stąd otwarte #97). TEST jest self-hosted — PROD będzie pierwszym kontaktem z hosted Supabase.

**Zakres**
1. Projekt na supabase.com (region EU — RODO), plan: free na start z świadomością braku backupów → decyzja w M4-03.
2. `supabase link` + `supabase db push` (7+ migracji) na PROD; weryfikacja RLS włączone.
3. Secrets w Vercel: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (po M3-06); GitHub secrets dla deploy.yml (PROD_*).
4. Auth: redirect URLs (domena PROD + /auth/callback, /auth/reset-password po M4-12), SMTP (wbudowany limit 4/h — na start OK, odnotować upgrade path).
5. Smoke: rejestracja + login na preview podpiętym do PROD DB.

**AC:** aplikacja na Vercel działa przeciw PROD Supabase; RLS aktywne (szybki test izolacji); secrets nie zawierają wartości TEST.

---

### M4-12 → **istniejące issue #192** `Reset hasła (password recovery)` *(luka z PRD US-045 — issue już utworzone)*
**Estymacja:** 6 h · **Zależności:** miękkie #178; wykonalne od tygodnia 12.
Zakres i AC w #192 (przepływ Supabase Auth: `resetPasswordForEmail` → `/auth/reset-password` → `updateUser`; neutralna odpowiedź formularza; Inbucket do testów lokalnych; redirect URLs per env — spiąć z M4-10 pkt 4).

---

### M4-11 `[launch] Audyt przedstartowy: security pass + nagłówki + DoD` *(scala #99 cz.1)*
**Labels:** `faza:launch, typ:infra, obszar:ops, P0` · **Estymacja:** 3 h · **Zależności:** wszystkie P0 M4 + #97

**Zakres**
1. Nagłówki bezpieczeństwa w `vercel.json` (zweryfikowane: dziś brak): HSTS, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy, bazowy CSP (uwaga na inline skrypty Astro — `ThemeInitializer`!).
2. Skill `security-review` na diffie całości zmian M1–M4.
3. `npm run build:prod` → grep `dist/` po `SERVICE_ROLE`, kluczach, tokenach.
4. Checklista DoD z `refactoring-launch-plan.md` — odhaczenie lub świadome odroczenie z issue.

**AC:** nagłówki aktywne (securityheaders.com ≥ A-); 0 sekretów w bundlu; checklista DoD w komentarzu.

---

### M4-13 `[launch] Go-live: merge test→master, smoke PROD, obserwacja` *(scala #99 cz.2)*
**Labels:** `faza:launch, typ:infra, obszar:ops, P0` · **Estymacja:** 2 h (+48 h obserwacji pasywnej) · **Zależności:** M4-11

**Zakres:** PR test→master (pipeline: quality → integration → deploy Vercel PROD); smoke na PROD: rejestracja (z e-mailem!) → workspace → lokalizacja → box → wydruk QR → skan telefonem → szczegóły → reset hasła → usunięcie konta testowego; 48 h: Sentry + UptimeRobot bez alertów krytycznych; zamknąć #99, #191-checklisty.

**AC:** pełny przepływ produktu działa na PROD; 48 h czysto; ogłoszenie launchu 🚀

---

## 4. Definicja ukończenia M4 = Definition of Done launchu
- [ ] PROD Supabase skonfigurowany (RLS aktywne, EU, backupy rozstrzygnięte) — #97
- [ ] Sentry + UptimeRobot aktywne; runbook backup/restore/deploy/rollback przećwiczony — #98
- [ ] /privacy + /terms + wymagana zgoda; reset hasła działa — #192
- [ ] Indeksy założone; triage skipów wykonany, auth/workspaces/boxes bez nieuzasadnionych skipów — #155/#157
- [ ] Coverage gate realnie działa (świadomy próg); nagłówki bezpieczeństwa ≥ A-
- [ ] Smoke na PROD + 48 h obserwacji — #99

## 5. Issues na GitHubie
Do utworzenia po zamknięciu M3 (wg #191): M4-01..09, M4-11, M4-13 → nowe issues; **M4-10 → istniejące #97** i **M4-12 → istniejące #192** (uzupełnić labele/estymacje, nie duplikować). #98/#99/#155/#157 zamykać przy zadaniach, które je scalają. Sprinty: tydz. 13–16 (+przedbiegi 12).
