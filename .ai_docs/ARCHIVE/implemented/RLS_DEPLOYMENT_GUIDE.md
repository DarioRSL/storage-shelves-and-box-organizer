# RLS Deployment Guide - Production Migration

**Status:** ⏳ Przygotowane do wdrożenia produkcyjnego
**Migration File:** `supabase/migrations/20260106200458_enable_rls_policies.sql`
**Target:** Production Supabase Database
**Created:** 2026-01-06

## Przegląd

Ten dokument zawiera instrukcje wdrożenia Row Level Security (RLS) policies do produkcyjnej bazy danych Supabase.

## ⚠️ OSTRZEŻENIA PRZED WDROŻENIEM

### KRYTYCZNE - Przeczytaj przed wykonaniem

1. **Backup Database:** Przed migracją ZAWSZE wykonaj pełny backup produkcyjnej bazy danych
2. **Maintenance Window:** Wdrożenie RLS wymaga krótkiego przestoju (~5-10 minut)
3. **Testing Required:** Migracja MUSI być przetestowana na staging przed produkcją
4. **Rollback Plan:** Przygotuj plan wycofania zmian (patrz sekcja Rollback)
5. **User Impact:** Po włączeniu RLS użytkownicy nie będą mogli uzyskać dostępu do danych innych workspace'ów

## Pre-Deployment Checklist

### 1. Weryfikacja środowiska

- [ ] **Backup wykonany:** Full database backup w Supabase Dashboard
- [ ] **Staging przetestowany:** Migracja zastosowana i przetestowana na staging
- [ ] **Team powiadomiony:** Wszyscy członkowie zespołu wiedzą o planowanej migracji
- [ ] **Monitoring aktywny:** Systemy monitoringu działają (jeśli skonfigurowane)
- [ ] **Rollback plan gotowy:** Dokumentacja wycofania przygotowana

### 2. Weryfikacja danych

```sql
-- Sprawdź liczbę rekordów w kluczowych tabelach
SELECT 'workspaces' as table_name, count(*) as row_count FROM workspaces
UNION ALL
SELECT 'workspace_members', count(*) FROM workspace_members
UNION ALL
SELECT 'boxes', count(*) FROM boxes
UNION ALL
SELECT 'locations', count(*) FROM locations
UNION ALL
SELECT 'qr_codes', count(*) FROM qr_codes
UNION ALL
SELECT 'profiles', count(*) FROM profiles;
```

**Zapisz wyniki** - użyjemy ich do weryfikacji po migracji.

### 3. Sprawdź istniejące RLS

```sql
-- Czy RLS jest już włączony?
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('workspaces', 'workspace_members', 'locations', 'boxes', 'qr_codes', 'profiles');
```

**Oczekiwany wynik:** Wszystkie tabele powinny mieć `rowsecurity = false` (jeśli to pierwsza migracja RLS).

## Deployment Procedure

### Krok 1: Maintenance Mode (Opcjonalnie)

Jeśli aplikacja ma maintenance mode, włącz go przed migracją:

```bash
# Przykład - dostosuj do swojej infrastruktury
# Można też zmienić DNS na stronę maintenance
```

### Krok 2: Aplikacja migracji przez Supabase CLI

**Opcja A: Przez Supabase Dashboard (Zalecane dla produkcji)**

1. Przejdź do Supabase Dashboard → Twój projekt → SQL Editor
2. Otwórz nowy query
3. Skopiuj całą zawartość `supabase/migrations/20260106200458_enable_rls_policies.sql`
4. Wklej do SQL Editor
5. **PRZEJRZYJ UWAŻNIE** całą treść migracji
6. Kliknij "Run" (uruchom query)

**Opcja B: Przez Supabase CLI (Wymaga linku do projektu)**

```bash
# 1. Link do production project (jeśli nie zrobiono wcześniej)
npx supabase link --project-ref <your-production-project-ref>

# 2. Zastosuj migrację
npx supabase db push

# Alternatywnie, push konkretnej migracji
npx supabase db push --file supabase/migrations/20260106200458_enable_rls_policies.sql
```

