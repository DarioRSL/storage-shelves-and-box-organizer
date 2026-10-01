# Rozbudowa roadmapy produktu — Horyzonty H1–H3 (post-launch)

> Wynik sesji planistycznej (2026-06-13) opartej na PRD + researchu rynku (Sortly, Encircle, HomeZada, Nest Egg, Itemtopia, BoxLynk, SnapFind, Vorby, StorageIQ, Scanlily).
> **Kierunek (decyzje użytkownika):** gwiazda polarna = *najlepszy organizer dla domu i rodziny*; w planie wszystkie 4 tematy (zdjęcia, przedmioty, AI, wartość/ubezpieczenie); monetyzacja otwarta (funkcje wartościowe same w sobie, architektura nie zamyka drogi do meteringu); 1–2 rzeczy wciągnięte przed launch.
> Status: **do przeglądu i doprecyzowania** — po akceptacji rozbijemy na milestony/epiki/issues jak M1–M4.

---

## 1. Kontekst: gdzie jesteśmy vs rynek

Rdzeń produktu (QR + hierarchiczne lokalizacje + workspace'y z rolami + full-text search) jest solidny, a wielodostępowe workspace'y z RBAC stawiają go **ponad większością konkurencji konsumenckiej** (Sortly dodaje to dopiero w "for Teams"). Rynek 2026 przesunął się jednak w 4 kierunkach, których PRD świadomie nie objął (rozsądne cięcia na MVP, dziś — luki konkurencyjne):

| Kierunek | Stan u nas | Rynek | Ocena |
|---|---|---|---|
| **Zdjęcia zawartości** | brak (PRD: out of scope) | **wszyscy** (Sortly, HomyScan, Everspruce, BoxLynk, Nest Egg, Itemtopia) | **luka #1** — podstawa dla „zobacz bez otwierania" |
| **Przedmioty w pudełku** | tylko opis+tagi (wolny tekst) | Sortly (folder=box + przedmioty), itp. | luka — wzmacnia „znajdź bez otwierania" |
| **AI rozpoznające zdjęcie** | brak | StorageIQ, HomeZada, SnapFind, Vorby, Scanlily | wyróżnik 2026, bije w metrykę <45 s |
| **Wartość / ubezpieczenie** | brak | Encircle, HomeZada, NestEgg, Itemtopia, NAIC | motor monetyzacji; dla rodziny = dokumentacja majątku |

**Powiązanie z metrykami sukcesu z PRD:**
- Metryka #1 („czas dodania pudełka < 45 s") → AI: zdjęcie → opis+tagi do potwierdzenia *radykalnie* skraca ten czas.
- Metryka #3 („80% pudełek ma opis lub tagi") → zdjęcie liczy się jako wypełniona informacja; AI podnosi kompletność.
- Metryka #2 („skuteczność wyszukiwania") → przedmioty wewnątrz pudełek poprawiają trafność („znajdź rękawiczki" → przedmiot + jego pudełko).

**Co już mamy częściowo (dogonienie standardu, nie wyróżnik):** eksport CSV (US-011, `exportService.ts` istnieje), filtr po tagach (US-050), szablony pudełek (US-052), drag&drop (US-051).

---

## 2. Architektura: dlaczego ta kolejność

Cztery tematy nie są niezależne — łączy je **fundament zdjęć**:

```
                ┌─────────────────────────────┐
                │  ZDJĘCIA (Supabase Storage)  │  ← fundament
                │  bucket + RLS + upload/thumb │
                └───────┬───────────┬──────────┘
                        │           │
          ┌─────────────▼──┐   ┌────▼──────────────────┐
          │ AI: foto→opis   │   │ Wartość/ubezpieczenie │
          │ (Haiku 4.5)     │   │ (foto = dowód, raport)│
          └────────┬────────┘   └────────┬──────────────┘
                   │                      │
              ┌────▼──────────────────────▼────┐
              │   PRZEDMIOTY wewnątrz pudełek    │  ← rozszerzenie modelu danych
              │   (box_items: foto, wartość)     │     (search: przedmiot + pudełko)
              └──────────────────────────────────┘
```

- **Zdjęcia muszą być pierwsze** — model wizyjny potrzebuje obrazu do analizy; raport ubezpieczeniowy potrzebuje fotografii jako dowodu; przedmioty zyskują na zdjęciu przedmiotu.
- **M2 (launch) i tak buduje dostęp do kamery** dla skanowania QR → przechwytywanie zdjęcia jedzie na tej samej infrastrukturze uprawnień. To główny argument za **wciągnięciem cienkiego plasterka zdjęć przed launch**.

---

## 3. Rekomendacja: co wciągnąć przed launch

**Wciągnąć: „Zdjęcia MVP" (1 zdjęcie-okładka pudełka)** do M2/M3.

Uzasadnienie: zamyka luką #1 vs rynek (launch bez zdjęć wygląda blado przy każdym konkurencie), korzysta z infrastruktury kamery budowanej już w M2, i odblokowuje architektonicznie wszystkie trzy pozostałe tematy. Zakres pre-launch celowo wąski (jedno zdjęcie, upload+miniatura+podgląd), bez galerii/AI/wartości — te idą w H1–H3.

Reszta (galeria, przedmioty, AI, wartość) → **po launchu** jako H1–H3, by nie rozsadzić 16-tygodniowego planu M1–M4.

---

## 4. Horyzonty

### H0 (pre-launch pull-in) — „Zdjęcie pudełka" — ~10 h
Wciągnięte do M2/M3 (sprint tydz. 6–8, po stabilnej infrastrukturze kamery).

**E0. Fundament Storage + zdjęcie-okładka pudełka**
- Supabase Storage bucket `box-photos` z politykami RLS (dostęp tylko dla członków workspace; ścieżka `{workspace_id}/{box_id}/...`)
- Upload z kamery/galerii na stronie szczegółów i w formularzu boxa (komponenty React; reuse uprawnień kamery z M2)
- **Klient-side resize/kompresja** przed uploadem (canvas → WebP/JPEG, np. max 1600 px) — koszt storage i dane mobilne
- Miniatura na karcie pudełka (`BoxListItem`) i podgląd (lightbox) w szczegółach
- Kolumna `cover_photo_path` na `boxes` (migracja); URL generowany przez signed URL lub publiczny bucket z RLS
- AC: zdjęcie robione telefonem pojawia się na liście i w szczegółach; usunięcie pudełka kasuje pliki (trigger/cascade lub czyszczenie w serwisie)

> Monetyzacja-ready: od początku liczyć rozmiar/zużycie per workspace (kolumna agregująca lub widok) — przyszła linia limitu, ale **bez limitu na start**.

---

### H1 — „Wizualne pudełka" (M5, ~18 h)
Pełne wsparcie zdjęć — dogonienie standardu rynku.

**E1.1 Wiele zdjęć na pudełko + galeria** (~6 h)
- Tabela `box_photos` (id, box_id, path, sort_order, created_at) z RLS; migracja z `cover_photo_path` → pierwsze zdjęcie galerii
- Galeria w szczegółach (grid + lightbox + reorder); wybór okładki
- Limit miękki (np. 10/pudełko) — komunikat, nie twardy błąd

**E1.2 Optymalizacja i zarządzanie obrazami** (~4 h)
- Generowanie miniatur (Supabase image transformation lub klient); lazy-loading
- Strona/sekcja zużycia storage w ustawieniach (per workspace) — przygotowanie pod metering

**E1.3 Zdjęcia w generatorze QR / wydruku** (~3 h, opcjonalne)
- Miniatura na etykiecie (decyzja UX — może pogarszać czytelność druku; do prototypu)

**E1.4 Zdjęcia w eksporcie** (~3 h)
- Eksport CSV/ZIP z linkami/plikami zdjęć (rozszerza istniejący `exportService.ts`)

> Zależność: H0 (Storage). DoD H1: pudełko ma galerię zdjęć używalną na mobile; zużycie storage widoczne.

---

### H2 — „Przedmioty i inteligencja" (M6, ~26 h)
Dwa wyróżniki: granularność + AI. Serce różnicy względem konkurencji konsumenckiej.

**E2.1 Przedmioty wewnątrz pudełek — model i CRUD** (~6 h)
- Tabela `box_items` (id, box_id, workspace_id, name, quantity, tags[], photo_path?, value?, created_at) + RLS + indeksy
- CRUD w szczegółach pudełka (lista przedmiotów, dodaj/edytuj/usuń); licznik przedmiotów na karcie pudełka

**E2.2 Wyszukiwarka obejmuje przedmioty** (~5 h)
- Rozszerzenie `search_vector` o przedmioty (osobny indeks na `box_items` lub zdenormalizowany agregat na `boxes`)
- Wynik wyszukiwania pokazuje **przedmiot + jego pudełko + ścieżkę lokalizacji** („Rękawiczki zimowe → Pudełko «Zima» → Garaż › Regał")
- Decyzja UX: wyniki mieszane (pudełka + przedmioty) z wyróżnikiem typu

**E2.3 AI: zdjęcie → opis + tagi** (~6 h) — *killer feature dla metryki <45 s*
- Endpoint serwerowy (Astro SSR) wywołujący Claude **Haiku 4.5** z obrazem (vision) i **structured output** zwracającym `{ description: string, tags: string[] }`
- Przepływ UX: w formularzu pudełka/przedmiotu „✨ Opisz ze zdjęcia" → upload → AI sugeruje → **user potwierdza/edytuje** (nigdy auto-zapis bez akceptacji)
- Klucz API **wyłącznie po stronie serwera** (env, nigdy `PUBLIC_*`); rate-limit per user; obsługa `stop_reason: "refusal"` i błędów
- Koszt ~$0.0025/skan (patrz §6) — logować zużycie per workspace (przyszły meter)
- AC: zdjęcie zawartości → trafny polski opis + 3–6 tagów < kilka sekund; user może edytować przed zapisem

**E2.4 (stretch) AI: wiele przedmiotów z jednego zdjęcia** (~5 h)
- Structured output z listą przedmiotów (`items: [{name, quantity?}]`); user zaznacza, które dodać jako `box_items`
- To jest „auto-katalogowanie" z HomeZada/StorageIQ — mocny wyróżnik, ale wyższy koszt/tokeny i więcej UX; stretch po E2.3

**E2.5 Filtr po tagach** (~2 h) — domyka US-050
- Panel filtrów (multi-select tagów, AND), działa razem z wyszukiwarką; endpoint agregujący tagi

> Zależności: E2.3/E2.4 wymagają H0 (zdjęcia). DoD H2: „znajdź X" zwraca przedmiot i pudełko; AI skraca dodawanie pudełka do sekund.

---

### H3 — „Wartość i raporty" (M7, ~16 h)
Dokumentacja majątku dla rodziny — przydatna sama w sobie, otwiera ewentualny segment/monetyzację bez pivotu z „home/family".

**E3.1 Pola wartości i dokumentów** (~4 h)
- Na `boxes` i `box_items`: `value` (numeric), `currency`, `purchase_date`, `serial_number`, `receipt_photo_path`
- UI w formularzach; walidacja Zod

**E3.2 Sumowanie wartości** (~3 h)
- Rollup wartości per lokalizacja i per workspace (widok/zapytanie); wyświetlenie w nagłówku lokalizacji i w ustawieniach

**E3.3 Raport ubezpieczeniowy PDF/CSV** (~6 h)
- Rozszerzenie `exportService.ts`: raport „inwentarz majątku" — pozycje (pudełko/przedmiot, wartość, nr seryjny, zdjęcie, lokalizacja), suma, data; PDF (jspdf — już w zależnościach) + CSV
- Szablon czytelny dla ubezpieczyciela

**E3.4 (opcjonalne) Przypomnienia o gwarancji** (~3 h)
- Pole `warranty_expires`; prosta lista „wygasające gwarancje" w dashboardzie (bez powiadomień push — poza zakresem PWA)

> Zależności: korzysta z przedmiotów (H2) i zdjęć (H0). DoD H3: rodzina może udokumentować wartościowe rzeczy i wygenerować raport PDF.

---

## 5. Świadomie POZA tą rozbudową
- OAuth (Google/Apple) — wartościowe, ale nie z tej czwórki; osobna decyzja.
- Tryb offline / pełne PWA (service worker) — duży nakład; PRD wyklucza; rozważyć osobno (skanowanie w piwnicy bez zasięgu to realny case, ale to inny projekt).
- Natywna aplikacja mobilna — poza zakresem.
- Powiadomienia push, real-time, social/sharing publiczny — poza „home/family" MVP rozbudowy.

---

## 6. Notatki techniczne

### Supabase Storage (fundament zdjęć)
- Bucket `box-photos`, RLS oparte na członkostwie workspace (ścieżka prefiksowana `workspace_id`); spójne z istniejącym wzorcem `is_workspace_member`.
- **Zawsze resize po stronie klienta** przed uploadem (mobilne zdjęcia bywają 5–10 MB) — canvas → WebP, max ~1600 px długość; to też obniża przyszłe koszty.
- Czyszczenie: usunięcie pudełka/przedmiotu kasuje pliki (cascade w aplikacji lub Storage trigger).

### AI: zdjęcie → opis (model i koszt — zweryfikowane)
- **Model: Claude Haiku 4.5** (`claude-haiku-4-5`) — najtańszy zdolny model wizyjny: **$1 input / $5 output** za 1M tokenów, 200K kontekst, wsparcie vision + **structured outputs**.
- **Structured output** (`output_config.format` z JSON schema `{description, tags[]}`) → gwarantowany, parsowalny wynik bez kruchego parsowania tekstu.
- **Koszt skanu:** obraz w standardowej rozdzielczości ~1 600 tokenów + prompt ~200 + wynik ~150 → ≈ **$0.0025 / zdjęcie** (¼ centa). 1 000 skanów ≈ $2.50.
- Prompt cache na system-prompt jeszcze obniża input przy serii.
- **Bezpieczeństwo:** `ANTHROPIC_API_KEY` wyłącznie w env serwera (jak service-role w M3-06); endpoint SSR, rate-limit per user, obsługa `stop_reason: "refusal"` i błędów sieci. Reguła ESLint zakazująca importu klienta AI z `src/components/**`.
- **Multi-item (E2.4):** ten sam model, schema z listą; droższe (więcej tokenów wyjścia), ale wciąż grosze.

### Metering-readiness (monetyzacja otwarta)
- Od H0 logować: rozmiar storage per workspace, liczbę wywołań AI per workspace.
- **Nie budować billingu** dopóki nie ma decyzji — tylko obserwowalność, żeby później dało się postawić limit/plan bez migracji danych.

---

## 7. Szacunki i sekwencja

| Horyzont | Zakres | Godziny | Kiedy |
|---|---|---|---|
| **H0** | Zdjęcie-okładka (fundament) | ~10 h | wciągnięte do M2/M3 (pre-launch) |
| **H1 (M5)** | Galeria, optymalizacja, eksport zdjęć | ~18 h | post-launch |
| **H2 (M6)** | Przedmioty + wyszukiwarka + AI foto→opis (+stretch multi-item) | ~26 h | post-launch |
| **H3 (M7)** | Wartość + raport ubezpieczeniowy | ~16 h | post-launch |
| **Razem** | | **~70 h** (H1–H3 ~60 h post-launch) | |

Przy 5–10 h/tydz. H1–H3 to ~8–12 tygodni po launchu. Kolejność wewnątrz: H1 → H2 → H3 (twarda zależność od fundamentu zdjęć; AI i wartość zależą od H0/H2).

---

## 8. Ryzyka i decyzje do doprecyzowania

| Ryzyko / decyzja | Uwaga |
|---|---|
| Koszt storage przy wzroście | Resize klient-side + miękkie limity + metering od H0; twardy limit dopiero z decyzją o planach |
| Koszt AI przy skali | ~¼ centa/skan; logować zużycie; ewentualny limit darmowych skanów/miesiąc przy monetyzacji |
| Model danych: przedmioty vs tylko opis | Przedmioty to większa zmiana (search, UI) — H2 świadomie po launchu; rdzeń pudełek bez zmian |
| Zgody i prywatność zdjęć | Zdjęcia to dane osobowe → uwzględnić w `/privacy` (M4-04) i w usuwaniu konta (M3-06: kasować pliki Storage) |
| **Decyzja**: czy H0 (zdjęcia) wchodzi przed launch? | Rekomendacja: **tak**, cienki plasterek — patrz §3 |
| **Decyzja**: AI od razu PL czy PL+EN? | Spiąć z i18n (M3 stretch); prompt może zwracać w języku UI |
| **Decyzja**: multi-item AI (E2.4) w zakresie czy stretch? | Rekomendacja: stretch po E2.3 — najpierw zwalidować pojedynczy opis |

---

## 9. Następny krok
Po akceptacji kierunku i §3 (pull-in zdjęć): rozbicie H0–H3 na milestony GitHub (M5–M7 + wpięcie H0 do istniejących M2/M3), epiki i issues 2–4 h — analogicznie do M1–M4, z polem `Sprint` i zależnościami. H0 dostanie issues wpięte w sprinty tydz. 6–8.
