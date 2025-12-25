# Plan Wdrożenia Mechanizmu Kodów QR

**Autor:** Claude Sonnet 4.5  
**Data:** 2025-12-25  
**Wersja:** 1.0  
**Status:** Do zatwierdzenia

---

## Kontekst Decyzyjny

Na podstawie analizy dokumentacji projektu i odpowiedzi użytkownika, proponuję **podejście trzyfazowe** z elastycznym timing'iem. Jako osoba ucząca się stacku JS/React od zera (background Python/DevOps), kluczowe jest unikanie "przepalenia" czasowego na trudnych feature'ach przed opanowaniem podstaw.

### Kluczowe Obserwacje

- ✅ Baza danych z tabelą `qr_codes` gotowa (trigery, indexes, RLS)
- ✅ Endpointy box CRUD zaplanowane, częściowo zaimplementowane
- ❌ UI kompletnie nierozpoczęte
- ⚠️ QR ważne, ale nie krytyczne dla MVP (można tymczasowo używać ręcznego ID)

### Odpowiedzi Użytkownika

- **Priorytet QR:** Ważna - QR znacznie poprawia UX, ale można tymczasowo używać ręcznego wprowadzania ID
- **Metoda druku:** Oba warianty - chce mieć elastyczność (PDF batch + pojedyncze Ctrl+P)
- **Stan UI:** Jeszcze nie rozpocząłem - skupiam się na backendzie

---

## Rekomendowane Podejście: 3 Fazy

### 🔵 FAZA 1: Backend + CRUD Foundation (Tydzień 1-3)

**Priorytet: WYSOKI | Zależności: Brak | Kiedy: TERAZ**

Skup się na opanowaniu podstaw i uruchomieniu core functionality **BEZ QR**:

#### Backend

- Dokończ implementację box CRUD endpoints:
  - `src/pages/api/boxes.ts` (GET, POST)
  - `src/pages/api/boxes/[id].ts` (GET, PATCH, DELETE)
- Zaimplementuj location endpoints (częściowo gotowe w `.ai_docs/implemented/`)
- Przetestuj RLS policies na Supabase

#### Frontend Basics

- Podstawowy layout z Astro + nawigacja
- Proste formularze CRUD dla boxes i locations (React components)
- Lista boxes z wyszukiwaniem (wykorzystaj `search_vector` z DB)
- **Tymczasowe rozwiązanie bez QR:** Pole tekstowe do ręcznego wpisania `short_id` boxa

#### Dlaczego to zrobić najpierw

1. Nauczysz się Astro Islands (kiedy kod działa server-side vs client-side)
2. Zrozumiesz state management w React 19
3. Przetestujesz komunikację frontend ↔ Supabase
4. **Będziesz mieć działającą aplikację**, którą można rozbudować

**Warunek przejścia do Fazy 2:** Działający CRUD (dodawanie, edycja, usuwanie boxes i locations przez UI) + wyszukiwanie.

---

### 🟢 FAZA 2: QR Backend API (Tydzień 3-4)

**Priorytet: ŚREDNI | Zależności: Faza 1 | Kiedy: PO opanowaniu React basics**

Implementuj backend dla QR **zanim zaczniesz generowanie PDF** (PDF to najtrudniejsza część!):

#### API Endpoints do Zaimplementowania

##### 1. POST /api/qr-codes/batch

**Plik:** `src/pages/api/qr-codes/batch.ts`

**Input:**
```json
{
  "workspace_id": "uuid",
  "quantity": 20
}
```

**Validation:**
- `workspace_id`: Valid UUID, required
- `quantity`: Integer między 1-100

**Logika:**
- INSERT N rekordów do tabeli `qr_codes`
- Trigger `set_qr_short_id` auto-generuje `short_id` w formacie `QR-XXXXXX`
- Status domyślnie: `'generated'`

**Output:**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "short_id": "QR-A1B2C3",
      "status": "generated",
      "workspace_id": "uuid",
      "created_at": "2025-12-25T10:00:00Z"
    }
  ]
}
```

**Przykładowa implementacja:**
```typescript
// src/pages/api/qr-codes/batch.ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { ErrorResponse } from '@/types';