**Opcja C: Przez psql (Bezpośrednie połączenie)**

```bash
# 1. Pobierz connection string z Supabase Dashboard
# Database Settings → Connection String → Direct connection (psql)

# 2. Połącz się z bazą
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# 3. Wykonaj migrację
\i supabase/migrations/20260106200458_enable_rls_policies.sql

# 4. Wyjdź
\q
```

### Krok 3: Weryfikacja RLS

**A. Sprawdź czy RLS jest włączony:**

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('workspaces', 'workspace_members', 'locations', 'boxes', 'qr_codes', 'profiles');
```

**Oczekiwany wynik:** Wszystkie 6 tabel powinny mieć `rowsecurity = true`

**B. Sprawdź policies:**

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Oczekiwany wynik:** 22+ policies (4 na większość tabel, 2 dla profiles)

**C. Sprawdź helper function:**

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_workspace_member';
```

**Oczekiwany wynik:** 1 row - funkcja `is_workspace_member` istnieje

### Krok 4: Smoke Tests (Szybkie testy funkcjonalne)

**Test 1: Użytkownik może zalogować się i zobaczyć swoje workspace'y**

```bash
# Zaloguj się do aplikacji jako normalny użytkownik
# Sprawdź czy:
# - Możesz zobaczyć swoje workspace'y
# - Możesz zobaczyć swoje boxy
# - Możesz utworzyć nowy box
```

**Test 2: Cross-workspace isolation (Wymaga 2 użytkowników)**

Jeśli masz dostęp do 2 kont testowych w produkcji:

```sql
-- Zaloguj się jako User A w SQL Editor (ustaw JWT w Supabase Dashboard)
-- Spróbuj odczytać workspace User B
SELECT * FROM workspaces WHERE id = '<user-b-workspace-id>';
-- Powinno zwrócić 0 rows
```

### Krok 5: Sprawdź metryki

```sql
-- Liczba rekordów po migracji (porównaj z Pre-Deployment)
SELECT 'workspaces' as table_name, count(*) as row_count FROM workspaces
UNION ALL
SELECT 'workspace_members', count(*) FROM workspace_members
UNION ALL
SELECT 'boxes', count(*) FROM boxes
UNION ALL
SELECT 'locations', count(*) FROM locations
UNION ALL
SELECT 'qr_codes', count(*) FROM qr_codes
UNION ALL
SELECT 'profiles', count(*) FROM profiles;
```

**Weryfikuj:** Liczby powinny być identyczne jak przed migracją.

### Krok 6: Wyłącz Maintenance Mode

Jeśli włączyłeś maintenance mode, wyłącz go teraz.

## Post-Deployment Monitoring

### Pierwsze 30 minut

Monitoruj:

- **Error rate w aplikacji:** Czy użytkownicy zgłaszają błędy 403 Forbidden?
- **API response times:** Czy RLS spowolnił zapytania?
- **User login success rate:** Czy użytkownicy mogą się zalogować?
- **Database CPU/Memory:** Czy RLS zwiększył zużycie zasobów?

### Pierwsze 24 godziny

- **User feedback:** Czy są zgłoszenia o brakujących danych?
- **Error logs:** Czy są nowe błędy w logach aplikacji?
- **Database performance:** Czy czas odpowiedzi jest akceptowalny?

## Rollback Plan

### Scenariusz 1: Błędy RLS - Użytkownicy nie mogą uzyskać dostępu do własnych danych

**Przyczyna:** Błąd w policy logic

**Szybkie rozwiązanie:**

```sql
-- Tymczasowo wyłącz RLS na problematycznych tabelach
ALTER TABLE boxes DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

-- To przywraca pełny dostęp - użyj TYLKO w nagłych przypadkach
```

**Długoterminowe rozwiązanie:**

1. Zidentyfikuj błędną policy
2. Popraw policy
3. Przetestuj na staging
4. Zastosuj poprawkę na produkcji
5. Włącz RLS ponownie

### Scenariusz 2: Pełny rollback - Usuń wszystkie RLS policies

⚠️ **UWAGA:** Użyj TYLKO jeśli RLS powoduje krytyczne problemy

