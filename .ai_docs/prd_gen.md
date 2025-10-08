# Dokument wymagań produktu (PRD) - Shelves Organiser

## 1. Przegląd produktu

Shelves Organiser to webowa aplikacja do katalogowania i lokalizowania rzeczy przechowywanych w pudełkach/boxach w hierarchii lokalizacji: budynek → pomieszczenie → regał → półka. Każde pudełko ma opis i tagi, może też otrzymać publiczny link i kod QR prowadzący do widoku zawartości bez logowania. Aplikacja umożliwia szybkie wyszukiwanie po lokalizacji i tagach. Wspiera wstępną kategoryzację zawartości na podstawie zdjęcia przy użyciu AI, z możliwością ręcznej korekty.

Zakres MVP obejmuje: rejestrację użytkowników (z CAPTCHA), role i autoryzację, CRUD dla hierarchii lokalizacji i pudełek, system tagów, upload zdjęć i analizę AI, generowanie publicznych linków i kodów QR, podstawowe wyszukiwanie, panel admina ograniczony do logów. Publiczne linki/QR są dostępne bez logowania w MVP (przy zachowaniu nieindeksowania i prostych zabezpieczeń anty-scrapingowych).

Odbiorcy: gospodarstwa domowe i majsterkowicze, małe pracownie/makerspace’y, niewielkie zaplecza magazynowe (SMB) bez rozbudowanych systemów WMS.

Założenia techniczne (MVP): frontend Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui; backend i auth w Supabase (PostgreSQL + Supabase Auth); analiza obrazu przez OpenRouter; hostowanie produkcyjne i CI/CD poza zakresem tego dokumentu.

Kluczowa propozycja wartości: natychmiastowe odnalezienie właściwego pudełka dzięki spójnej hierarchii, tagom, publicznym QR i prostemu procesowi etykietowania wspartego AI.

## 2. Problem użytkownika

Użytkownicy przechowują wiele rzeczy bez spójnego systemu, przez co tracą czas i nie mają pewności gdzie znajdują się poszczególne przedmioty. Brakuje jednolitego sposobu opisania, oznaczenia i szybkiego odnalezienia pudełek oraz ich dokładnej lokalizacji w fizycznej przestrzeni. Aplikacja rozwiązuje te problemy przez:

- spójną hierarchię lokalizacji: budynek → pomieszczenie → regał → półka,
- pudełka jako najmniejszą jednostkę z opisem i tagami,
- publiczne linki i kody QR pozwalające szybko otworzyć widok pudełka bez logowania,
- wstępną kategoryzację zawartości na podstawie zdjęcia i możliwość natychmiastowej korekty,
- szybkie wyszukiwanie po lokalizacji i tagach.

## 3. Wymagania funkcjonalne

3.1. Uwierzytelnianie, autoryzacja, role
- Rejestracja z CAPTCHA. Logowanie i wylogowanie przez Supabase Auth.
- Role: odczyt, pełny dostęp, administrator systemu.
- Rola odczyt nie może wykonywać operacji modyfikujących (CRUD) na lokalizacjach i pudełkach.
- Administrator może przeglądać logi systemowe i zarządzać rolami użytkowników.

3.2. Hierarchia lokalizacji (CRUD)
- Poziomy: budynek → pomieszczenie → regał → półka.
- Każdy poziom ma UUID v4 (generowany po stronie backendu) i opcjonalną nazwę przyjazną.
- Usunięcie elementu lokalizacji z dziećmi lub przypisanymi pudełkami jest zablokowane (komunikat i instrukcja rozwiązania).
- Nawigacja breadcrumb prezentuje pełną ścieżkę lokalizacji.

3.3. Pudełka/boxy (CRUD)
- Pudełko ma UUID v4, opcjonalną nazwę przyjazną, obowiązkową relację do półki, opis w plain/markdown do 10000 znaków.
- Pudełko można przenosić między półkami (zachowanie historii nie jest wymagane w MVP).
- Brak modelowania pojedynczych przedmiotów wewnątrz pudełka w MVP.

