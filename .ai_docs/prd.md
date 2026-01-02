# Dokument wymagań produktu (PRD) - Storage & Box Organizer

**Last Updated:** January 2, 2026
**MVP Status:** ✅ **100% Complete** (24/24 core user stories implemented)
**Post-MVP Features:** 📋 10 stories deferred to future releases

## 0. MVP vs Post-MVP Roadmap

### Implementation Status Summary

| Category | Total Stories | Completed | Partial | Deferred | Completion |
|----------|--------------|-----------|---------|----------|------------|
| **MVP Stories** | 24 | 24 | 0 | 0 | ✅ 100% |
| **Post-MVP** | 11 | 1 | 0 | 10 | 📋 9% |
| **TOTAL** | 35 | 25 | 0 | 10 | ✅ 71% |

**MVP Release (Current Status: COMPLETE):**
- Email/Password authentication (US-001, US-018, US-019)
- Workspace and location management (US-003, US-004, US-012)
- Box management - create, read, update, delete (US-006, US-007, US-008, US-009, US-017, US-020, US-028)
- QR code generation in minimal form for desktop (US-005, US-025, US-026)
- Live search functionality (US-010, US-013, US-014)
- Box filtering by location (US-016, US-015)
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
**Status:** ✅ **COMPLETED** (2025-12-12)
**Implementation:** `src/pages/auth/index.astro`, `AuthLayout.tsx`, `POST /api/auth/session`
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

ID: US-012
Tytuł: Edycja nazwy lokalizacji
Opis: Jako użytkownik chcę zmienić nazwę istniejącej lokalizacji (np. "Regał A" na "Regał Metalowy"), aby utrzymać aktualną strukturę, gdy zmienia się moja organizacja przechowywania.
Kryteria akceptacji:

1. Użytkownik może kliknąć na istniejącą lokalizację w drzewie i wybrać "Edytuj".
2. Otworzy się formularz z bieżącą nazwą lokalizacji.
3. Po zmianie nazwy i kliknięciu "Zapisz", zmiana pojawia się natychmiast w drzewie.
4. Wszystkie pudełka przypisane do tej lokalizacji automatycznie pokazują nową nazwę.
5. Jeśli nazwa jest pusta, system wyświetla błąd walidacji.

---

ID: US-013
Tytuł: Przeglądanie wyników wyszukiwania (Live Search Results)
Opis: Jako użytkownik chcę zobaczyć listę pudełek spełniających kryteria wyszukiwania, aby szybko znaleźć pudełko bez klikania i oglądania wszystkich kategorii.
Kryteria akceptacji:

1. Po wpisaniu co najmniej 3 znaków w pasek wyszukiwania pojawia się lista wyników.
2. Wyniki są posortowane po relevancji (dopasowanie do fraz).
3. Dla każdego wyniku wyświetlana jest: nazwa pudełka, lokalizacja (breadcrumb).
4. Wyniki są aktualizowane dynamicznie w trakcie wpisywania.
5. Jeśli brak wyników, wyświetlany jest komunikat "Brak pudełek spełniających kryteria".
6. Kliknięcie na wynik przenosi do szczegółów pudełka.

---

ID: US-014
Tytuł: Anulowanie wyszukiwania i powrót do pełnej listy pudełek
Opis: Jako użytkownik chcę szybko wyczyścić pasek wyszukiwania, aby powrócić do przeglądania wszystkich pudełek bez otwierania nowej strony.
Kryteria akceptacji:

1. W pasku wyszukiwania dostępna jest ikonka "X" lub przycisk "Wyczyść".
2. Kliknięcie wyczyści pole i przywróci pełną listę pudełek z wybranej lokalizacji.
3. Fokus pozostaje w polu wyszukiwania.
4. Funkcjonalność działa również na urządzeniach mobilnych.

---

ID: US-015
Tytuł: Wyświetlanie pudełek "Nieprzypisanych"
Opis: Jako użytkownik chcę mieć dostęp do pudełek, które nie mają przypisanej lokalizacji (np. po usunięciu lokalizacji), aby móc je zaklasyfikować w odpowiednie miejsce.
Kryteria akceptacji:

1. W drzewie lokalizacji dostępny jest specjalny wierzchołek "Nieprzypisane" lub "Brak lokalizacji".
2. Kliknięcie na niego wyświetla listę pudełek bez przypisanej lokalizacji.
3. Ilość pudełek w tej kategorii jest wyświetlona w nawiasie (np. "Nieprzypisane (3)").
4. Użytkownik może edytować pudełko i przypisać mu lokalizację z tego widoku.

---

ID: US-016
Tytuł: Przeglądanie pudełek w wybranej lokalizacji
Opis: Jako użytkownik chcę kliknąć na konkretną lokalizację w drzewie, aby zobaczyć tylko pudełka przechowywane w tym miejscu.
Kryteria akceptacji:

1. Użytkownik klika na lokalizację w drzewie (np. "Garaż > Półka Górna").
2. Lewa kolumna pokazuje wszystkie pudełka w tej lokalizacji.
3. Ilość pudełek jest wyświetlona obok nazwy lokalizacji.
4. Jeśli w lokalizacji nie ma pudełek, wyświetlany jest komunikat "Brak pudełek" z opcją "Dodaj pudełko".
5. W listę pudełek można zastosować wyszukiwanie (zawężanie wyników).

---

ID: US-017
Tytuł: Edycja informacji o pudełku
Opis: Jako użytkownik chcę zmienić nazwę, opis lub tagi pudełka, gdy jego zawartość się zmienia lub chcę poprawić wcześniejsze wpisy.
Kryteria akceptacji:

1. Ze strony szczegółów pudełka dostępny jest przycisk "Edytuj".
2. Kliknięcie otwiera formularz edycji (stronę lub modal).
3. Wszystkie pola (nazwa, opis, tagi, lokalizacja) są edytowalne.
4. Po kliknięciu "Zapisz" zmiany są aktualizowane natychmiast.
5. System waliduje, że nazwa nie jest pusta.
6. Wyświetlany jest komunikat potwierdzenia "Pudełko zaktualizowane".

---

ID: US-018
Tytuł: Logowanie istniejącego użytkownika
Opis: Jako istniejący użytkownik chcę zalogować się do aplikacji przy użyciu swojego adresu e-mail i hasła, aby uzyskać dostęp do moich danych.
Kryteria akceptacji:

1. Dostępna jest strona logowania z polami: email, hasło.
2. Użytkownik wpisuje poprawne dane.
3. Po kliknięciu "Zaloguj" system weryfikuje dane.
4. Jeśli dane są poprawne, użytkownik jest przekierowany na dashboard (/app).
5. Jeśli dane są niepoprawne, wyświetlany jest błąd "Nieprawidłowy e-mail lub hasło".
6. Pod formularzem dostępny jest link "Nowe konto?" prowadzący do rejestracji.

---

ID: US-019
Tytuł: Wylogowanie użytkownika
Opis: Jako zalogowany użytkownik chcę bezpiecznie wylogować się z aplikacji, aby zablokować dostęp do moich danych.
Kryteria akceptacji:

1. W nawigacji (sidebar na desktop lub menu) dostępny jest przycisk "Wyloguj".
2. Kliknięcie przycisku wyświetla potwierdzenie (opcjonalnie) lub bezpośrednio wylogowuje.
3. Sesja użytkownika jest anulowana serwer-side.
4. Użytkownik jest przekierowany na stronę logowania (/login).
5. Ciasteczka sesji / tokeny są usuwane z przeglądarki.

---

ID: US-020
Tytuł: Usunięcie pudełka
Opis: Jako użytkownik chcę usunąć pudełko z systemu, gdy przedmiot nie istnieje już lub chcę oczyścić zbyt stare wpisy.
Kryteria akceptacji:

1. Na stronie szczegółów pudełka dostępny jest przycisk "Usuń" (w sekcji "Danger Zone" lub na dole).
2. Kliknięcie przycisku wyświetla potwierdzenie z ostrzeżeniem "Ta akcja jest nieodwracalna".
3. Użytkownik musi potwierdzić akcję (np. wpisać "USUŃ" lub kliknąć OK).
4. Po potwierdzeniu pudełko jest usuwane z bazy danych.
5. Kod QR przypisany do pudełka powraca do statusu "generowany" i może być ponownie użyty.
6. Użytkownik jest przekierowany na dashboard.

