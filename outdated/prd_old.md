# Dokument wymagań produktu (PRD) - Shelves Organiser

## 1. Przegląd produktu

Shelves Organiser to webowa aplikacja umożliwiająca użytkownikom prywatnym szybką organizację i katalogowanie przedmiotów przechowywanych w pudełkach, regałach i pomieszczeniach. Aplikacja pozwala zarządzać hierarchią lokalizacji, generować kody QR dla pudełek, udostępniać zawartość publicznie oraz eksportować dane użytkownika.

## 2. Problem użytkownika

Użytkownicy tracą czas na ręczne wyszukiwanie pudełek w magazynach domowych lub garażach, gubią zawartość i nie mają centralnego narzędzia do katalogowania. Brakuje intuicyjnego interfejsu, który pozwoli szybko zlokalizować dowolny przedmiot według nazwy, tagów lub miejsca przechowywania.

## 3. Wymagania funkcjonalne

- System kont użytkowników: rejestracja (e-mail/hasło, opcjonalnie Apple), logowanie, zarządzanie profilem
- Zarządzanie hierarchią lokalizacji (do 4 poziomów) z pełnym CRUD dla każdego poziomu (np. Garaż → Regał → Półka)
- Zarządzanie pudełkami: CRUD pudełek w dowolnym poziomie hierarchii, unikalna nazwa/numer
- Zarządzanie przedmiotami: CRUD przedmiotów w pudełkach z nazwą, tagami i opisem (limit 10 000 znaków)
- Wyszukiwarka: szybkie wyszukiwanie przedmiotów po nazwie i tagach, opcjonalne filtrowanie po lokalizacji
- Generator kodów QR: generowanie unikalnego kodu QR prowadzącego do widoku zawartości pudełka
- Drukowanie etykiet: przygotowanie strony A4 z etykietami zawierającymi nazwę pudełka, lokalizację i kod QR
- Udostępnianie publiczne: generowanie anonimowego linku (UUID v4) do uproszczonej, publicznej listy przedmiotów w pudełku
- Eksport danych: eksport wszystkich danych użytkownika do formatu CSV odwzorowującego hierarchię
- Onboarding: kreator pierwszej lokalizacji i pudełka po rejestracji użytkownika
- Przenoszenie pudełek: możliwość przeniesienia pudełka między poziomami hierarchii

## 4. Granice produktu

- Funkcje AI rozpoznawania obiektów na zdjęciach realizowane w późniejszej wersji beta
- Współdzielenie lokalizacji między użytkownikami poza zakresem MVP
- Optymalizacja układu przedmiotów na półkach poza zakresem MVP
- Brak natywnej aplikacji mobilnej w MVP
- Limit opisu: przyjęto 10 000 znaków jako limit bezpieczeństwa (do weryfikacji)

## 5. Historyjki użytkowników

US-001  
Tytuł: Rejestracja konta  
Opis: Nowy użytkownik chce utworzyć konto, aby korzystać z aplikacji.  
Kryteria akceptacji:

- Formularz wymaga poprawnego adresu e-mail i hasła spełniającego minimalne kryteria bezpieczeństwa
- Po pomyślnej rejestracji użytkownik otrzymuje potwierdzenie e-mailem
- W przypadku niepoprawnego e-maila lub zbyt słabego hasła wyświetlany jest komunikat o błędzie

US-002  
Tytuł: Logowanie  
Opis: Użytkownik chce zalogować się do swojego konta, aby uzyskać dostęp do zasobów.  
Kryteria akceptacji:

- Użytkownik może zalogować się przy użyciu zarejestrowanego e-maila i hasła
- W przypadku błędnych danych wyświetlany jest komunikat o nieprawidłowych poświadczeniach
- Sesja użytkownika jest zachowana do wylogowania

US-003  
Tytuł: Zarządzanie kontem  
Opis: Zalogowany użytkownik chce zaktualizować swoje dane lub zmienić hasło.  
Kryteria akceptacji:

- Użytkownik może zmienić nazwę wyświetlaną i hasło po podaniu aktualnego hasła
- W przypadku nieprawidłowego hasła aktualizacji nie wykonuje się i wyświetla błąd

US-004  
Tytuł: CRUD hierarchii lokalizacji  
Opis: Użytkownik chce zarządzać poziomami lokalizacji (np. dodawać Garaż, Regał, Półkę).  
Kryteria akceptacji:

- Użytkownik może tworzyć, edytować, usuwać i wyświetlać do 4 poziomów lokalizacji
- Nie można usunąć lokalizacji zawierającej podpoziomy bez uprzedniego usunięcia ich lub przeniesienia
- Zmiany są natychmiast widoczne w interfejsie

US-005  
Tytuł: CRUD pudełek  
Opis: Użytkownik chce tworzyć, edytować, usuwać i przeglądać pudełka w wybranej lokalizacji.  
Kryteria akceptacji:

- Użytkownik może dodać pudełko z unikalną nazwą lub numerem
- Pudełko nie może mieć nazw powtarzających się w tej samej lokalizacji
- Usunięcie pudełka z zawartością wymaga potwierdzenia

US-006  
Tytuł: CRUD przedmiotów  
Opis: Użytkownik chce zarządzać przedmiotami wewnątrz pudełka.  
Kryteria akceptacji:

- Użytkownik może dodać przedmiot z nazwą, tagami i opisem (do 10 000 znaków)
- Możliwość edycji i usunięcia przedmiotów
- Walidacja długości opisu i unikalności nazwy w pudełku

US-007  
Tytuł: Wyszukiwanie przedmiotów  
Opis: Użytkownik chce znaleźć przedmiot po nazwie lub tagach.  
Kryteria akceptacji:

- Wyniki zwracają przedmioty pasujące do zapytania tekstowego
- Możliwość filtrowania wyników po lokalizacji
- Brak wyników wyświetla komunikat "Brak pasujących przedmiotów"

US-008  
Tytuł: Generowanie kodu QR  
Opis: Użytkownik chce wygenerować kod QR dla pudełka.  
Kryteria akceptacji:

- Kod QR wskazuje na skrócony link do widoku zawartości pudełka
- Kod można pobrać jako obraz SVG lub PNG

US-009  
Tytuł: Drukowanie etykiet  
Opis: Użytkownik chce wydrukować etykiety z kodem QR i opisem pudełka.  
Kryteria akceptacji:

- Etykiety są formatowane na stronę A4 (po 8 etykiet)
- Każda etykieta zawiera nazwę pudełka, pełną ścieżkę lokalizacji i kod QR

US-010  
Tytuł: Udostępnianie publiczne  
Opis: Użytkownik chce wygenerować anonimowy link do publicznego widoku zawartości pudełka.  
Kryteria akceptacji:

- Publiczny link jest oparty o UUID v4
- W widoku publicznym wyświetlane są tylko nazwy przedmiotów i opisy (do 10 000 znaków)
- Brak możliwości modyfikacji danych przez gościa

US-011  
Tytuł: Eksport danych  
Opis: Użytkownik chce pobrać wszystkie swoje dane w formacie CSV.  
Kryteria akceptacji:

- Plik CSV zawiera hierarchię lokalizacji, pudełka i listę przedmiotów
- Plik można pobrać jednym kliknięciem

US-012  
Tytuł: Onboarding  
Opis: Nowy użytkownik chce zostać przeprowadzony przez kreator dodania pierwszej lokalizacji i pudełka.  
Kryteria akceptacji:

- Kreator wyświetla kolejne kroki: dodaj lokalizację, dodaj pudełko
- Po zakończeniu kreatora użytkownik trafia na pulpit z widokiem hierarchii

US-013  
Tytuł: Przenoszenie pudełka  
Opis: Użytkownik chce zmienić lokalizację fizyczną pudełka w hierarchii.  
Kryteria akceptacji:

- Użytkownik wybiera nowe miejsce w hierarchii dla pudełka
- Po zatwierdzeniu pudełko jest wyświetlane w nowej lokalizacji

US-014  
Tytuł: Bezpieczny dostęp  
Opis: System wymaga uwierzytelnienia, aby chronić prywatne dane użytkownika.  
Kryteria akceptacji:

- Dostęp do większości funkcji jest możliwy tylko po zalogowaniu
- Nieautoryzowane żądania zwracają HTTP 401 Unauthorized

## 6. Metryki sukcesu

- Zaangażowanie użytkowników (MAU)
- Głębokość katalogowania: średnia liczba przedmiotów na aktywnego użytkownika
- Retencja 1-miesięczna po rejestracji
- Liczba wygenerowanych kodów QR i etykiet drukowanych miesięcznie
