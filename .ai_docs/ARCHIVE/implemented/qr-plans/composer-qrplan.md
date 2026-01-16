# Plan Wdrożenia Generowania Kodów QR - Analiza Architektoniczna

## 1. Analiza Obecnego Stanu

### 1.1 Co jest już gotowe

- **Baza danych**: Tabela `qr_codes` z triggerami generującymi `short_id` (format: `QR-XXXXXX`)
- **Typy TypeScript**: `QrCodeDto`, `BatchGenerateQrCodesRequest`, `QrCodeDetailDto` w `src/types.ts`
- **Service Layer**: Podstawowe klasy błędów (`QrCodeNotFoundError`, `QrCodeAlreadyAssignedError`) w `box.service.ts`
- **Stack**: Astro 5, React 19, TypeScript 5, biblioteka `react-qr-code` / `qrcode.react` w planach

### 1.2 Co będzie dodane dzisiaj

- Endpointy API: `POST /api/qr-codes/batch` i `GET /api/qr-codes/:short_id`
- Tabele i migracje bazy danych (już istnieją)

### 1.3 Co brakuje

- **Backend**: Serwis generowania QR kodów (tworzenie rekordów w bazie)
- **Backend**: Generowanie PDF z kodami QR (arkusze A4)
- **Backend**: Generowanie obrazów QR (SVG/PNG) dla PDF
- **Frontend**: Komponenty UI do generowania i pobierania PDF
- **Frontend**: Routing dla skanowania kodów QR (`/qr/:short_id`)

## 2. Rekomendacja Czasowa - Kiedy Wdrożyć

### 2.1 Optymalna kolejność (REKOMENDOWANA)

**FAZA 1: Backend Infrastructure (PRZED pracami nad UI) - 1-2 dni**

- Implementacja serwisu generowania QR kodów (`qr.service.ts`)
- Implementacja endpointu `POST /api/qr-codes/batch`
- Implementacja endpointu `GET /api/qr-codes/:short_id`
- **Dlaczego teraz**: UI będzie potrzebowało działających endpointów do testowania

**FAZA 2: PDF Generation Backend (PRZED pracami nad UI) - 1-2 dni**

- Implementacja generowania obrazów QR (SVG/PNG) po stronie serwera
- Implementacja generowania PDF z arkuszami etykiet
- Endpoint `GET /api/qr-codes/batch/:batch_id/pdf` lub podobny
- **Dlaczego teraz**: PDF generation jest niezależne od UI i może być testowane osobno

**FAZA 3: Frontend UI (W TRAKCIE prac nad UI) - 2-3 dni**

- Komponent formularza batch generation (ilość kodów)
- Komponent wyświetlania podglądu PDF
- Przycisk pobierania PDF
- Routing dla skanowania (`/qr/:short_id`)

### 2.2 Dlaczego ta kolejność?

**Korzyści:**

1. **Niezależność**: Backend może być testowany bez UI (curl, Postman)
2. **Szybkie iteracje**: UI może od razu korzystać z gotowych endpointów
3. **Mniejsze ryzyko**: Problemy z generowaniem PDF są wykrywane wcześniej
4. **Lepsze testowanie**: Każda warstwa jest testowana osobno

**Ryzyka alternatywnej kolejności (UI przed backendem):**

- Mockowanie endpointów w UI → podwójna praca
- Problemy z PDF generation mogą wymagać zmian w UI
- Trudniejsze debugowanie (frontend + backend jednocześnie)

## 3. Szczegółowy Plan Implementacji

### 3.1 FAZA 1: Backend Services (Priorytet: WYSOKI)

#### 3.1.1 Serwis QR Codes

**Plik**: `src/lib/services/qr.service.ts`

```typescript
// Funkcje do zaimplementowania:
- generateBatchQrCodes(workspace_id, quantity): Promise<QrCodeDto[]>
- getQrCodeByShortId(short_id): Promise<QrCodeDetailDto>
- updateQrCodeStatus(qr_code_id, status): Promise<void>
```

