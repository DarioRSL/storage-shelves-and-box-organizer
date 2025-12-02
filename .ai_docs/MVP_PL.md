# Dokument Wymagań Produktowych (PRD) - Storage & Box Organizer

**Wersja:** 1.0 (MVP)  
**Data:** 30.11.2025  
**Status:** Zatwierdzony do realizacji

## 1. Wstęp

### 1.1 Opis Problemu

Gospodarstwa domowe i małe firmy borykają się z problemem zarządzania rzeczami przechowywanymi w pudełkach, piwnicach, garażach i komórkach lokatorskich. Użytkownicy często zapominają, co znajduje się w konkretnym pudle bez jego otwierania, co prowadzi do tracenia czasu na poszukiwania ("gdzie są bombki?", "w którym kartonie są dokumenty z 2020?").

### 1.2 Cel Produktu

Stworzenie aplikacji webowej (PWA), która umożliwia katalogowanie zawartości pudeł i przypisywanie im lokalizacji przy użyciu kodów QR. System pozwala na szybkie odnalezienie przedmiotu poprzez wyszukiwarkę lub zeskanowanie kodu na pudle, aby zobaczyć jego zawartość bez fizycznego otwierania.

---

## 2. Grupa Docelowa i Persony

### 2.1 Główna Persona: "Organizator Domowy"

- **Cel:** Chce uporządkować piwnicę/strych i szybko znajdować rzeczy sezonowe.
- **Ból:** Musi otwierać 10 pudeł, żeby znaleźć jedno konkretne.
- **Urządzenia:** Smartfon (w trakcie porządkowania), Laptop (do planowania).

### 2.2 Persona Wtórna: "Mała Firma / Magazynier"

- **Cel:** Ewidencja archiwum dokumentów lub rzadko używanego sprzętu.
- **Wymagania:** Możliwość współdzielenia dostępu (przyszłościowo).

---

## 3. Zakres MVP (Minimum Viable Product)

### 3.1 Funkcjonalności Kluczowe

1.  **System Kont i Organizacji (Workspace):**
    - Rejestracja/Logowanie (Google Auth, Apple Auth, Login/Hasło - bez odzyskiwania hasła w MVP).
    - Automatyczne tworzenie prywatnego Workspace dla każdego użytkownika.
2.  **Zarządzanie Strukturą Przechowywania:**
    - Definiowanie hierarchicznych lokalizacji (np. Piwnica > Regał A > Półka 1).
    - Limit zagłębienia: do 5 poziomów.
    - Widoczność pełnej ścieżki (breadcrumbs) przy przeglądaniu.
3.  **Zarządzanie Pudełkami (Boxy):**
    - Tworzenie pudełka z unikalnym ID.
    - Edycja nazwy, opisu (limit ~10000 znaków) i tagów.
    - Przypisywanie pudełka do lokalizacji (lub status "Nieprzypisane").
    - Obsługa "Soft Delete" - usunięcie lokalizacji przenosi pudełka do "Nieprzypisane".
4.  **System Kodów QR:**
    - Generowanie kodów QR w aplikacji (pojedynczo lub seryjnie do pliku PDF/obrazu do druku).
    - Struktura kodu: URL kierujący do konkretnego zasobu (np. `app.domain.com/box/{uuid}`).
    - Etykieta zawiera: QR Kod, Skrócony identyfikator (np. `X7K-9P2`) czytelny dla człowieka, miejsce na własny opis.
    - Obsługa workflow: "Drukuj puste kody -> Naklej -> Zeskanuj -> Przypisz zawartość".
5.  **Wyszukiwanie i Skanowanie:**
    - Skanowanie przy użyciu natywnej aplikacji aparatu w telefonie (przekierowanie do przeglądarki).
    - Wyszukiwarka "Live" (filtrowanie w czasie rzeczywistym): po nazwie, opisie, tagach, lokalizacji.

### 3.2 Wykluczenia z MVP (Out of Scope)

- Tryb Offline (wymaga dostępu do internetu).
- Dodawanie zdjęć zawartości do pudełek.
- Optymalizacja zdjęć (kompresja przed uploadem).
- Dedykowana aplikacja mobilna (tylko Web/PWA).
- Wysyłka e-maili (weryfikacja, reset hasła) - "zgubione hasło = utrata konta" w przypadku logowania hasłem (chyba że OAuth).
- Zaawansowane uprawnienia i współdzielenie (tylko podstawa bazy danych pod przyszłe wdrożenie).
- Płatności i subskrypcje.

---

## 4. Wymagania Techniczne

### 4.1 Stack Technologiczny

- **Frontend:** Astro 5, React 19, Tailwind CSS 4, Shadcn/ui.
- **Backend:** Astro (SSR API routes) lub Supabase Edge Functions.
- **Baza Danych / Auth:** Supabase (PostgreSQL).
- **Hosting:** Vercel (Rekomendowany) lub VPS.

### 4.2 Wymagania Niefunkcjonalne

- **RWD:** Interfejs "Mobile-First" dla widoków skanowania/edycji; Desktop dla zarządzania.
- **Język:** Kod i DB w języku angielskim. Interfejs użytkownika: Polski.
- **Wygląd:** Obsługa Trybu Ciemnego (Dark Mode).

### 4.3 Model Danych (Uproszczony)

- `profiles` (id, user_id, email, ...)
- `workspaces` (id, owner_id, name)
- `locations` (id, workspace_id, parent_id, name, type)
- `boxes` (id, workspace_id, location_id, name, description, tags, photo_url, qr_uuid, short_id)

---

## 5. User Stories (Przykłady)

1.  **US-01 Generowanie etykiet:** _Jako użytkownik, chcę wygenerować arkusz z 20 pustymi kodami QR, aby wydrukować je i zabrać do piwnicy przed rozpoczęciem porządków._
2.  **US-02 Dodawanie pudełka:** _Jako użytkownik, po zeskanowaniu pustego kodu QR telefonem, chcę zostać automatycznie przeniesiony do formularza "Nowe Pudełko" z uzupełnionym ID, aby szybko dodać opis i zdjęcie._
3.  **US-03 Szukanie przedmiotu:** _Jako użytkownik, chcę wpisać "lampki choinkowe" w wyszukiwarkę i natychmiast zobaczyć, w którym pudełku i na której półce się znajdują._
4.  **US-04 Przenoszenie:** _Jako użytkownik, chcę zmienić lokalizację pudełka w systemie, wybierając nową półkę z listy, gdy fizycznie je przenoszę._

---

## 6. Harmonogram i Kamienie Milowe

1.  **Setup & Auth:** Konfiguracja repozytorium, Supabase, Vercel, Logowanie.
2.  **Core Logic:** CRUD dla Lokalizacji i Pudełek.
3.  **QR System:** Generowanie PDF, obsługa linków z kodów QR.
4.  **UI/UX Polish:** Wyszukiwarka, RWD, Dark Mode, Upload zdjęć.
5.  **Testing & Launch:** Testy na urządzeniach mobilnych, wdrożenie produkcyjne.