3.4. Tagi
- Hashtagi nadawane przez użytkownika; maksymalnie 10 tagów na pudełko.
- Limit długości tagu do 30 znaków; walidacja formatu i duplikatów.
- Autocomplete podpowiada istniejące tagi podczas wyszukiwania i edycji.

3.5. Upload zdjęcia i analiza AI
- Obsługiwane formaty: jpg, png, heic; maksymalny rozmiar 3 MB; maksymalna rozdzielczość 1200×1200 (większe skalowane lub odrzucane).
- Analiza obrazu z użyciem modelu dostępnego przez OpenRouter; wynik to ogólne kategorie.
- Użytkownik może ręcznie skorygować zaproponowane kategorie przed zapisem.
- Plik obrazu jest usuwany po zakończonej analizie; nie jest przechowywany w systemie.

3.6. Publiczne linki i kody QR
- Dla pudełka można jednorazowo wygenerować publiczny link zawierający jedynie UUID v4 (brak danych jawnych).
- Wyświetlany jest kod QR prowadzący do publicznego widoku pudełka dostępnego bez logowania.
- Brak historii linków i regeneracji w MVP.
- Publiczne widoki są oznaczone jako nieindeksowalne (robots noindex) i objęte prostym rate limitingiem.

3.7. Wyszukiwanie i przeglądanie
- Filtrowanie pudełek po lokalizacji (dowolne poziomy hierarchii) oraz po tagach (wielokrotny wybór).
- Paginacja i sortowanie (co najmniej po dacie utworzenia i nazwie).
- W przypadku braku wyników wyświetlany jest czytelny stan pusty i wskazówki zawężenia filtrów.

3.8. Panel administracyjny – logi
- Podgląd logów zdarzeń (utworzenie, edycja, usunięcie; typ zasobu; identyfikator; użytkownik; timestamp).
- Filtrowanie co najmniej po typie akcji i zakresie dat.
- Tylko do odczytu, dostępne wyłącznie dla roli administratora.

3.9. Identyfikatory i prywatność
- Wszystkie zasoby używają UUID v4 generowanych po stronie backendu.
- Publiczne URL-e nie zawierają danych jawnych i nie ujawniają właściciela.

3.10. Jakość i użyteczność
- Breadcrumb w widokach lokalizacji i pudełek.
- Jasne komunikaty walidacyjne i błędów (np. limity tagów, rozmiaru/formatu obrazu, braku uprawnień).

## 4. Granice produktu

Poza zakresem MVP
- Współdzielenie lokalizacji pomiędzy użytkownikami i zaawansowane uprawnienia międzykontowe.
- Analiza składowanych rzeczy na poziomie pojedynczych przedmiotów i rekomendacje układania.
- Optymalizacja ułożenia na półkach i zaawansowana analityka zapasów.
- Aplikacja mobilna natywna; PWA opcjonalna w przyszłości.
- Backup/DR ponad standardowe możliwości dostawców; rozbudowane SLO/SLA.
- Historia/regeneracja publicznych linków, mechanizm unieważniania (revocation).
- Zaawansowane polityki prywatności i retencji danych obrazów ponad usunięcie po analizie.
- Szerokie wsparcie legacy przeglądarek; a11y poza minimum praktyczne.

Założenia i zależności
- Supabase zapewnia auth, PostgreSQL i egzekwowanie RLS/RBAC (szczegółowe polityki do doprecyzowania).
- OpenRouter udostępnia model zdolny do analizy obrazów (VLM) w budżecie ustalonym poza niniejszym dokumentem.
- Publiczne widoki oznaczane jako noindex; rozważony prosty rate limiting na endpointach publicznych.