**Zależności:**

- Supabase client
- Walidacja workspace membership (RLS)
- Generowanie unikalnych `short_id` (już w triggerze DB)

**Szacowany czas**: 4-6 godzin

#### 3.1.2 Endpoint POST /api/qr-codes/batch

**Plik**: `src/pages/api/qr-codes/batch.ts`

**Funkcjonalność:**

- Walidacja `workspace_id` i `quantity` (1-100)
- Wywołanie serwisu `generateBatchQrCodes`
- Zwrócenie listy wygenerowanych kodów

**Szacowany czas**: 2-3 godziny

#### 3.1.3 Endpoint GET /api/qr-codes/:short_id

**Plik**: `src/pages/api/qr-codes/[short_id].ts`

**Funkcjonalność:**

- Pobranie kodu QR po `short_id`
- Zwrócenie statusu i `box_id` (jeśli przypisany)
- Routing logic dla frontendu (empty vs assigned)

**Szacowany czas**: 2-3 godziny

### 3.2 FAZA 2: PDF Generation (Priorytet: WYSOKI)

#### 3.2.1 Biblioteki do zainstalowania

```bash
npm install qrcode @types/qrcode jspdf jspdf-autotable
# lub alternatywnie:
npm install qrcode @types/qrcode pdfkit
```

**Rekomendacja**: `qrcode` + `jspdf` (lepsze wsparcie dla TypeScript, łatwiejsze layoutowanie)

#### 3.2.2 Serwis PDF Generation

**Plik**: `src/lib/services/pdf.service.ts`

**Funkcjonalność:**

```typescript
- generateQrCodeImage(qr_data, size): Promise<Buffer|string> // SVG/PNG
- generateQrLabelSheet(qr_codes: QrCodeDto[]): Promise<Buffer> // PDF A4
- calculateLabelLayout(pageWidth, pageHeight, labelWidth, labelHeight): Layout
```

**Format etykiety:**

- QR kod (centrum, rozmiar ~40x40mm)
- Short ID tekstowy pod kodem (np. `QR-A1B2C3`)
- Opcjonalnie: miejsce na notatki użytkownika

**Layout A4:**

- Siatka etykiet (np. 3x8 = 24 etykiety na stronę)
- Marginesy dobre do druku domowego
- Wsparcie dla wielu stron (batch > 24)

**Szacowany czas**: 6-8 godzin

#### 3.2.3 Endpoint GET /api/qr-codes/batch/pdf

**Plik**: `src/pages/api/qr-codes/batch/pdf.ts`

**Funkcjonalność:**

- Query param: `qr_code_ids` (array UUID) lub `batch_id`
- Generowanie PDF przez serwis
- Zwrócenie PDF jako `application/pdf` z odpowiednimi headers
- Content-Disposition: attachment z nazwą pliku

**Szacowany czas**: 2-3 godziny

### 3.3 FAZA 3: Frontend UI (Priorytet: ŚREDNI - w trakcie prac nad UI)

#### 3.3.1 Komponent Batch Generation Form

**Plik**: `src/components/qr/QrBatchGenerator.tsx`

**Funkcjonalność:**

- Formularz z inputem `quantity` (1-100)
- Przycisk "Generuj kody"
- Loading state podczas generowania
- Wyświetlenie listy wygenerowanych kodów
- Przycisk "Pobierz PDF"

**Szacowany czas**: 3-4 godziny

#### 3.3.2 Routing dla skanowania

**Plik**: `src/pages/qr/[short_id].astro` lub `src/pages/qr/[short_id].tsx`

**Funkcjonalność:**

- Pobranie danych QR code przez API
- Routing:
  - Jeśli `box_id === null` → przekierowanie do `/boxes/new?qr_code_id=...`
  - Jeśli `box_id !== null` → przekierowanie do `/boxes/[box_id]`