```sql
-- 1. Wyłącz RLS na wszystkich tabelach
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE boxes DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Usuń wszystkie policies
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can remove members" ON workspace_members;

DROP POLICY IF EXISTS "Users can view locations in their workspaces" ON locations;
DROP POLICY IF EXISTS "Workspace members can create locations" ON locations;
DROP POLICY IF EXISTS "Workspace members can update locations" ON locations;
DROP POLICY IF EXISTS "Workspace members can delete locations" ON locations;

DROP POLICY IF EXISTS "Users can view boxes in their workspaces" ON boxes;
DROP POLICY IF EXISTS "Workspace members can create boxes" ON boxes;
DROP POLICY IF EXISTS "Workspace members can update boxes" ON boxes;
DROP POLICY IF EXISTS "Workspace members can delete boxes" ON boxes;

DROP POLICY IF EXISTS "Users can view QR codes in their workspaces" ON qr_codes;
DROP POLICY IF EXISTS "Workspace members can generate QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Workspace members can update QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Workspace owners can delete QR codes" ON qr_codes;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 3. Usuń helper function
DROP FUNCTION IF EXISTS is_workspace_member(uuid);
```

**Po rollback:**

1. Zidentyfikuj przyczynę problemu
2. Napraw migrację
3. Przetestuj na staging ponownie
4. Zaplanuj nową datę wdrożenia

## Znane problemy i rozwiązania

### Problem 1: "permission denied for function is_workspace_member"

**Przyczyna:** Brak uprawnień EXECUTE dla authenticated users

**Rozwiązanie:**

```sql
GRANT EXECUTE ON FUNCTION is_workspace_member(uuid) TO authenticated;
```

### Problem 2: RLS zwalnia zapytania

**Przyczyna:** RLS policies wymagają dodatkowych JOIN'ów

**Rozwiązanie:**

1. Sprawdź czy istnieją indeksy na `workspace_id` (powinny być)
2. Rozważ użycie materialized views dla często używanych zapytań
3. Monitor query performance z `EXPLAIN ANALYZE`

### Problem 3: Superuser bypass RLS (podczas testowania)

**Przyczyna:** Postgres superuser pomija RLS

**Rozwiązanie:**
Użyj prawdziwego użytkownika authenticated (nie postgres) do testów.

## Staging Environment Setup

Przed wdrożeniem na produkcję:

### 1. Utwórz staging project w Supabase

```bash
# Link do staging
npx supabase link --project-ref <your-staging-project-ref>

# Push migrations
npx supabase db push
```

### 2. Skopiuj dane testowe

```sql
-- Kopiuj próbkę danych z produkcji (bez wrażliwych informacji)
-- Lub utwórz testowe dane
```

### 3. Przetestuj zgodnie z RLS_TESTING_GUIDE.md

Wykonaj wszystkie 13 testów z `RLS_TESTING_GUIDE.md`

## Timeline wdrożenia

**Szacowany czas:**

- Backup: 5 minut
- Migracja: 2-3 minuty
- Weryfikacja: 5 minut
- Smoke tests: 10 minut
- **Total:** ~25 minut (including buffer)

**Zalecane okno maintenance:**

- 30 minut w godzinach najmniejszego ruchu (np. 2:00 AM - 2:30 AM lokalnego czasu)

## Support & Escalation

**Jeśli coś pójdzie nie tak:**

1. **Natychmiast:** Wykonaj rollback (patrz Rollback Plan)
2. **W ciągu 5 minut:** Powiadom zespół
3. **W ciągu 15 minut:** Zidentyfikuj root cause
4. **W ciągu 30 minut:** Zdecyduj: fix forward lub pozostań w rollback

## Kontakt

**W razie pytań lub problemów:**

- GitHub Issue: #93 (Integration Tests for RLS Policies)
- Documentation: `.ai_docs/RLS_TESTING_GUIDE.md`
- Supabase Docs: <https://supabase.com/docs/guides/auth/row-level-security>

---

**Last Updated:** 2026-01-06
**Version:** 1.0
**Status:** Ready for Staging Deployment