Nierozstrzygnięte kwestie do doprecyzowania
- Mapowanie ról na polityki RLS w Supabase (szczegółowe reguły i zakresy).
- Dokładne wymogi a11y i wsparcia przeglądarek/urządzeń.
- Budżet i limity kosztów dla OpenRouter oraz dobór konkretnego modelu.
- Zakres panelu admina poza logami (czy i jakie CRUD-y przenieść do panelu).
- Zakres i retencja logów (jakie akcje, okres przechowywania, prywatność).
- Parametry wyszukiwania: docelowe sortowania, paginacje i filtrowanie wielokryterialne.
- Ewentualna revokacja publicznych linków/QR w przyszłości.

Ryzyka i kompromisy
- Dyscyplina w etykietowaniu i aktualizacji danych użytkownika.
- Trafność AI w MVP (konieczna łatwa i szybka korekta).
- Publiczne linki a prywatność; konieczne noindex i rate limiting.

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Rejestracja użytkownika z CAPTCHA
Opis: Jako nowy użytkownik chcę utworzyć konto i przejść CAPTCHA, aby bezpiecznie korzystać z aplikacji.
Kryteria akceptacji:
- Formularz rejestracji przyjmuje e-mail i hasło oraz wymaga pozytywnego rozwiązania CAPTCHA.
- Po rejestracji tworzony jest profil z domyślną rolą odczyt lub pełny (zgodnie z polityką systemu).
- Błędy walidacji i CAPTCHA są komunikowane w czytelny sposób.

ID: US-002
Tytuł: Logowanie i wylogowanie
Opis: Jako zarejestrowany użytkownik chcę się zalogować i wylogować, aby zarządzać swoimi zasobami.
Kryteria akceptacji:
- Logowanie przez Supabase Auth umożliwia dostęp do aplikacji, wylogowanie wygasza sesję.
- Status roli użytkownika jest dostępny dla UI do ukrywania/przełączania akcji.
- Próbę dostępu do widoków wymagających autoryzacji bez uprawnień blokuje kontrola ról.

ID: US-003
Tytuł: Zarządzanie rolami użytkowników (admin)
Opis: Jako administrator chcę nadawać i zmieniać role użytkowników, aby kontrolować uprawnienia.
Kryteria akceptacji:
- Admin może przeglądać listę użytkowników i zmieniać ich role na odczyt/pełny/admin.
- Zmiana roli od razu wpływa na dostęp do operacji CRUD.
- Brak możliwości samodzielnego podniesienia roli przez użytkownika niebędącego adminem.

ID: US-004
Tytuł: CRUD hierarchii lokalizacji
Opis: Jako użytkownik z pełnym dostępem tworzę i edytuję budynki, pomieszczenia, regały i półki, aby uporządkować przestrzeń.
Kryteria akceptacji:
- Można dodać/edytować/usunąć każdy poziom hierarchii.
- Nie można usunąć elementu posiadającego dzieci lub przypisane pudełka (blokada z komunikatem).
- Breadcrumb pokazuje Budynek > Pomieszczenie > Regał > Półka.

ID: US-005
Tytuł: Utworzenie pudełka i przypisanie do półki
Opis: Jako użytkownik z pełnym dostępem chcę utworzyć pudełko, przypisać je do półki i uzupełnić opis oraz tagi.
Kryteria akceptacji:
- Pudełko ma UUID v4, opcjonalną nazwę, opis do 2000 znaków.
- Przypisanie do konkretnej półki jest wymagane.
- Użytkownik z rolą odczyt nie może tworzyć/edytować pudełek.

ID: US-006
Tytuł: Edycja opisu i tagów pudełka
Opis: Jako użytkownik z pełnym dostępem chcę zmienić opis i tagi pudełka, aby utrzymać porządek.
Kryteria akceptacji:
- Maksymalnie 10 tagów; każdy tag do 30 znaków; brak duplikatów.
- Walidacja formatu tagów i informacja o naruszeniach limitów.
- Zmiany zapisywane są natychmiast i widoczne w widokach.