const BatchGenerateSchema = z.object({
  workspace_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100)
});

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  
  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Parse and validate
  const body = await request.json();
  const parseResult = BatchGenerateSchema.safeParse(body);
  
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: parseResult.error.errors[0].message }), 
      { status: 400 }
    );
  }

  const { workspace_id, quantity } = parseResult.data;

  // Generate batch insert
  const records = Array.from({ length: quantity }, () => ({
    workspace_id,
    status: 'generated' as const
  }));

  const { data, error } = await supabase
    .from('qr_codes')
    .insert(records)
    .select('id, short_id, status, workspace_id, created_at');

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to generate QR codes" }), 
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ data }), { status: 201 });
};
```

##### 2. GET /api/qr-codes/:short_id

**Plik:** `src/pages/api/qr-codes/[short_id].ts`

**Input:** `short_id` (np. `QR-A1B2C3`) w URL path

**Logika:**
- Lookup w DB: `SELECT * FROM qr_codes WHERE short_id = :short_id`
- Sprawdź status i `box_id`

**Output:**
```json
{
  "id": "uuid",
  "short_id": "QR-A1B2C3",
  "box_id": "uuid-of-box-if-assigned",
  "status": "assigned",
  "workspace_id": "uuid"
}
```

**Routing logic:**
- Jeśli `box_id === null` → status "available" → Frontend: redirect do New Box Form
- Jeśli `box_id !== null` → status "assigned" → Frontend: redirect do Box Details (`:id`)

**Przykładowa implementacja:**
```typescript
// src/pages/api/qr-codes/[short_id].ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const { short_id } = params;

  if (!short_id) {
    return new Response(JSON.stringify({ error: "Missing short_id" }), { status: 400 });
  }

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Query QR code
  const { data, error } = await supabase
    .from('qr_codes')
    .select('id, short_id, box_id, status, workspace_id')
    .eq('short_id', short_id)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: "QR code not found" }), { status: 404 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
};
```

#### Service Layer

**Plik:** `src/lib/services/qr-code.service.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

export class QrCodeService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async generateBatchQrCodes(workspaceId: string, quantity: number) {
    const records = Array.from({ length: quantity }, () => ({
      workspace_id: workspaceId,
      status: 'generated' as const
    }));

    const { data, error } = await this.supabase
      .from('qr_codes')
      .insert(records)
      .select('id, short_id, status, workspace_id, created_at');

