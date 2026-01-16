<conversation_summary>
<decisions>
1.  **Pulpit (Dashboard):** Zostanie zaprojektowany responsywnie. Na desktopie będzie miał układ dwukolumnowy (drzewo lokalizacji + lista pudełek), a na mobile domyślnie widoczna będzie lista pudełek z wyszukiwarką.
2.  **Hierarchia Lokalizacji:** Na desktopie zostanie użyty komponent drzewa (`tree view`). Na mobile zostanie zastosowana nawigacja "drill-down" z widocznymi "okruszkami" (breadcrumbs).
3.  **Wyszukiwarka "Live Search":** Uruchamiana po 3 znakach z opóźnieniem (debounce 300-500ms). Wyniki będą zawierać nazwę pudełka, tagi i pełną ścieżkę lokalizacji.
4.  **Pudełka Nieprzypisane:** W strukturze lokalizacji zostanie dodana wirtualna pozycja "Pudełka nieprzypisane", która będzie wyświetlać pudełka z `location_id` ustawionym na `NULL`.
5.  **Generowanie Kodów QR:** Zostanie stworzona dedykowana strona "Generator Etykiet QR" z polem na liczbę etykiet (limit 100) i przyciskiem generującym PDF, wraz z komunikatem instruktażowym.
6.  **Zarządzanie Stanem i Uwierzytelnianiem:** `Nano Stores` posłuży do globalnego zarządzania stanem. Token JWT będzie przechowywany w `localStorage`. Zostanie zaimplementowany interceptor dla zapytań API, który będzie dołączał token i obsługiwał błąd 401 (przekierowanie do logowania).
7.  **Obsługa Błędów API:** Błędy będą komunikowane za pomocą komponentu `Toast`/`Sonner`. Błędy walidacji (400) będą wyświetlane przy polach formularza.
8.  **Optimistic UI Updates:** Zostaną zastosowane dla operacji o niskim ryzyku niepowodzenia, jak przenoszenie pudełek czy zmiana nazwy lokalizacji.
9.  **Skanowanie QR Telefonem:** Strona docelowa (`/qr/:short_id`) będzie zoptymalizowana pod kątem szybkości ładowania i będzie realizować logikę przekierowania po stronie serwera (w Astro).
10. **Operacje Asynchroniczne:** Wszystkie operacje (ładowanie, eksport) będą miały wyraźne stany ładowania (komponenty "skeleton", stany "loading" na przyciskach).
11. **Walidacja Formularzy:** Zostanie zastosowana walidacja po stronie klienta (np. Zod) dla błędów formatu oraz mapowanie błędów biznesowych z API (400) na konkretne pola formularza.
12. **Zarządzanie Tagami:** Zostanie użyty komponent "Combobox" z `shadcn/ui`, pozwalający na dodawanie nowych i wybieranie istniejących tagów.
13. **Widok "Pustego Stanu" (Empty State):** Dla nowych użytkowników wyświetlony zostanie ekran powitalny z przyciskami "call to action" ("Stwórz lokalizację", "Generuj etykiety"). Dla lokalizacji zostanie dodane obrazkowe wyjaśnienie, czym jest hierarchia.
14. **Tryb Ciemny (Dark Mode):** Zostanie zaimplementowany w podejściu hybrydowym: domyślnie wg ustawień systemowych, z możliwością ręcznej zmiany przez użytkownika (Jasny / Ciemny / Systemowy).
15. **Rejestracja i Logowanie w MVP:** W wersji MVP proces uwierzytelniania będzie oparty wyłącznie na adresie e-mail i haśle. Opcje logowania przez Google/Apple zostaną zaimplementowane w przyszłości.
16. **Brak Odzyskiwania Hasła w MVP:** Formularz rejestracji będzie zawierał obowiązkowe pole wyboru, w którym użytkownik potwierdza, że rozumie brak możliwości odzyskania hasła.
17. **Weryfikacja E-mail w MVP:** Funkcja weryfikacji adresu e-mail w Supabase zostanie wyłączona dla MVP, aby umożliwić natychmiastowe logowanie po rejestracji. Zostanie to zaimplementowane w późniejszym etapie.
</decisions>
<matched_recommendations>
1.  **Architektura Pulpitu:** Projekt pulpitu z centralnym paskiem wyszukiwania, z dwukolumnowym układem na desktopie (drzewo lokalizacji, lista pudełek) i widokiem listy pudełek na mobile, jest kluczową decyzją dla responsywności aplikacji.
2.  **Zarządzanie Stanem Uwierzytelniania:** Użycie `Nano Stores` do globalnego zarządzania stanem, przechowywanie tokena JWT w `localStorage` oraz implementacja interceptora API do obsługi autoryzacji i wygaśnięcia sesji stanowi fundament bezpiecznej aplikacji klienckiej.
3.  **Uwierzytelnianie w MVP:** Skupienie się wyłącznie na rejestracji przez e-mail/hasło przy jednoczesnym wyłączeniu weryfikacji e-mail w Supabase i dodaniu jawnego komunikatu o braku możliwości odzyskania hasła jest pragmatycznym podejściem, które upraszcza wdrożenie MVP.
4.  **Obsługa Hierarchii:** Zastosowanie komponentu `tree view` na desktopie i nawigacji "drill-down" na mobile do zarządzania zagnieżdżoną strukturą lokalizacji jest optymalnym rozwiązaniem godzącym złożoność danych z ograniczeniami różnych urządzeń.
5.  **Przepływ Skanowania QR:** Zaprojektowanie strony docelowej po zeskanowaniu kodu QR (`/qr/:short_id`) jako lekkiej strony realizującej logikę przekierowania po stronie serwera (Astro) jest kluczowe dla zapewnienia szybkiego i płynnego doświadczenia użytkownika na urządzeniach mobilnych.
6.  **Widok "Pustego Stanu" i Onboarding:** Projekt dedykowanego widoku dla nowych użytkowników z wyraźnymi przyciskami "call to action" oraz wizualnym wyjaśnieniem hierarchii lokalizacji jest istotny dla skutecznego onboardingu i edukacji użytkownika.
7.  **Obsługa Błędów i Stanów Ładowania:** Strategia wykorzystania komponentów `Toast`/`Sonner` do globalnych błędów, komunikatów przy polach formularzy dla błędów walidacji oraz komponentów "skeleton" dla stanów ładowania zapewni spójne i transparentne dla użytkownika działanie aplikacji.
</matched_recommendations>
<ui_architecture_planning_summary>
**a. Główne wymagania dotyczące architektury UI**
Aplikacja będzie responsywną aplikacją PWA (Progressive Web App) z interfejsem w języku polskim, wspierającą tryb ciemny. Architektura będzie oparta na podejściu "Mobile-First" dla kluczowych operacji na pudełkach (dodawanie, przeglądanie) oraz "Desktop-First" dla zarządzania złożoną strukturą lokalizacji. Zostanie zbudowana przy użyciu Astro, React, TypeScript, Tailwind CSS i biblioteki komponentów `shadcn/ui`.