**Szacowany czas**: 2-3 godziny

## 4. Architektura i Przepływ Danych

### 4.1 Przepływ generowania batch QR kodów

```
User clicks "Generate QR Codes"
  ↓
Frontend: POST /api/qr-codes/batch { workspace_id, quantity: 20 }
  ↓
Backend: qr.service.generateBatchQrCodes()
  ↓
Database: INSERT INTO qr_codes (20 rows, trigger generates short_id)
  ↓
Backend: Return array of QrCodeDto
  ↓
Frontend: Display list + "Download PDF" button
  ↓
User clicks "Download PDF"
  ↓
Frontend: GET /api/qr-codes/batch/pdf?qr_code_ids=...
  ↓
Backend: pdf.service.generateQrLabelSheet()
  ↓
Backend: Generate QR images + Layout PDF
  ↓
Response: PDF file download
```

### 4.2 Przepływ skanowania QR kodu

```
User scans QR code with phone camera
  ↓
Phone opens URL: https://app.domain.com/qr/QR-A1B2C3
  ↓
Frontend: GET /api/qr-codes/QR-A1B2C3
  ↓
Backend: qr.service.getQrCodeByShortId()
  ↓
Response: { box_id: null, status: 'generated' } // lub { box_id: 'uuid', status: 'assigned' }
  ↓
Frontend routing logic:
  - If box_id === null → Redirect to /boxes/new?qr_code_id=...
  - If box_id !== null → Redirect to /boxes/[box_id]
```

## 5. Decyzje Architektoniczne

### 5.1 Generowanie QR kodów: Server-side vs Client-side

**Rekomendacja: SERVER-SIDE dla PDF generation**

**Uzasadnienie:**

- PDF generation wymaga precyzyjnego layoutowania (A4, marginesy)
- Server-side zapewnia spójność (niezależnie od przeglądarki)
- Bezpieczeństwo: URL w QR kodach są generowane po stronie serwera
- Performance: Ciężkie operacje (PDF) nie obciążają przeglądarki

**Client-side tylko dla:**

- Podgląd pojedynczego kodu QR w UI (opcjonalnie)
- Testowanie bez backendu (development)

### 5.2 Format QR kodu w PDF: SVG vs PNG

**Rekomendacja: SVG**

**Uzasadnienie:**

- Wektorowy = skalowalny bez utraty jakości
- Mniejszy rozmiar pliku PDF
- Biblioteka `qrcode` wspiera SVG natywnie

**PNG jako fallback:**

- Jeśli SVG powoduje problemy z renderowaniem w PDF
- Dla bardzo małych kodów QR (< 20x20px)

### 5.3 Struktura URL w kodach QR

**Format**: `https://app.domain.com/qr/{short_id}`

**Przykład**: `https://app.domain.com/qr/QR-A1B2C3`

**Uzasadnienie:**

- Krótki URL = mniej danych w QR kodzie = lepsza czytelność
- `short_id` jest unikalny globalnie (unique constraint w DB)
- Routing przez `/qr/:short_id` jest czytelny i RESTful

### 5.4 Layout etykiet A4

**Rekomendacja:**

- **Rozmiar etykiety**: 70mm x 35mm (standardowa etykieta)
- **Siatka**: 3 kolumny x 8 rzędów = 24 etykiety na stronę A4
- **Marginesy**: 10mm góra/dół, 5mm lewo/prawo
- **Odstępy**: 2mm między etykietami

**Alternatywa (mniejsze etykiety):**

- 50mm x 30mm → 4x10 = 40 etykiet na stronę
- Lepsze dla małych pudełek, ale mniejszy QR kod

## 6. Pytania do Rozważenia

### 6.1 Czy potrzebujesz podglądu PDF przed pobraniem?