ID: US-007
Tytuł: Przesłanie zdjęcia i kategoryzacja AI z korektą
Opis: Jako użytkownik z pełnym dostępem przesyłam zdjęcie pudełka, otrzymuję ogólne kategorie od AI i mogę je skorygować.
Kryteria akceptacji:
- Obsługa jpg, png, heic; limit 3 MB; do 1200×1200 px (większe skalowane lub odrzucane).
- Prezentacja propozycji kategorii; możliwość edycji przed zapisem.
- Po zapisie obraz jest usuwany; utrwalone są kategorie.
- Błędy przetwarzania i uploadu są jasno komunikowane.

ID: US-008
Tytuł: Generowanie publicznego linku i kodu QR
Opis: Jako użytkownik z pełnym dostępem generuję publiczny link i kod QR do widoku pudełka, aby łatwo je odnaleźć.
Kryteria akceptacji:
- Link zawiera wyłącznie UUID v4; brak danych jawnych.
- Kod QR po zeskanowaniu otwiera publiczny widok pudełka bez logowania.
- Link można wygenerować jednorazowo; brak historii i regeneracji w MVP.
- Możliwość pobrania/drukowania etykiety (PNG/SVG) z nazwą i QR.

ID: US-009
Tytuł: Publiczny widok pudełka
Opis: Jako dowolna osoba z linkiem/QR chcę zobaczyć informacje o pudełku, aby je zlokalizować.
Kryteria akceptacji:
- Widok prezentuje nazwę/ID, opis, tagi, uproszczoną ścieżkę lokalizacji.
- Strona ma meta noindex i nie ujawnia danych właściciela.
- Błędny lub nieistniejący UUID zwraca czytelny 404.

ID: US-010
Tytuł: Wyszukiwanie i filtrowanie pudełek
Opis: Jako zalogowany użytkownik filtruję pudełka po lokalizacji i tagach, aby szybko znaleźć właściwe.
Kryteria akceptacji:
- Filtrowanie po dowolnym poziomie hierarchii oraz tagach (multi-select).
- Paginacja i sortowanie po dacie utworzenia i nazwie.
- Puste wyniki prezentują komunikat i podpowiedzi.

ID: US-011
Tytuł: Przeniesienie pudełka między półkami
Opis: Jako użytkownik z pełnym dostępem przenoszę pudełko na inną półkę w tej samej lub innej lokalizacji.
Kryteria akceptacji:
- Wybór docelowej półki z hierarchii.
- Zmiana jest natychmiast widoczna w breadcrumb i wyszukiwaniu.
- Operacja niedostępna dla roli odczyt.

ID: US-012
Tytuł: Walidacja tagów
Opis: Jako użytkownik chcę jasnych komunikatów walidacji tagów, aby nie łamać reguł systemu.
Kryteria akceptacji:
- Próba dodania >10 tagów blokowana z komunikatem.
- Tag dłuższy niż 30 znaków odrzucany z podaniem powodu.
- Duplikaty tagów w ramach pudełka są niedozwolone.

ID: US-013
Tytuł: Obsługa błędów uploadu zdjęcia
Opis: Jako użytkownik chcę zrozumiałych komunikatów, gdy zdjęcie nie spełnia wymogów.
Kryteria akceptacji:
- Zbyt duży plik (>3 MB) lub nieobsługiwany format: czytelny komunikat.
- Zbyt duża rozdzielczość: automatyczny resize lub informacja o odrzuceniu.
- Problemy sieciowe prezentowane w jednolitym komponencie błędów.

ID: US-014
Tytuł: Podgląd logów administracyjnych
Opis: Jako administrator chcę widzieć logi działań, aby monitorować aktywność.
Kryteria akceptacji:
- Logi zawierają typ akcji, typ zasobu, identyfikator, użytkownika, timestamp.
- Filtrowanie po typie akcji i zakresie dat.
- Dostęp wyłącznie dla roli administrator.