---

ID: US-021
Tytuł: Zmiana hasła użytkownika
Opis: Jako zalogowany użytkownik chcę zmienić swoje hasło, aby zwiększyć bezpieczeństwo konta.
Status: MVP lub Early Post-MVP
Kryteria akceptacji:

1. W ustawieniach (Settings) dostępna jest sekcja "Bezpieczeństwo".
2. Dostępny jest formularz z polami: "Bieżące hasło", "Nowe hasło", "Potwierdź nowe hasło".
3. System waliduje hasło (min. 8 znaków).
4. Po zmianie wyświetlany jest komunikat potwierdzenia.
5. Użytkownik NIE jest wylogowywany po zmianie hasła.

---

ID: US-022
Tytuł: Przeglądanie statystyk workspace (Unboxed Stats)
Opis: Jako użytkownik chcę widzieć szybkie podsumowanie moich danych (liczba pudełek, lokalizacji), aby mieć przegląd mojego inwentarza.
Status: MVP lub Post-MVP (Nice-to-have)
Kryteria akceptacji:

1. Na stronie głównej (Dashboard) lub w Settings widoczna jest sekcja "Twoje Statystyki".
2. Wyświetlane są: Liczba pudełek, Liczba lokalizacji, Liczba pudełek bez lokalizacji, Liczba tagów.
3. Statystyki są aktualizowane w czasie rzeczywistym po każdej zmianie danych.
4. Na urządzeniach mobilnych statystyki są zwinięte lub wyświetlane jako ikony.

---

ID: US-023
Tytuł: Sortowanie listy pudełek
Opis: Jako użytkownik chcę sortować pudełka po nazwie, dacie utworzenia lub lokalizacji, aby łatwiej znaleźć pudełko w dużej liście.
Status: Post-MVP (Nice-to-have)
Kryteria akceptacji:

1. Nad listą pudełek dostępne są opcje sortowania: "Nazwa (A-Z)", "Data utworzenia (Najnowsze)", "Lokalizacja".
2. Po kliknięciu na opcję lista jest ponownie sortowana.
3. Aktualnie wybrana opcja sortowania jest oznaczona (np. checked icon).
4. Sortowanie działa również wśród wyników wyszukiwania.

---

ID: US-024
Tytuł: Duplikowanie pudełka
Opis: Jako użytkownik chcę skopiować istniejące pudełko (tagi, opis, lokalizacja), aby szybko dodać nowe pudełko z podobną zawartością bez ręcznego wpisywania.
Status: Post-MVP
Kryteria akceptacji:

1. Na stronie szczegółów pudełka dostępny jest przycisk "Duplikuj" lub "Kopiuj".
2. System tworzy nowe pudełko z tymi samymi danymi (nazwa, opis, tagi, lokalizacja).
3. Nowe pudełko otrzymuje nowy unikalny ID.
4. Użytkownik jest przeniesiony do formularza edycji, gdzie może zmienić dane.
5. Po zapisaniu wyświetlany jest komunikat potwierdzenia.

---

ID: US-025
Tytuł: Wyświetlanie QR code pudełka
Opis: Jako użytkownik chcę zobaczyć kod QR przypisany do pudełka na stronie szczegółów, aby móc go zeskanować lub wydrukować jako etykietę zastępczą.
Status: MVP
Kryteria akceptacji:

1. Na stronie szczegółów pudełka wyświetlony jest kod QR przypisany do tego pudełka.
2. Kod QR jest wyświetlany w odpowiednio dużym rozmiarze (minimum 200x200px).
3. Pod kodem wyświetlony jest jego identyfikator tekstowy (np. "QR-A1B2C3").
4. Dostępny jest przycisk "Wydrukuj" lub "Pobierz" dla kodu QR.
5. Jeśli pudełko nie ma przypisanego kodu, wyświetlany jest komunikat "Brak kodu QR".

---

ID: US-026
Tytuł: Przypisanie wolnego kodu QR do pudełka
Opis: Jako użytkownik chcę przypisać wolny kod QR do pudełka, które zostało utworzone ręcznie (bez skanowania), aby móc wygenerować etykietę.
Status: MVP lub Post-MVP
Kryteria akceptacji:

1. W formularzu tworzenia/edycji pudełka dostępne jest pole "Przypisz kod QR".
2. Pole wyświetla listę dostępnych (wolnych) kodów QR.
3. Użytkownik wybiera kod z listy.
4. Po zapisaniu pudełko jest powiązane z wybranym kodem.
5. Kod zmienia status z "generowany" na "przypisany".

---

ID: US-027
Tytuł: Bulk Upload pudełek (CSV Import)
Opis: Jako użytkownik chcę zaimportować listę pudełek z pliku CSV, aby szybko dodać wiele pudełek naraz zamiast wpisywać je ręcznie.
Status: Post-MVP
Kryteria akceptacji:

1. W Settings dostępna jest opcja "Importuj pudełka z CSV".
2. Użytkownik może wybrać plik CSV z dysku.
3. System waliduje format pliku (kolumny: name, description, tags, location_path).
4. System wyświetla podgląd danych i ilość pudełek do importu.
5. Po potwierdzeniu pudełka są dodawane do bazy danych.
6. Wyświetlany jest raport: "Importowano 45 pudełek, 2 błędy".

---

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

---

ID: US-028
Tytuł: Szybkie dodanie pudełka bez skanowania QR
Opis: Jako użytkownik chcę dodać pudełko ręcznie (bez skanowania kodu QR) z dashboarda, aby móc szybko katalogować pudełka w razie potrzeby.
Status: MVP
Kryteria akceptacji:

1. Na stronie Dashboard dostępny jest przycisk "Dodaj pudełko" lub "Nowe pudełko".
2. Kliknięcie otwiera formularz tworzenia nowego pudełka (modal lub nowa strona).
3. Formularz zawiera pola: nazwa, opis, tagi, lokalizacja.
4. Pole QR Code jest opcjonalne (można wybrać kod z listy wolnych kodów).
5. Po zapisaniu pudełko pojawia się na liście.

---

ID: US-029
Tytuł: Przeglądanie historii zmian pudełka (Activity Log)
Opis: Jako użytkownik chcę widzieć, kiedy pudełko było ostatnio edytowane i co się zmieniło, aby śledzić historię zmian.
Status: Post-MVP (Nice-to-have)
Kryteria akceptacji:

1. Na stronie szczegółów pudełka dostępna jest zakładka "Historia" lub "Aktywność".
2. Historia wyświetla listę zmian z informacją: Data, Godzina, Typ zmiany (utworzono/edytowano), Kto zmienił.
3. Dla edycji wyświetlone są pola, które się zmieniły (np. "Opis zmieniony z 'Narzędzia' na 'Narzędzia elektryczne'").
4. Historia jest sortowana od najnowszych zmian.

---

ID: US-030
Tytuł: Oznaczanie pudełka jako "Przejrzane" (Quick Verification)
Opis: Jako użytkownik chcę oznaczyć pudełko jako "Sprawdzone" lub "Przejrzane", aby wiedzieć, które pudełka ostatnio weryfikowałem.
Status: Post-MVP (Nice-to-have)
Kryteria akceptacji:

1. Na stronie szczegółów pudełka dostępny jest checkbox "Oznacz jako przejrzane" lub przycisk "Sprawdzono".
2. Po oznaczeniu, pudełko wyświetla znacznik (np. ikonkę checkmark) na liście.
3. Data ostatniego przejrzenia jest wyświetlona obok nazwy pudełka.
4. Na dashboardzie dostępny jest filtr "Ostatnio przejrzane" lub "Niezaznaczone".

---

ID: US-031
Tytuł: Szybkie działania z kontekstu listy pudełek
Opis: Jako użytkownik chcę mieć dostęp do szybkich akcji (Edit, Delete) dla pudełka bez wchodzenia na stronę szczegółów, aby pracować efektywniej.
Status: MVP lub Post-MVP
Kryteria akceptacji:

1. Na liście pudełek każdy element posiada menu kontekstowe (przycisk "..." lub najechanie na element).
2. Menu zawiera opcje: "Edytuj", "Duplikuj", "Usuń", "Wyświetl szczegóły".
3. Kliknięcie na "Usuń" wyświetla potwierdzenie.
4. Zmiana lokalizacji pudełka jest dostępna bez wchodzenia w edycję (drag-and-drop lub szybkie menu).