- **Opcja A**: Tylko przycisk "Pobierz PDF" (szybsze wdrożenie)
- **Opcja B**: Podgląd PDF w iframe/embed (lepsze UX, ale więcej pracy)

**Rekomendacja MVP**: Opcja A (można dodać później)

### 6.2 Czy potrzebujesz możliwości ponownego pobrania PDF?

- **Opcja A**: PDF generowany na żądanie (zawsze aktualny)
- **Opcja B**: PDF cache'owany (szybsze, ale może być nieaktualny)

**Rekomendacja**: Opcja A (generowanie na żądanie)

### 6.3 Czy potrzebujesz customizacji etykiet?

- Rozmiar QR kodu
- Dodatkowy tekst na etykiecie
- Logo/znak wodny

**Rekomendacja MVP**: Nie (można dodać w przyszłości)

## 7. Harmonogram Szacunkowy

### Tydzień 1 (Backend)

- **Dzień 1-2**: Implementacja `qr.service.ts` + endpointy API
- **Dzień 3-4**: Implementacja `pdf.service.ts` + endpoint PDF
- **Dzień 5**: Testy integracyjne, poprawki

### Tydzień 2 (Frontend - równolegle z innymi pracami UI)

- **Dzień 1-2**: Komponent `QrBatchGenerator`
- **Dzień 3**: Routing `/qr/:short_id`
- **Dzień 4-5**: Testy end-to-end, poprawki UX

## 8. Ryzyka i Mitigacje

### Ryzyko 1: Problemy z generowaniem PDF

**Mitigacja**: Użyj sprawdzonych bibliotek (`jspdf`), testuj na różnych przeglądarkach

### Ryzyko 2: Wydajność przy dużych batch'ach (100+ kodów)

**Mitigacja:**

- Limit batch size (max 100)
- Generowanie PDF w tle (queue) dla dużych batchy (future improvement)

### Ryzyko 3: Nieczytelne QR kody po wydruku

**Mitigacja:**

- Testuj na różnych drukarkach
- Minimum rozmiar QR: 40x40mm
- Error correction level: Medium (L) lub High (H)

## 9. Testy

### Testy Backend (FAZA 1-2)

- Unit testy dla `qr.service.ts`
- Unit testy dla `pdf.service.ts`
- Integration testy dla endpointów API
- Testy PDF generation (sprawdź rozmiar, layout, czytelność QR)

### Testy Frontend (FAZA 3)

- E2E testy: generowanie → pobieranie PDF
- Testy routing: skanowanie pustego vs przypisanego kodu
- Testy responsywności (mobile vs desktop)

## 10. Dokumentacja

Po implementacji zaktualizuj:

- `.ai_docs/api-plan.md` - oznaczenie endpointów jako zaimplementowane
- `README.md` - sekcja o generowaniu QR kodów
- Dodaj przykłady użycia API w dokumentacji

---

## Podsumowanie Rekomendacji

**WDROŻENIE PRZED PRACAMI NAD UI:**

1. ✅ Backend services (`qr.service.ts`) - **FAZA 1**
2. ✅ Endpointy API (POST batch, GET by short_id) - **FAZA 1**
3. ✅ PDF generation service (`pdf.service.ts`) - **FAZA 2**
4. ✅ Endpoint PDF download - **FAZA 2**

**WDROŻENIE W TRAKCIE PRAC NAD UI:**

1. Komponenty React dla batch generation
2. Routing dla skanowania QR kodów
3. Integracja z istniejącymi komponentami UI

**KRYTYCZNE DECYZJE:**

- Server-side PDF generation (nie client-side)
- Format SVG dla QR kodów w PDF
- Layout: 3x8 etykiet na A4 (70x35mm każda)
- URL format: `/qr/{short_id}`

**SZACOWANY CZAS:**

- Backend (FAZA 1-2): 12-16 godzin
- Frontend (FAZA 3): 6-8 godzin
- **RAZEM**: ~20-24 godziny pracy
