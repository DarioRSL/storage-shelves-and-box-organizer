# Dokument wymagań produktu (PRD) - Storage & Box Organizer

## 0. MVP vs Post-MVP Roadmap

**MVP Release (Current Focus):**
- Email/Password authentication (US-001)
- Workspace and location management (US-003, US-004)
- Box management - create, read, update, delete (US-006, US-007, US-008, US-009)
- QR code generation in minimal form for desktop (US-005)
- Live search functionality (US-010)
- Desktop-first UI design

**Post-MVP Releases:**
- Account deletion with RODO compliance (US-002)
- Export to CSV (US-011)
- OAuth (Google, Apple Auth)
- Dark mode (Nice-to-have)
- Full mobile optimization
- Password recovery via email

---

## 1. Przegląd produktu

Storage & Box Organizer to aplikacja internetowa typu Progressive Web App (PWA), zaprojektowana, aby pomóc użytkownikom domowym i małym firmom w zarządzaniu przedmiotami przechowywanymi w pudełkach. Aplikacja rozwiązuje problem braku wiedzy o zawartości pudeł bez ich fizycznego otwierania. Kluczową funkcjonalnością jest system kodów QR: użytkownik drukuje etykiety, nakleja je na pudełka, a następnie skanuje telefonem, aby cyfrowo przypisać zawartość (opis, tagi) i lokalizację. System umożliwia szybkie wyszukiwanie przedmiotów oraz zarządzanie strukturą przechowywania (pokoje, regały, półki).

## 2. Problem użytkownika

Użytkownicy przechowujący rzeczy sezonowe, dokumenty lub rzadko używane przedmioty w piwnicach, garażach i na strychach, często zapominają, co znajduje się w konkretnym kartonie. Prowadzi to do frustrujących poszukiwań, konieczności otwierania wielu pudeł, aby znaleźć jedną rzecz, oraz ogólnego bałaganu. Tradycyjne metody (opisywanie markerem) są mało elastyczne – zmiana zawartości wymaga skreślania lub naklejania nowej taśmy, a znalezienie konkretnego przedmiotu wymaga fizycznej obecności przy pudełkach i czytania napisów.

## 3. Wymagania funkcjonalne

### 3.1 Uwierzytelnianie i Zarządzanie Kontem

**MVP:**
- Rejestracja i logowanie za pomocą standardowego loginu i hasła.
- Brak mechanizmu odzyskiwania hasła drogą mailową w wersji MVP (użytkownik musi pamiętać dane).
- Automatyczne tworzenie prywatnego Workspace po rejestracji.

**Post-MVP:**
- Google Auth i Apple Auth (OAuth)
- Odzyskiwanie hasła drogą mailową
- Możliwość trwałego usunięcia konta wraz ze wszystkimi danymi (zgodność z RODO)

### 3.2 Zarządzanie Strukturą (Lokalizacje)

- Tworzenie hierarchicznej struktury lokalizacji (np. Garaż > Regał Metalowy > Półka Górna).
- Maksymalne zagnieżdżenie do 5 poziomów.
- Edycja nazw lokalizacji.
- Usuwanie lokalizacji z mechanizmem Soft Delete (pudełka w usuwanej lokalizacji trafiają do puli Nieprzypisane, nie są usuwane).

### 3.3 Zarządzanie Pudełkami (Boxy)

- Tworzenie cyfrowego profilu pudełka z unikalnym identyfikatorem (UUID).
- Dodawanie nazwy, opisu (do 10 000 znaków) oraz tagów ułatwiających wyszukiwanie.
- Przypisywanie pudełka do konkretnej lokalizacji w hierarchii.
- Możliwość zmiany lokalizacji pudełka (przenoszenie).
- Możliwość usunięcia pudełka.

### 3.4 System Kodów QR

**MVP:**
- Generowanie arkuszy z kodami QR do druku (PDF) w minimalnej wersji - wymagane do pracy na desktop.
- Obsługa generowania seryjnego (Batch Generate), np. 20 pustych kodów na raz.
- Każdy kod QR zawiera unikalny URL prowadzący do zasobu w aplikacji.
- Obsługa procesu: Skanowanie pustego kodu QR (przekierowanie do tworzenia nowego pudełka) -> Przypisanie danych.
- Etykiety do druku zawierają kod QR oraz identyfikator tekstowy dla łatwej identyfikacji wzrokowej.

**PDF Generation (Minimal Implementation):**
- Layout: Tabela kodów QR w rozmiarze odpowiednim do druku A4
- Format etykiety: QR code + tekst ID poniżej
- Funkcjonalność: Pozwala na drukowanie bezpośrednio z przeglądarki (window.print)

### 3.5 Wyszukiwanie i Przeglądanie

- Wyszukiwarka działająca w czasie rzeczywistym (Live Search).
- Przeszukiwanie po nazwie pudełka, opisie, tagach i nazwie lokalizacji.
- Wyświetlanie pełnej ścieżki lokalizacji (breadcrumbs) przy wynikach wyszukiwania.
- Obsługa skanowania kodów QR za pomocą natywnej aplikacji aparatu w telefonie (brak wbudowanego skanera w aplikacji).

