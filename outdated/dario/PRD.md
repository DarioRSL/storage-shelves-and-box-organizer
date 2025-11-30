# Aplikacja - Shelves Organiser (MVP)

## 1. Główny problem
Oraganizacje i skatalogowanie rzeczy przechowywanych w boxach, piwnicach, komórkach, grażach. Dzięki wykorzystaniu przypisaniu numerów do racków i półek mozna szybko znajdywać zawartość lokazizację pudeł, szaf, boxów poprzez GUI. Każde pudło/box może mieć wygenerowany kod QR który pozwoli online listować jego zawartość i odnadywać dokładną lokalizację.

## 2. Problem użytkownika

Użytkownicy przechowują rzeczy w pudełkach, piwnicach i garażach bez spójnego systemu, przez co tracą czas na szukanie i często nie wiedzą, co gdzie leży. Brakuje im szybkiego sposobu identyfikacji zawartości i dokładnej lokalizacji pudełka bez fizycznego przeglądania. Aplikacja rozwiązuje ten problem, wprowadzając prostą hierarchię lokalizacji (budynek → pomieszczenie → regał → półka), opisy i tagi dla pudełek, publiczne kody QR oraz wstępną kategoryzację AI na podstawie zdjęcia. Dzięki temu użytkownik w kilka sekund odnajduje właściwe pudełko i jego zawartość z dowolnego urządzenia.


## 3. Wymagania funkcjonalne
- CRUD dla Hierarchia lokalizacji: budynek → pomieszczenie → regał → półka.
- Zarządzanie pudełkami/boxami (CRUD) z opisem (Model danych: najmniejszą jednostką jest pudełko/box, elementy wewnątrz nie są osobnymi encjami, opis pudełka jako tekst/markdown do 10000 znaków.).
- nadawanie "friendly name" dla pudełek i elementów heierarchii np "komoda babci", 
- Identyfikatory: UUID v4 generowane po stronie backendu; używane w URL/QR; brak danych jawnych (anonimizacja).
- Dostęp do QR: prywatny w MVP; w przyszłości przełącznik udostępniania per pudełko.
- Podstawowe wyszukiwanie/przeglądanie pudełek po lokalizacji i tagach.
- Konta: samodzielna rejestracja użytkowników; bez weryfikacji e-mail/CAPTCHA w MVP.
- Upload obrazów: formaty jpg/png/heic; max 3 MB; max 1200×1200; obrazy usuwane po analizie.
- Tagi: hashtagi nadawane przez użytkownika; limit 30 znaków/tag; max 10 tagów/pudełko; moderacja w późniejszym etapie.
- Model danych: najmniejszą jednostką jest pudełko/box; elementy wewnątrz nie są osobnymi encjami; opis pudełka jako tekst/markdown do 10000 znaków.
- Role: trzy role – odczyt, pełny dostęp, administrator systemu.
- QR: generacja pojedyncza na żądanie; brak regeneracji i historii linków w MVP.
- Baza i auth: PostgreSQL na Supabase; logowanie przez Supabase Auth.
- AI rozpoznawanie: tylko ogólne kategorie; użytkownik może korygować wyniki po analizie zdjęcia.
- Dostawca AI: OpenRouter; limity kosztów zdefiniowane później.
- Panel admina: przewidziany; zakres MVP ograniczony do logów.

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Rejestracja i logowanie użytkownika
Opis: Jako nowy użytkownik chcę założyć konto i zalogować się, aby móc korzystać z aplikacji.
Kryteria akceptacji:
- Formularz rejestracji przyjmuje e-mail i hasło; po poprawnym wypełnieniu tworzony jest profil użytkownika.
- Logowanie umożliwia dostęp do aplikacji bez dodatkowej weryfikacji e-mail/CAPTCHA (w MVP).
- Po zalogowaniu widoczny jest stan roli użytkownika (odczyt/pełny/admin).
- Wylogowanie kończy sesję i uniemożliwia dostęp do zasobów wymagających autoryzacji.

ID: US-002
Tytuł: Zarządzanie hierarchią lokalizacji
Opis: Jako użytkownik z pełnym dostępem chcę tworzyć i edytować budynki, pomieszczenia, regały i półki, aby uporządkować przestrzeń.
Kryteria akceptacji:
- Można dodać/edytować/usunąć: budynek, pomieszczenie, regał, półkę (CRUD).
- Walidacja: nie można usunąć poziomu, jeśli posiada podrzędne elementy lub przypisane pudełka (komunikat z instrukcją).
- Ścieżka lokalizacji prezentowana jest w formie breadcrumb: Budynek > Pomieszczenie > Regał > Półka.
- Użytkownik z rolą odczyt nie ma dostępu do akcji CRUD (przyciski nieaktywne lub ukryte).