ID: US-015
Tytuł: Reset hasła
Opis: Jako użytkownik, który zapomniał hasła, chcę zresetować hasło, aby odzyskać dostęp.
Kryteria akceptacji:
- Dostępna funkcja resetu hasła przez e-mail w Supabase.
- Link resetujący jest jednorazowy i ograniczony czasowo.
- Po zmianie hasła poprzednie sesje są unieważniane.

ID: US-016
Tytuł: Egzekwowanie ról i uprawnień
Opis: Jako właściciel danych chcę, aby role ograniczały operacje, aby zapewnić bezpieczeństwo.
Kryteria akceptacji:
- Rola odczyt nie widzi lub ma nieaktywne akcje modyfikujące.
- Próby wywołań API bez uprawnień zwracają adekwatny błąd (403/401) bez ujawniania danych.
- Widoki i przyciski w UI respektują uprawnienia.

ID: US-017
Tytuł: Bezpieczeństwo publicznych endpointów
Opis: Jako administrator chcę ograniczyć nadużycia publicznych linków, aby chronić infrastrukturę i prywatność.
Kryteria akceptacji:
- Publiczne widoki zawierają noindex i są objęte prostym rate limitingiem.
- Nieistniejące UUID zwracają 404; brak różnicowania czasu odpowiedzi umożliwiającego zgadywanie.
- Brak możliwości listowania zasobów publicznych bez UUID.

ID: US-018
Tytuł: Nawigacja breadcrumb
Opis: Jako użytkownik chcę widzieć pełną ścieżkę lokalizacji, aby nie tracić kontekstu.
Kryteria akceptacji:
- Breadcrumb prezentuje wszystkie poziomy hierarchii i pozwala na szybkie przejście.
- Zawsze spójny z aktualnym położeniem pudełka.

ID: US-019
Tytuł: Nazwy przyjazne zasobów
Opis: Jako użytkownik chcę nadawać przyjazne nazwy lokalizacjom i pudełkom, aby łatwiej je rozpoznawać.
Kryteria akceptacji:
- Pola nazw są opcjonalne; brak wpływu na UUID/URL.
- Nazwy prezentowane w listach, breadcrumb i widokach szczegółowych.

ID: US-020
Tytuł: Ograniczenia usuwania w hierarchii
Opis: Jako użytkownik chcę jasnych zasad usuwania lokalizacji, aby nie tracić danych.
Kryteria akceptacji:
- Nie można usunąć elementu z dziećmi lub przypisanymi pudełkami.
- UI wskazuje konieczne kroki (przeniesienie pudełek/usunięcie dzieci) przed usunięciem.

## 6. Metryki sukcesu

- Dostępność kluczowych ścieżek: rejestracja/logowanie, CRUD lokalizacji i pudełek, generowanie QR, publiczny podgląd, wyszukiwanie – działają w środowisku produkcyjnym.
- Czas dodania nowego pudełka (od formularza do zapisu): mediana ≤ 60 s.
- Czas odnalezienia pudełka po QR lub wyszukiwaniu: mediana ≤ 10 s.
- Skuteczność QR: ≥ 95% zeskanowanych kodów prowadzi do właściwego widoku bez błędu.
- Wyszukiwanie: wyniki zwracane w ≤ 1,5 s dla 95 percentyla w typowym zbiorze danych MVP.
- AI: w ≥ 70% przypadków użytkownik akceptuje co najmniej jedną z zaproponowanych kategorii lub koryguje je w ≤ 30 s.
- Bezpieczeństwo: publiczne widoki z noindex, brak incydentów nadużyć według prostych limitów oraz brak wycieków danych właściciela przez publiczny widok.
- Panel admina: logi rejestrują co najmniej utworzenie/edycję/usunięcie zasobów oraz informacje o użytkowniku i czasie.