### 3.6 Eksport Danych

**Post-MVP:**
- Możliwość pobrania listy wszystkich pudeł i ich zawartości do pliku CSV/Excel.

## 4. Granice produktu

### W zakresie (In Scope) - MVP

- Aplikacja Webowa dostępna przez przeglądarkę.
- Wymagane połączenie z internetem do działania.
- Interfejs użytkownika w języku polskim.
- **Desktop-first design** (mobilny interfejs to post-MVP).
- Obsługa skanowania QR kodów na wszystkich urządzeniach (desktop i mobile).

### Post-MVP (Later releases)

- Obsługa trybu ciemnego (Dark Mode) - nice-to-have
- Pełna responsywność (Mobile-optimized UI dla operacji na pudełkach)
- Eksport danych do CSV/Excel
- Google Auth i Apple Auth (OAuth)
- Odzyskiwanie hasła drogą mailową
- Usunięcie konta (zgodność z RODO)

### Poza zakresem (Out of Scope)

- Tryb offline (praca bez internetu).
- Dodawanie zdjęć zawartości do pudełek.
- Optymalizacja zdjęć (kompresja przed uploadem).
- Natywna aplikacja mobilna (iOS/Android) do pobrania ze sklepu.
- Wysyłka wiadomości e-mail (weryfikacja konta, reset hasła).
- Zaawansowane zarządzanie uprawnieniami i współdzielenie kont (tylko przygotowanie bazy danych).
- Płatności i plany subskrypcyjne.
- Historia zmian (logi aktywności).

## 5. Historyjki użytkowników

### Uwierzytelnianie i Konto

ID: US-001
Tytuł: Rejestracja i logowanie (Email/Hasło)
Opis: Jako nowy użytkownik chcę założyć konto przy użyciu adresu e-mail i hasła, aby uzyskać dostęp do aplikacji.
Kryteria akceptacji:

1. Dostępna jest strona rejestracji z polami: email, hasło, potwierdzenie hasła.
2. Po wypełnieniu i zatwierdzeniu, system tworzy nowe konto i domyślny Workspace.
3. Dostępna jest strona logowania z polami: email, hasło.
4. Po zalogowaniu użytkownik zostaje przekierowany do głównego widoku aplikacji (/app).
5. System waliduje siłę hasła (minimum 8 znaków).

**Post-MVP Enhancement:**
- Dodać OAuth (Google, Apple)

ID: US-002-POST-MVP
Tytuł: Usunięcie konta (Post-MVP)
Opis: Jako użytkownik dbający o prywatność chcę mieć możliwość trwałego usunięcia mojego konta i wszystkich danych.
Status: **Post-MVP - nie wdrażać w MVP**
Kryteria akceptacji:

1. W ustawieniach dostępna jest opcja Usuń konto.
2. System wymaga potwierdzenia decyzji (np. wpisanie hasła lub potwierdzenie tekstowe).
3. Po potwierdzeniu wszystkie dane użytkownika (profil, workspace, lokalizacje, pudełka) są trwale usuwane z bazy danych.
4. Użytkownik zostaje wylogowany.

### Zarządzanie Strukturą

ID: US-003
Tytuł: Dodawanie lokalizacji
Opis: Jako użytkownik chcę zdefiniować strukturę mojego domu (np. Piwnica, Garaż), aby móc precyzyjnie przypisywać pudełka.
Kryteria akceptacji:

1. Użytkownik może dodać lokalizację główną (np. Piwnica).
2. Użytkownik może dodać pod-lokalizację (np. Regał A w Piwnicy).
3. System blokuje dodanie poziomu głębszego niż 5.
4. Nowa lokalizacja pojawia się na liście/drzewie lokalizacji.

ID: US-004
Tytuł: Usuwanie lokalizacji (Soft Delete)
Opis: Jako użytkownik chcę usunąć stary regał z systemu, ale nie chcę stracić informacji o pudełkach, które na nim stały.
Kryteria akceptacji:

1. Użytkownik wybiera opcję usunięcia lokalizacji.
2. System sprawdza, czy w lokalizacji znajdują się pudełka.
3. Jeśli tak, system informuje, że pudełka zostaną przeniesione do statusu Nieprzypisane.
4. Lokalizacja znika z drzewa struktury.
5. Pudełka są dostępne na liście jako nieprzypisane do żadnej lokalizacji.

### Kody QR

ID: US-005
Tytuł: Generowanie arkusza kodów QR
Opis: Jako użytkownik chcę wygenerować plik PDF z 20 pustymi kodami QR, aby móc je wydrukować na drukarce domowej.
Kryteria akceptacji:

1. Użytkownik klika Generuj kody.
2. Użytkownik podaje liczbę kodów (np. 20).
3. System generuje plik PDF w formacie A4.
4. Plik zawiera siatkę etykiet, każda z unikalnym kodem QR i czytelnym skróconym ID (np. A1B-2C3).
5. Kody są zapisywane w bazie jako wstępnie wygenerowane, ale nieaktywne/puste.

### Obsługa Pudełek

ID: US-006
Tytuł: Dodawanie pudełka przez skanowanie (Empty State)
Opis: Jako użytkownik chcę zeskanować świeżo naklejoną etykietę, aby natychmiast dodać zawartość pudełka do systemu.
Kryteria akceptacji:

1. Użytkownik skanuje kod QR natywnym aparatem.
2. Telefon otwiera link w przeglądarce.
3. Jeśli kod jest wolny (nieprzypisany), system otwiera formularz Nowe Pudełko.
4. Pole ID jest automatycznie wypełnione danymi z kodu.
5. Użytkownik może uzupełnić resztę danych i zapisać.

ID: US-007
Tytuł: Dodawanie opisu i tagów
Opis: Jako użytkownik chcę dodać szczegółowy opis zawartości pudełka i tagi, aby wiedzieć co jest w środku i móc łatwo wyszukać pudełko.
Kryteria akceptacji:

1. W formularzu pudełka dostępne są pola: nazwa, opis (do 10 000 znaków) i tagi.
2. Użytkownik może wpisać opis zawartości pudełka.
3. Użytkownik może dodać wiele tagów oddzielonych przecinkami lub wybierając z listy.
4. Po zapisaniu opis i tagi są widoczne w szczegółach pudełka.
5. Tagi są wykorzystywane w wyszukiwarce.

ID: US-008
Tytuł: Przeglądanie szczegółów po skanowaniu
Opis: Jako użytkownik chcę zeskanować kod na starym pudełku, aby zobaczyć co jest w środku bez otwierania go.
Kryteria akceptacji:

1. Użytkownik skanuje kod QR przypisanego pudełka.
2. System otwiera stronę szczegółów tego konkretnego pudełka.
3. Widoczne są: nazwa, opis, tagi oraz pełna ścieżka lokalizacji.
4. Widoczny jest przycisk edycji.

ID: US-009
Tytuł: Przenoszenie pudełka
Opis: Jako użytkownik chcę zaktualizować lokalizację pudełka w systemie po tym, jak fizycznie przeniosłem je do innego pomieszczenia.
Kryteria akceptacji:

1. W edycji pudełka dostępna jest lista rozwijana lub drzewo lokalizacji.
2. Użytkownik wybiera nową lokalizację docelową.
3. Po zapisaniu, ścieżka lokalizacji pudełka jest zaktualizowana.

### Wyszukiwanie

ID: US-010
Tytuł: Wyszukiwanie Live
Opis: Jako użytkownik chcę wpisać fragment nazwy przedmiotu i natychmiast zobaczyć wyniki, aby szybko znaleźć poszukiwaną rzecz.
Kryteria akceptacji:

1. Pasek wyszukiwania jest dostępny w głównym widoku.
2. Wyniki pojawiają się dynamicznie w trakcie wpisywania (po min. 3 znakach).
3. Wyszukiwanie obejmuje nazwę, opis, tagi i nazwy lokalizacji.
4. Wynik wyszukiwania pokazuje nazwę pudełka i jego lokalizację.
5. Kliknięcie wyniku przenosi do szczegółów pudełka.

### Eksport

ID: US-011-POST-MVP
Tytuł: Eksport danych (Post-MVP)
Opis: Jako użytkownik chcę pobrać listę moich rzeczy, aby mieć kopię zapasową lub listę inwentarzową.
Status: **Post-MVP - nie wdrażać w MVP**
Kryteria akceptacji:

1. W ustawieniach dostępna opcja Eksportuj dane.
2. System generuje plik CSV w formacie UTF-8 z BOM dla kompatybilności Excel.
3. Plik zawiera kolumny: box_name, description, tags, location_path.
4. Każda linia zawiera jedno pudełko.
5. Tagi są rozdzielone przecinkami, lokalizacja to pełna ścieżka (np. "Piwnica > Regał A > Półka Górna").

## 6. Metryki sukcesu

1.  **Czas dodawania pudełka:** Średni czas od zeskanowania pustego kodu do zapisania pudełka wynosi poniżej 45 sekund.
2.  **Skuteczność wyszukiwania:** 90% wyszukiwań kończy się kliknięciem w wynik (znalezieniem pudełka) w ciągu 10 sekund.
3.  **Kompletność danych:** 80% utworzonych pudełek posiada wypełniony opis lub tagi (wskaźnik użyteczności systemu katalogowania).
4.  **Bezawaryjność skanowania:** Poniżej 1% zgłoszeń błędów dotyczących nierozpoznawania kodów QR lub błędnych przekierowań.
5.  **Retencja użytkowników:** 30% użytkowników, którzy dodali pierwsze pudełko, dodaje kolejne w ciągu 7 dni.