---

ID: US-032
Tytuł: Filtrowanie pudełek po tagach
Opis: Jako użytkownik chcę filtrować pudełka po wybranych tagach, aby szybko znaleźć pudełka z konkretną zawartością (np. wszystkie pudełka z tagiem "elektronika").
Status: Post-MVP (Nice-to-have)
Kryteria akceptacji:

1. Na stronie Dashboard dostępny jest panel "Filtry" z listą wszystkich tagów używanych w workspace.
2. Użytkownik może zaznaczać tagi z listy (multi-select).
3. Po zaznaczeniu tagu, lista pudełek filtruje się i pokazuje tylko pudełka zawierające ten tag.
4. Liczba wybranych filtrów jest wyświetlona na przycisku filtru.
5. Tagi mogą być łączone logicą AND/OR (zależy od preferencji).

---

ID: US-033
Tytuł: Powiadomienie o pudełach w "niebezpiecznym" stanie
Opis: Jako użytkownik chcę otrzymać wiadomość o pudełkach, które mają puste dane (brak opisu/tagów), aby uzupełnić informacje.
Status: Post-MVP (Nice-to-have)
Kryteria akceptacji:

1. Na stronie Dashboard wyświetlane jest powiadomienie: "Masz 5 pudełek bez opisu. Uzupełnij dane, aby lepiej organizować inwentarz."
2. Powiadomienie zawiera link do filtrowanej listy pudełek bez opisu.
3. Powiadomienie można zamknąć.
4. Powiadomienie pojawia się tylko jeśli jest co najmniej 1 pudełko z brakującymi danymi.

---

ID: US-034
Tytuł: Przesuwanie pudełka między lokalizacjami (Drag & Drop)
Opis: Jako użytkownik chcę przesunąć pudełko z listy bezpośrednio do innej lokalizacji w drzewie, aby szybko zmienić jego lokalizację bez otwierania formularza.
Status: Post-MVP
Kryteria akceptacji:

1. Lista pudełek i drzewo lokalizacji są widoczne jednocześnie (layout dwukolumnowy).
2. Użytkownik może przeciągnąć pudełko z listy na wybraną lokalizację w drzewie.
3. Po upuszczeniu pudełko zmienia lokalizację.
4. Wyświetlany jest komunikat potwierdzenia "Pudełko przeniesione do [nazwa lokalizacji]".
5. Drag & Drop działa na urządzeniach z touchscreen (alternatywnie: menu kontekstowe).

---

ID: US-035
Tytuł: Tworzenie szablonów pudełek
Opis: Jako użytkownik chcę stworzyć szablon pudełka (ze stałymi tagami i opisem) i szybko utworzyć nowe pudełka z szablonu, aby przyspieszyć katalogowanie.
Status: Post-MVP
Kryteria akceptacji:

1. W Settings dostępna jest sekcja "Szablony Pudełek".
2. Użytkownik może utworzyć nowy szablon z polami: nazwa szablonu, domyślne tagi, domyślny opis, domyślna lokalizacja.
3. Na formularzu tworzenia pudełka dostępna jest lista szablonów w postaci szybkich przycisków.
4. Po wyborze szablonu pola formularza są wstępnie wypełnione danymi z szablonu.
5. Użytkownik może edytować pola przed zapisaniem.

---

## 6. Metryki sukcesu

1.  **Czas dodawania pudełka:** Średni czas od zeskanowania pustego kodu do zapisania pudełka wynosi poniżej 45 sekund.
2.  **Skuteczność wyszukiwania:** 90% wyszukiwań kończy się kliknięciem w wynik (znalezieniem pudełka) w ciągu 10 sekund.
3.  **Kompletność danych:** 80% utworzonych pudełek posiada wypełniony opis lub tagi (wskaźnik użyteczności systemu katalogowania).
4.  **Bezawaryjność skanowania:** Poniżej 1% zgłoszeń błędów dotyczących nierozpoznawania kodów QR lub błędnych przekierowań.
5.  **Retencja użytkowników:** 30% użytkowników, którzy dodali pierwsze pudełko, dodaje kolejne w ciągu 7 dni.