**b. Kluczowe widoki, ekrany i przepływy użytkownika**
- **Uwierzytelnianie (MVP):** Dedykowana strona z formularzami do rejestracji i logowania za pomocą adresu e-mail i hasła. Formularz rejestracji będzie zawierał mechanizm wymuszający akceptację braku możliwości odzyskania hasła.
- **Pulpit Główny (Dashboard):** Po zalogowaniu użytkownik trafia na responsywny pulpit. Na desktopie widoczne będzie drzewo lokalizacji i lista pudełek. Na mobile domyślnym widokiem będzie lista pudełek z łatwo dostępną wyszukiwarką.
- **Widok "Pustego Stanu":** Nowi użytkownicy zobaczą ekran powitalny z przyciskami akcji ("Stwórz lokalizację", "Generuj etykiety") oraz graficznym wyjaśnieniem działania hierarchii.
- **Zarządzanie Lokalizacjami:** Realizowane przez interaktywne drzewo na desktopie i nawigację "drill-down" na mobile. Usunięcie lokalizacji przeniesie zawarte w niej pudełka do wirtualnej lokalizacji "Pudełka nieprzypisane".
- **Zarządzanie Pudełkami:** Widoki listy pudełek, szczegółów pudełka oraz formularze (w formie modali) do dodawania i edycji. Formularz edycji będzie zawierał komponent "Combobox" do zarządzania tagami.
- **Generowanie Kodów QR:** Dedykowana strona, na której użytkownik podaje liczbę etykiet do wygenerowania i pobiera gotowy do druku plik PDF.
- **Przepływ Skanowania Kodu QR:** Użytkownik skanuje kod natywną aplikacją aparatu, co otwiera w przeglądarce stronę `/qr/:short_id`. Strona ta po stronie serwera decyduje o przekierowaniu do formularza tworzenia nowego pudełka (z preselekcją kodu QR) lub do widoku szczegółów istniejącego pudełka.

**c. Strategia integracji z API i zarządzania stanem**
- **Zarządzanie Stanem:** Globalny stan aplikacji, w tym dane użytkownika i token JWT, będzie zarządzany przez `Nano Stores`.
- **Komunikacja z API:** Wszystkie zapytania do API będą obsługiwane z uwzględnieniem stanów ładowania (wyświetlanie komponentów "skeleton") i błędów (wyświetlanie powiadomień `Toast`/`Sonner`). Wyszukiwarka "Live Search" będzie używać techniki "debounce" w celu optymalizacji liczby zapytań.
- **Aktualizacje Optymistyczne:** W celu poprawy odczuwalnej wydajności, operacje o niskim ryzyku niepowodzenia (np. zmiana nazwy, przeniesienie) będą natychmiastowo odzwierciedlane w UI, z mechanizmem wycofania zmiany w przypadku błędu API.

**d. Kwestie dotyczące responsywności, dostępności i bezpieczeństwa**
- **Responsywność:** Kluczowe widoki, takie jak pulpit i zarządzanie lokalizacjami, będą miały dedykowane układy dla urządzeń mobilnych i desktopowych.
- **Dostępność (a11y):** Komponenty interaktywne, zwłaszcza drzewo lokalizacji, będą w pełni nawigowalne za pomocą klawiatury i będą wykorzystywać odpowiednie atrybuty ARIA.
- **Bezpieczeństwo:** Uwierzytelnianie będzie oparte na tokenach JWT przesyłanych w nagłówku `Authorization`. Token będzie przechowywany w `localStorage`. Aplikacja będzie obsługiwać wygaśnięcie sesji poprzez przechwytywanie błędu 401 i przekierowanie do strony logowania. Proces usuwania konta będzie wymagał dodatkowego potwierdzenia od użytkownika (wpisanie tekstu w celu odblokowania przycisku).
</ui_architecture_planning_summary>
<unresolved_issues>
- **Implementacja weryfikacji e-mail:** Obecne wyłączenie tej funkcji w Supabase jest rozwiązaniem tymczasowym dla MVP. Należy zaplanować jej wdrożenie w kolejnej iteracji.
- **Dodanie logowania przez OAuth:** Przyciski i logika dla logowania przez Google i Apple zostały świadomie pominięte w MVP i wymagają implementacji.
- **Projekt grafik do onboardingu:** Koncepcja "komiksowych obrazów" do wyjaśnienia hierarchii lokalizacji wymaga szczegółowego zaprojektowania graficznego.
</unresolved_issues>
</conversation_summary>