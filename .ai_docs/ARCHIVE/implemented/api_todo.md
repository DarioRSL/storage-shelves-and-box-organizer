| Endpoint                                                 | Status      | Notes |
| -------------------------------------------------------- | ----------- | ----- |
| `GET /profiles/me`                                       | Done        |       |
| `POST /api/workspaces`                                   | Done        |       |
| `GET /api/workspaces`                                    | Done        |       |
| `GET /api/workspaces/:workspace_id/members`              | Done        |       |
| `POST /api/workspaces/:workspace_id/members`             | Done        |       |
| `PATCH /api/workspaces/:workspace_id/members/:user_id`   | Done        |       |
| `DELETE /api/workspaces/:workspace_id/members/:user_id`  | Done        |       |
| `GET /api/locations`                                     | Done        |       |
| `POST /api/locations`                                    | Done        |       |
| `PATCH /api/locations/:id`                               | Done        |       |
| `DELETE /api/locations/:id`                              | Done        |       |
| `GET /api/boxes`                                         | Done        |       |
| `GET /api/boxes/:id`                                     | Done        |       |
| `POST /api/boxes`                                        | Done        |       |
| `PATCH /api/boxes/:id`                                   | Done        |       |
| `DELETE /api/boxes/:id`                                  | Done        |       |
| `POST /api/qr-codes/batch`                               | Done        |       |
| `GET /api/qr-codes/:short_id`                            | Done        |       |

# Lista Zadań API

Poniższa lista przedstawia planowane endpointy API i ich stan implementacji na podstawie plików w `.ai_docs` oraz istniejącego kodu.

## Użytkownik i Profil

- [x] `GET /profiles/me` - Pobieranie profilu zalogowanego użytkownika.

## Workspaces (`/api/workspaces`)

- [x] `POST /api/workspaces` - Tworzenie nowej przestrzeni roboczej.
- [x] `GET /api/workspaces` - Pobieranie listy przestrzeni roboczych dla użytkownika.

## Workspace Members (`/api/workspaces/:workspace_id/members`)

- [x] `GET /api/workspaces/:workspace_id/members` - Pobieranie listy członków przestrzeni roboczej.
- [x] `POST /api/workspaces/:workspace_id/members` - Zapraszanie nowego członka do przestrzeni roboczej.
- [x] `PATCH /api/workspaces/:workspace_id/members/:user_id` - Aktualizacja roli członka.
- [x] `DELETE /api/workspaces/:workspace_id/members/:user_id` - Usunięcie członka z przestrzeni roboczej.

## Locations (`/api/locations`)

- [x] `GET /api/locations` - Pobieranie lokalizacji w przestrzeni roboczej.
- [x] `POST /api/locations` - Tworzenie nowej lokalizacji.
- [x] `PATCH /api/locations/:id` - Aktualizacja lokalizacji.
- [x] `DELETE /api/locations/:id` - Usunięcie lokalizacji.

## Boxes (`/api/boxes`)

- [x] `GET /api/boxes` - Wyszukiwanie i listowanie pudełek.
- [x] `GET /api/boxes/:id` - Pobieranie szczegółów pudełka.
- [x] `POST /api/boxes` - Tworzenie nowego pudełka.
- [x] `PATCH /api/boxes/:id` - Aktualizacja pudełka.
- [x] `DELETE /api/boxes/:id` - Usunięcie pudełka.

## QR Codes (`/api/qr-codes`)

- [x] `POST /api/qr-codes/batch` - Generowanie partii kodów QR.
- [x] `GET /api/qr-codes/:short_id` - Rozpoznawanie zeskanowanego kodu QR.

---
*Lista wygenerowana automatycznie.*