    if (error) throw error;
    return data;
  }

  async resolveQrCode(shortId: string) {
    const { data, error } = await this.supabase
      .from('qr_codes')
      .select('id, short_id, box_id, status, workspace_id')
      .eq('short_id', shortId)
      .single();

    if (error) throw error;
    return data;
  }

  async getAvailableQrCodes(workspaceId: string) {
    const { data, error } = await this.supabase
      .from('qr_codes')
      .select('id, short_id, status, created_at')
      .eq('workspace_id', workspaceId)
      .is('box_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
```

#### Testowanie (bez UI)

**Użyj cURL/Postman:**

```bash
# 1. Generate batch
curl -X POST http://localhost:3000/api/qr-codes/batch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"YOUR_WORKSPACE_UUID","quantity":5}'

# 2. Resolve QR code
curl -X GET http://localhost:3000/api/qr-codes/QR-A1B2C3 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sprawdź w Supabase Dashboard:**
- Table Editor → `qr_codes`
- Weryfikuj czy rekordy się tworza z poprawnymi `short_id`

#### Dlaczego Rozdzielić Backend od PDF

- Backend QR to prosta logika DB (komfortowa dla Ciebie jako DevOps)
- PDF generation to zupełnie inny skillset (CSS dla druku, layouty)
- **Możesz przetestować logikę QR niezależnie od UI/PDF**

---

### 🟡 FAZA 3: UI + PDF Generation (Tydzień 4-5)

**Priorytet: ŚREDNI | Zależności: Faza 1+2 | Kiedy: Gdy API działa**

Teraz dodaj warstwy wizualne i najbardziej złożony feature (PDF):

#### 3A. Prosty Widok QR (Quick Win)

**Strona:** `src/pages/qr/generate.astro`

**Funkcjonalność:**
- Formularz z input `quantity` (1-100)
- Button "Generate QR Codes"
- Po submit: Wywołaj POST /qr-codes/batch
- Wyświetl listę wygenerowanych kodów jako komponenty React

**Biblioteka:** `qrcode.react`

```bash
npm install qrcode.react
npm install @types/qrcode.react --save-dev
```

**Przykład komponentu React:**

```tsx
// src/components/QrCodeDisplay.tsx
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeDisplayProps {
  shortId: string;
  baseUrl: string;
}

export const QrCodeDisplay = ({ shortId, baseUrl }: QrCodeDisplayProps) => {
  const qrUrl = `${baseUrl}/qr/${shortId}`;
  
  return (
    <div className="qr-label">
      <QRCodeSVG 
        value={qrUrl}
        size={128}
        level="M"
        includeMargin={true}
      />
      <p className="text-center text-sm font-mono mt-2">{shortId}</p>
    </div>
  );
};
```

**Strona Astro:**

```astro
---
// src/pages/qr/generate.astro
import Layout from '@/layouts/Layout.astro';
import { QrCodeGrid } from '@/components/QrCodeGrid';
---

<Layout title="Generate QR Codes">
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Generate QR Codes</h1>
    
    <QrCodeGrid client:load />
  </div>

  <style>
    @media print {
      .no-print {
        display: none;
      }
      
      .qr-label {
        page-break-inside: avoid;
      }
    }
  </style>
</Layout>
```

**Drukowanie:** User robi Ctrl+P → CSS `@media print` ukrywa przyciski → proste, działa natychmiast

#### 3B. PDF Batch Generation (Trudniejsze - Opcjonalne dla MVP)

**Opcja A (Proste): jsPDF + html2canvas**

```bash
npm install jspdf html2canvas
```

Renderuj siatkę QR kodów w hidden `<div>` → Konwertuj do PDF client-side

**Pros:** Szybkie, bez backend logic  
**Cons:** Jakość druku może być średnia

**Opcja B (Lepsze): Supabase Edge Function + Puppeteer**

Edge Function renderuje HTML template z kodami → Puppeteer eksportuje do PDF server-side

**Pros:** Perfekcyjna jakość, kontrola nad layoutem  
**Cons:** Wymaga deployment Edge Function, więcej konfiguracji

**Rekomendacja dla MVP:** Zacznij od **Opcji A (jsPDF)**. Jeśli jakość nie zadowala, przejdź na Opcję B później.

**Przykład z jsPDF:**

```typescript
// src/lib/pdf-generator.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateQrPdf(containerElementId: string) {
  const element = document.getElementById(containerElementId);
  if (!element) throw new Error('Container not found');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save('qr-codes.pdf');
}
```

**HTML Template dla siatki:**

```html
<!-- Grid 4x5 = 20 kodów na stronie A4 -->
<div id="qr-grid" class="grid grid-cols-4 gap-4 p-4">
  <!-- Każda etykieta: 48mm x 25mm -->
</div>
```

#### 3C. Integracja Skanowania

**Strona:** `src/pages/qr/[short_id].astro`

**Dynamic route:** Gdy user zeskanuje QR kod aparatem telefonu, otwiera:
```
https://yourdomain.com/qr/QR-A1B2C3
```

**Server-side Logic (Astro):**

```astro
---
// src/pages/qr/[short_id].astro
const { short_id } = Astro.params;

// Wywołaj API endpoint
const response = await fetch(
  `${Astro.url.origin}/api/qr-codes/${short_id}`,
  {
    headers: {
      Authorization: Astro.request.headers.get('Authorization') || ''
    }
  }
);

if (!response.ok) {
  return Astro.redirect('/404');
}

const qrData = await response.json();

// Smart routing
if (!qrData.box_id) {
  // QR code available -> New Box Form
  return Astro.redirect(`/boxes/new?qr_code_id=${qrData.id}`);
} else {
  // QR code assigned -> Box Details
  return Astro.redirect(`/boxes/${qrData.box_id}`);
}
---
```

**Formularz New Box (pre-filled):**

```astro
---
// src/pages/boxes/new.astro
const qrCodeId = Astro.url.searchParams.get('qr_code_id');
---

<Layout title="New Box">
  <NewBoxForm qrCodeId={qrCodeId} client:load />
</Layout>
```

#### Walidacja Fazy 3

- [ ] Wygeneruj 5 kodów przez UI
- [ ] Wydrukuj je (Ctrl+P lub PDF)
- [ ] Naklej na pudełka (lub kartki testowe)
- [ ] Zeskanuj telefonem → sprawdź czy routing działa
- [ ] Pusty kod → formularz nowego boxa
- [ ] Przypisany kod → szczegóły boxa

---

## 🗓️ Harmonogram Sugerowany (6 Tygodni)

| Tydzień | Faza | Kluczowe Deliverables |
|---------|------|----------------------|
| 1-2 | Faza 1 | CRUD boxes + locations, podstawowy UI |
| 3 | Faza 1 | Wyszukiwanie, RWD mobile |
| 3-4 | Faza 2 | QR API endpoints + service layer |
| 4-5 | Faza 3A | Prosty widok QR + druk Ctrl+P |
| 5 | Faza 3B | PDF generation (jeśli starczy czasu) |
| 6 | Faza 3C | Integracja skanowania + testy end-to-end |

---

## ⚠️ Krytyczne Pytania i Ryzyka

### Pytanie 1: Czy PDF jest KONIECZNE w MVP?

**Kontekst:** Generowanie PDF to najbardziej czasochłonna część (walka z CSS print media, marginesami, page breaks).

**Alternatywa:** W MVP użyj prostego widoku grid z kodami + `@media print` w CSS. User robi Ctrl+P → ustawia "Multiple pages per sheet" w przeglądarce.

**Decyzja:** Jeśli deadline jest ciasny, **pomiń PDF batch** w MVP. To feature który można dodać w wersji 1.1.

### Pytanie 2: Czy testować z prawdziwym drukowaniem?

**Tak.** QR kody muszą być skanowalne. Nie zakładaj, że ekranowy QR będzie działał po wydrukowaniu. 

**Przetestuj wcześnie** (Faza 3A) wydrukując pojedynczy kod na papierze i skanując go aparatem telefonu.

**Potencjalne problemy:**
- Zbyt mały rozmiar QR → nieskanowalny
- Zła jakość druku → rozmyte krawędzie
- Błędny URL w QR → redirect nie działa

### Pytanie 3: Jakie URL wpisać w QR?

**Development:** 
```
http://192.168.1.X:3000/qr/QR-ABC123
```
(twój lokalny IP w sieci WiFi - potrzebne do testowania na telefonie)

**Production:**
```
https://yourdomain.com/qr/QR-ABC123
```

**Ważne:** Podczas generowania kodów w Fazie 2, **użyj zmiennej środowiskowej** dla base URL:

```typescript
// src/config/app.ts
export const APP_CONFIG = {
  baseUrl: import.meta.env.PUBLIC_APP_URL || 'http://localhost:3000'
};

// W komponencie
import { APP_CONFIG } from '@/config/app';
const qrUrl = `${APP_CONFIG.baseUrl}/qr/${shortId}`;
```

**.env:**
```bash
PUBLIC_APP_URL=http://192.168.1.100:3000  # development
# PUBLIC_APP_URL=https://yourdomain.com  # production
```

---

## 📚 Biblioteki Potrzebne

### Zainstaluj Teraz (Faza 1)

```bash
npm install qrcode.react
npm install @types/qrcode.react --save-dev
```

### Zainstaluj Później (Faza 3B, jeśli robisz PDF)

```bash
npm install jspdf html2canvas
```

### Opcjonalne (dla advanced PDF generation)

```bash
npm install pdf-lib  # jeśli potrzebujesz bardziej precyzyjnej kontroli
```

---

## 🎯 Odpowiedź na Twoje Pytanie

**"Czy QR przed pracami nad UI czy w trakcie?"**

### Odpowiedź: **W TRAKCIE, ale w przemyślanej kolejności.**

1. **NIE rób QR na samym początku** - najpierw opanuj React/Astro przez prostszy CRUD
2. **Backend QR zrób równolegle** z budową UI dla boxes (Tydzień 3-4) - to prosta logika DB
3. **UI dla QR i PDF zostaw na koniec** (Tydzień 4-5) - to najbardziej czasochłonne

### Kluczowa Insight

QR składa się z 3 niezależnych części:

1. **DB logic** (już gotowe) ✅
   - Tabela `qr_codes` z triggerami
   - Enum `qr_status`
   - Relacje z `boxes`

2. **API endpoints** (proste, 2-3h pracy) → Faza 2
   - POST /qr-codes/batch
   - GET /qr-codes/:short_id
   - Service layer

3. **UI + PDF generation** (trudne, 1-2 tygodnie dla osoby uczącej się) → Faza 3
   - Komponenty React do wyświetlania QR
   - Generator PDF/print CSS
   - Dynamic routing dla skanów

Rozdzielając te części, **minimalizujesz ryzyko** i masz checkpoint'y do testowania.

---

## 💡 Dodatkowe Rekomendacje

### 1. Użyj AI do Generacji PDF Template

Gdy dojdziesz do Fazy 3B, zapytaj AI (lub użyj tego chatu):

> "Wygeneruj HTML template dla arkusza A4 z siatką 4x5 etykiet QR. Każda etykieta: 48mm x 25mm, QR code + short_id poniżej. CSS z @media print."

To zaoszczędzi Ci godziny walki z marginesami.

### 2. Nie Implementuj "status: printed"

W bazie masz enum `qr_status: generated | printed | assigned`. 

Status "printed" jest trudny do śledzenia (skąd wiesz czy user wydrukował?). W MVP zostaw tylko:
- `generated` - nowy kod
- `assigned` - przypisany do boxa

Możesz dodać `printed` później jeśli naprawdę potrzebujesz.

### 3. Przygotuj Dane Testowe Wcześnie

W Fazie 1 użyj Supabase SQL Editor żeby wstawić 10-20 przykładowych boxes i locations:

```sql
-- Example test data
INSERT INTO public.boxes (workspace_id, name, description, tags, location_id)
VALUES 
  ('YOUR_WORKSPACE_UUID', 'Winter Clothes', 'Jackets and scarves', ARRAY['winter', 'clothes'], NULL),
  ('YOUR_WORKSPACE_UUID', 'Christmas Decorations', 'Lights and ornaments', ARRAY['christmas', 'decor'], NULL);
```

To przyspieszy development UI.

### 4. Mobile-First dla Skanowania

Strona `/qr/[short_id]` musi być responsywna - to główny use case (user w piwnicy z telefonem). 

**Testuj na prawdziwym urządzeniu mobilnym**, nie tylko w Chrome DevTools:

```css
/* Mobile-optimized form */
@media (max-width: 768px) {
  .box-form {
    font-size: 16px; /* Zapobiega zoom na iOS */
  }
  
  .box-form input,
  .box-form textarea {
    font-size: 16px;
  }
  
  .submit-button {
    min-height: 44px; /* Thumb-friendly */
  }
}
```

### 5. Debugowanie QR Skanowania

Gdy testujesz skanowanie na telefonie, możesz mieć problem z HTTPS. Rozwiązania:

**Opcja A: ngrok (proste)**
```bash
npm run dev  # na localhost:3000
ngrok http 3000  # w drugim terminalu
```
Użyj URL od ngrok (https://xxx.ngrok.io) w QR kodach.

**Opcja B: mkcert (lokalne SSL)**
```bash
brew install mkcert
mkcert -install
mkcert localhost 192.168.1.X
```
Skonfiguruj Astro do użycia certyfikatu.

### 6. Error Handling dla Skanowania

W produkcji będziesz mieć przypadki gdy:
- QR kod nie istnieje (usunięty z DB)
- QR kod z innego workspace
- QR kod zniszczony (błędny scan)

Przygotuj stronę `/qr/error`:

```astro
---
// src/pages/qr/error.astro
const message = Astro.url.searchParams.get('message') || 'Invalid QR code';
---

<Layout title="QR Error">
  <div class="error-container">
    <h1>⚠️ QR Code Error</h1>
    <p>{message}</p>
    <a href="/boxes/new">Create Box Manually</a>
  </div>
</Layout>
```

---

## 🚦 Punkty Kontrolne (Checklist)

### Faza 1 Complete Gdy:

- [ ] Mogę dodać box przez formularz w UI
- [ ] Mogę edytować box
- [ ] Mogę usunąć box
- [ ] Mogę dodać location (hierarchicznie)
- [ ] Wyszukiwarka zwraca wyniki po wpisaniu nazwy
- [ ] Działa na telefonie (RWD)
- [ ] RLS działa (nie widzę boxów z innych workspace)

### Faza 2 Complete Gdy:

- [ ] POST /qr-codes/batch tworzy rekordy w DB (sprawdzone przez cURL)
- [ ] GET /qr-codes/:short_id zwraca poprawny status
- [ ] Service layer ma funkcje `generateBatch` i `resolveQrCode`
- [ ] Endpointy zwracają poprawne kody błędów (400, 401, 404, 500)
- [ ] RLS dla `qr_codes` działa (workspace isolation)

### Faza 3 Complete Gdy:

- [ ] Widzę wygenerowane kody QR na ekranie
- [ ] Mogę wydrukować kody (Ctrl+P) i layout wygląda OK
- [ ] Wydrukowany kod jest skanowalny aparatem telefonu
- [ ] Skan pustego kodu otwiera formularz nowego boxa
- [ ] Skan przypisanego kodu otwiera szczegóły boxa
- [ ] Tworzenie boxa z QR kodem zmienia status QR na 'assigned'
- [ ] Usunięcie boxa resetuje QR kod do 'generated' (trigger działa)

---

## 📊 Diagram Przepływu (Flow)

### User Journey: Od Generowania do Skanowania

```
1. USER GENERATES QR CODES
   ↓
   POST /api/qr-codes/batch
   ↓
   DB: INSERT 20 records with status='generated'
   ↓
   UI: Display grid of QR codes
   ↓
   USER: Ctrl+P → Print

2. USER STICKS QR ON BOX
   (Physical action, no system interaction)

3. USER SCANS QR WITH PHONE CAMERA
   ↓
   Camera app opens: https://domain.com/qr/QR-A1B2C3
   ↓
   Browser loads: /qr/[short_id].astro
   ↓
   Server-side: GET /api/qr-codes/QR-A1B2C3
   ↓
   IF box_id IS NULL:
     → Redirect to /boxes/new?qr_code_id=xxx
     → User fills form
     → POST /api/boxes (with qr_code_id)
     → DB trigger updates qr_codes.status = 'assigned'
   
   IF box_id EXISTS:
     → Redirect to /boxes/{box_id}
     → Display box details
```

---

## 🔄 Lifecycle QR Kodu

```
[GENERATED] → [ASSIGNED] → [GENERATED]
     ↓              ↓              ↑
  Created      Linked to      Box deleted
  via batch     a box        (trigger resets)
```

**Stany:**
1. **generated**: Nowy kod, nieprzypisany
2. **assigned**: Przypisany do konkretnego boxa
3. ~~**printed**~~: Opcjonalnie (pomiń w MVP)

**Transitions:**
- `generated` → `assigned`: Gdy user tworzy box z tym QR
- `assigned` → `generated`: Gdy box jest usunięty (trigger `on_box_deleted`)

---

## 📞 Kiedy Wrócić Po Pomoc

Wróć z pytaniami gdy:

1. **Faza 1:** Utknąłeś z Astro Islands (nie wiesz czy komponent ma być `.astro` czy `.tsx`)
2. **Faza 2:** API endpoint nie działa mimo prawidłowego kodu (RLS issue?)
3. **Faza 3A:** QR kod się renderuje ale jest nieskanowalny (size? quality?)
4. **Faza 3B:** PDF wychodzi zniekształcony (margins? scaling?)
5. **Deployment:** Problem z HTTPS na telefonie (ngrok? mkcert?)

---

## 📝 Podsumowanie TL;DR

### Kiedy Wdrożyć QR?

- ✅ **Backend QR (Faza 2):** Tydzień 3-4, równolegle z budową UI
- ✅ **UI + PDF (Faza 3):** Tydzień 4-5, jako ostatni duży feature
- ❌ **NIE zaczynaj od QR** - najpierw CRUD i React basics

### Dlaczego To Podejście?

1. **Stopniowanie trudności**: CRUD → API → UI → PDF (od prostego do złożonego)
2. **Punkty kontrolne**: Każda faza daje działającą funkcjonalność
3. **Minimize risk**: Możesz pominąć PDF jeśli zabraknie czasu (Ctrl+P wystarczy)
4. **Learning curve**: Opanujesz React/Astro na prostszych feature'ach

### Co Jeśli Zabraknie Czasu?

**Minimum Viable QR (dla zaliczenia):**
- Backend API (Faza 2): 100% konieczne
- UI display + Ctrl+P (Faza 3A): 100% konieczne
- PDF batch (Faza 3B): **Opcjonalne** - można pominąć
- Skanowanie (Faza 3C): 100% konieczne

**Escape hatch:** Jeśli naprawdę zabraknie czasu, możesz w MVP:
- Generować kody pojedynczo (nie batch)
- Drukować tylko przez Ctrl+P (nie PDF)
- To nadal spełnia core functionality!

---

**Powodzenia w implementacji! 🚀**