ID: US-003
Tytuł: Utworzenie pudełka i przypisanie do półki
Opis: Jako użytkownik z pełnym dostępem chcę utworzyć pudełko, przypisać je do konkretnej półki oraz dodać opis i tagi.
Kryteria akceptacji:
- Pudełko posiada UUID v4 jako identyfikator; nazwa (opcjonalnie), opis w markdown/plain do 2000 znaków.
- Tagi dodawane jako hashtagi; maks. 10 tagów; każdy tag do 30 znaków; walidacja formatu.
- Pudełko musi być przypisane do konkretnej półki (wymagane pole).
- Użytkownik z rolą odczyt nie może utworzyć/edytować pudełka.

ID: US-004
Tytuł: Przesyłanie zdjęcia pudełka i kategoryzacja AI z korektą
Opis: Jako użytkownik z pełnym dostępem chcę przesłać zdjęcie pudełka, otrzymać ogólne kategorie od AI i móc je skorygować.
Kryteria akceptacji:
- Obsługiwane formaty: jpg, png, heic; max rozmiar 3 MB; max rozdzielczość 1200×1200 (większe są skalowane lub odrzucane).
- Po przetworzeniu zwracane są propozycje kategorii; użytkownik może je edytować przed zapisaniem.
- Po zapisie propozycje/korekty są utrwalone przy pudełku; obraz jest usuwany po analizie (nie przechowujemy pliku).
- Błędy przesyłania/przetwarzania są komunikowane użytkownikowi w czytelnej formie.

ID: US-005
Tytuł: Generowanie publicznego linku i kodu QR do pudełka
Opis: Jako użytkownik z pełnym dostępem chcę wygenerować publiczny link i kod QR do widoku pudełka, aby łatwo je odnaleźć.
Kryteria akceptacji:
- Generowany jest pojedynczy publiczny URL zawierający wyłącznie UUID v4 (brak jawnych danych).
- Wyświetlany jest kod QR, który po zeskanowaniu otwiera publiczny widok pudełka bez logowania.
- Publiczny widok prezentuje: nazwę/identyfikator, opis, tagi, ścieżkę lokalizacji (bez danych wrażliwych o właścicielu).
- W MVP brak historii/regeneracji linków; można wygenerować link jednorazowo na żądanie.

ID: US-006
Tytuł: Wyszukiwanie i filtrowanie pudełek po lokalizacji i tagach
Opis: Jako zalogowany użytkownik chcę filtrować pudełka po hierarchii lokalizacji i tagach, aby szybko znaleźć właściwe pudełko.
Kryteria akceptacji:
- Filtrowanie po: budynek, pomieszczenie, regał, półka oraz po tagach (wielokrotny wybór).
- Wyniki są paginowane i sortowalne (np. po dacie utworzenia, nazwie).
- Wpisanie tagu w polu wyszukiwania podpowiada istniejące tagi (autocomplete).
- W przypadku braku wyników wyświetlany jest czytelny komunikat i sugestie zawężenia filtrów.

ID: US-007
Tytuł: Podgląd logów administracyjnych
Opis: Jako administrator chcę przeglądać logi zdarzeń w systemie, aby monitorować podstawową aktywność użytkowników.
Kryteria akceptacji:
- Lista logów zawiera: typ akcji (utworzenie/edycja/usunięcie), typ zasobu, identyfikator, użytkownika i znacznik czasu.
- Dostęp do widoku logów ma wyłącznie rola administrator.
- Logi są tylko do odczytu; brak możliwości edycji lub usuwania wpisów w MVP.
- Możliwe jest filtrowanie logów po typie akcji i zakresie dat.


## 5. Kryteria sukcesu i mierzenie:
- Jako administrator przeglądam logi systemowe, aby monitorować aktywność.
- Działająca aplikacja webowa z wdrożeniem (deploy) i możliwością rejestracji/logowania.
- Możliwość stworzenia pełnej ścieżki lokalizacji, dodania pudełka, uploadu zdjęcia, otrzymania propozycji kategorii i ręcznej korekty.
- Generowanie i skanowanie QR prowadzi do właściwego widoku pudełka (publiczny dostęp).
- Podstawowe wyszukiwanie po lokalizacji i tagach działa poprawnie.

</prd_planning_summary>
<unresolved_issues>
RBAC i RLS w Supabase: dokładne mapowanie ról (odczyt/pełny/admin) na polityki i uprawnienia.

## 4. Granice produktu
1. Poza zakresem MVP:
- Publiczne QR: polityka indeksowania (robots), ewentualna blokada listowania/zgadywania, limity i ochrona przed nadużyciami.
- Wymogi przeglądarek/urządzeń oraz minimalne standardy dostępności (a11y).
- Polityka prywatności i retencji danych obrazów (czas trwania, dowody usunięcia).
- Szczegóły logowania zdarzeń (jakie akcje, retencja, prywatność).
- Wymagania dotyczące wyszukiwania (filtrowanie wielokryterialne, paginacja, sortowanie).
- Ewentualny mechanizm odwołania/wycofania dostępu do linku/QR (revocation) w przyszłości.
Zakres panelu admina poza logami (czy CRUD lokalizacji/użytkowników ma być w panelu czy w standardowym UI).

Strategia testów: kiedy i jak zdefiniować scenariusze e2e; minimalny zestaw krytycznych ścieżek do automatyzacji.



</unresolved_issues>
</conversation_summary>