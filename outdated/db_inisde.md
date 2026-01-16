```markdown
<conversation_summary>

<decisions>
1. Użycie jednej tabeli `locations` z kolumnami `id`, `parent_id`, `level` (CHECK 1–4), `name`, `user_id`, `created_at`, `updated_at`.  
2. Trigger z rekurencyjnym CTE blokujący cykle w hierarchii `locations`.  
3. Kolumna `public_uuid UUID UNIQUE DEFAULT gen_random_uuid()` w tabeli `boxes`.  
4. Przechowywanie `items.tags` jako `TEXT[]` z indeksem GIN.  
5. Dodanie kolumny `tsv tsvector` i indeksu GIN do szybkiego full-text search po `name` i `tags`.  
6. Unikalne indeksy kompozytowe: `(user_id, location_id, name)` dla `boxes` i `(user_id, box_id, name)` dla `items`.  
7. Kolumna `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` we wszystkich tabelach oraz B-Tree index na `user_id`.  
8. Polityki RLS: dostęp do `locations`, `boxes`, `items` tylko gdy `user_id = auth.uid()`, plus SELECT po `public_uuid` dla udostępnionych pudełek.  
9. `description TEXT` z ograniczeniem `CHECK (char_length(description) <= 10000)` w `items`.  
10. Przenoszenie pudełka w jednej transakcji z `SELECT … FOR UPDATE` na docelowej `location`.  
11. Brak partycjonowania tabel w MVP; monitorowanie rozmiaru i ewentualne wprowadzenie później.  
12. Klucze FK z `ON DELETE RESTRICT` na zależnościach `locations→boxes` i `boxes→items`.  
13. Eksport CSV synchroniczny (<10 000 wierszy) przez widok z rekursywnym CTE i `COPY … TO CSV`.  
14. Tymczasowe odłożenie użycia `ltree`; self-FK wystarczające.  
15. Automatyzacja onboardingu za pomocą funkcji/triggera po rejestracji tworzącego pierwszą `location` i `box`.  
16. Dynamiczne generowanie kodów QR poza bazą; przechowywanie tylko `public_uuid`.  
17. Tabela `events(id, user_id, event_type, payload, created_at)` z indeksami na `user_id` i `event_type` do metryk i audytu.  
18. Kolumny `created_at` i `updated_at` `TIMESTAMPTZ DEFAULT now()` we wszystkich tabelach.  
19. Soft-delete (`deleted_at`) odłożony na przyszłość.  
20. Optymistyczna blokada odłożona — transakcje i monitorowanie wystarczą.  
21. Szacowane wolumeny: ~20–30 pudełek i ~60 wpisów hierarchii na użytkownika, <30 użytkowników.  
22. Eksport CSV synchroniczny.  
23. Audit log realizowany przez tabelę `events`; pełne historyczne logi później.  
24. Surowy `TEXT` dla opisów; renderowanie i sanitizacja w frontendzie.  
25. Wszystkie znaczniki czasu jako `TIMESTAMPTZ` w UTC.  
26. Brak `created_by`/`updated_by` — wystarczy `user_id` + znaczniki czasu.  
27. Stały `public_uuid` dla udostępnień; wersjonowanie i wygasające linki w przyszłej tabeli `box_shares`.  
28. Cache wyszukiwania w aplikacji (Redis); GIN index w bazie wystarczy.  
29. Monitoring wydajności z `pg_stat_statements` i metrykami CI/CD.  
30. Pojedynczy tenant = `user_id`; organizacje (`org_id`) planowane później.  
31. GDPR/RODO: rozważyć `deleted_at` i procedury usuwania danych na żądanie.
</decisions>

<matched_recommendations>

1. Jedna tabela `locations` z self-FK i poziomem.
2. Trigger z rekurencyjnym CTE do zapobiegania cyklom.
3. `public_uuid` w `boxes` + przyszła tabela `box_shares`.
4. `TEXT[]` + GIN dla `items.tags`.
5. `tsvector` + GIN dla full-text search.
6. Kompozytowe unikalne indeksy na nazwy.
7. `user_id` FK do `auth.users` + RLS.
8. `TEXT` z `CHECK` dla limitu opisu.
9. Transakcje z `FOR UPDATE` przy przenoszeniu pudełek.
10. Wykorzystanie widoku z CTE i `COPY … TO CSV`.
11. Tabela `events` do metryk i audytu.
12. `created_at`/`updated_at` jako `TIMESTAMPTZ`.
13. Brak partycjonowania i optymistycznej blokady w MVP.
14. Automatyzacja onboardingu triggerem.
    </matched_recommendations>

<database_planning_summary>
Schemat PostgreSQL (Supabase) dla MVP:

- Encje: `locations`, `boxes`, `items`, `events` (opcja `box_shares`).
- Relacje: self-FK w `locations`, `boxes.location_id → locations.id`, `items.box_id → boxes.id`.
- Klucze: `user_id` FK do `auth.users` we wszystkich tabelach, kompozytowe unikalne indeksy na nazwy.
- Atrybuty: `id UUID`, `name TEXT`, `description TEXT(≤10000)`, `tags TEXT[]`, `tsv tsvector`, `public_uuid UUID`, `created_at/updated_at TIMESTAMPTZ`.
- Indeksy: B-Tree na `user_id`, GIN na `tags` i `tsv`.
- RLS: wiersze widoczne tylko dla właściciela (`auth.uid()`), plus SELECT po `public_uuid`.
- Operacje krytyczne: przenoszenie pudełek w transakcji z `FOR UPDATE`, onboarding triggerem, dynamiczne kodowanie QR.
- Eksport CSV synchroniczny (<10 000 wierszy) przez widok CTE + `COPY`.
- Metryki/audyt: tabela `events`.
- Daty: `TIMESTAMPTZ` UTC.
- MVP bez partycjonowania, soft-delete, optymistycznej blokady i `ltree`; planowane w przyszłości.
  </database_planning_summary>

<unresolved_issues>

- Dokładna implementacja triggera do zapobiegania cyklom w `locations`.
- Precyzyjny schemat tabeli `events` (lista event_type, struktura payload).
- Procedury backup/retencji i usuwania danych zgodnie z GDPR/RODO.
  </unresolved_issues>

</conversation_summary>
```
