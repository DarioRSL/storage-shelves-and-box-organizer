# API Endpoint Implementation Plan: GET /profiles/me

## 1. Endpoint Overview
This endpoint retrieves the profile data of the currently authenticated user. It is a protected endpoint that returns detailed user information, such as full name, email address, and avatar URL, based on the active user session.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/profiles/me`
- **Parameters**:
  - **Required**: None.
  - **Optional**: None.
- **Request Body**: None.
- **Headers**:
  - `Authorization`: `Bearer <SUPABASE_JWT>` (Required for authentication)

## 3. Utilized Types
- **Response DTO**: `ProfileDto` from `src/types.ts`.
  ```typescript
  export type ProfileDto = {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
  };
  ```

## 4. Response Details
- **Success Response (200 OK)**:
  ```json
  {
    "id": "uuid-string-here",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.png",
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-27T10:00:00Z"
  }
  ```
- **Error Responses**:
  - **401 Unauthorized**: If the user is not authenticated.
  - **404 Not Found**: If the user is authenticated, but no corresponding record exists in the `profiles` table.
  - **500 Internal Server Error**: For server-side errors (e.g., a database query error).

## 5. Data Flow
1.  A `GET` request is sent to `/api/profiles/me`.
2.  The Astro middleware (`src/middleware/index.ts`) intercepts the request, verifies the JWT, and attaches the user session to `context.locals`.
3.  The `GET` handler in `src/pages/api/profiles/me.ts` is executed.
4.  It checks if `context.locals.session.user` exists. If not, it returns a `401 Unauthorized`.
5.  It calls a service method, e.g., `ProfileService.getProfileForUser(userId)`, passing the user ID from the session.
6.  The `ProfileService` (`src/lib/services/profile.service.ts`) executes a query against the Supabase database to fetch the record from the `public.profiles` table where the `id` matches the authenticated user's ID.
7.  If the profile is not found, the service returns `null` or throws a `NotFound` error.
8.  The API handler formats the retrieved profile using the `ProfileDto` and sends it as a JSON response with a `200 OK` status.

## 6. Security Considerations
- **Authentication**: Access is strictly limited to authenticated users. The Astro middleware is responsible for JWT validation. The endpoint handler must additionally confirm the session's existence.
- **Authorization**: Users can only access their own profile. The business logic must ensure the database query filters records based on the `auth.uid()` from the JWT session, which is further enforced by Row Level Security (RLS) policies in Supabase.
- **Data Validation**: There is no user input to validate.

## 7. Error Handling
- **Not Authenticated**: If `context.locals.session` or `context.locals.session.user` is `null`, the endpoint will immediately return a `401 Unauthorized` response.
- **Profile Not Found**: If the database query returns no results for the given `userId`, the endpoint will return a `404 Not Found` response with an error message.
- **Database Errors**: Any errors thrown by the Supabase client during the query (e.g., connection issues, RLS errors) should be logged on the server-side and result in a `500 Internal Server Error` response.

## 8. Performance
- **Database Queries**: The endpoint performs a single, simple `SELECT` query on the `profiles` table using the primary key (`id`). This is a highly performant operation.
- **Indexing**: The `id` column in the `profiles` table is the primary key, ensuring it is indexed by default for fast lookups.
- **Payload Size**: The response contains data for only one profile, resulting in a small and efficient JSON payload.

## 9. Implementation Steps
1.  **Create API File**: Create a new file at `src/pages/api/profiles/me.ts`.
2.  **Implement GET Handler**:
    - Add `export const prerender = false;`.
    - Implement the `export async function GET({ context }: APIContext)` function.
    - Check for the existence of `context.locals.session.user`. If `null`, return `401`.
    - Get the `userId` from `context.locals.session.user.id`.
3.  **Create Profile Service**:
    - Create a new file at `src/lib/services/profile.service.ts`.
    - Implement a `ProfileService` class with a method `getProfile(supabase: SupabaseClient, userId: string): Promise<ProfileDto | null>`.
    - This method should execute the Supabase query: `supabase.from('profiles').select('*').eq('id', userId).single()`.
4.  **Integrate Service with API**:
    - In the `GET` handler in `me.ts`, call `ProfileService.getProfile()`.
    - Pass `context.locals.supabase` and `userId` to the service method.
5.  **Handle Responses and Errors**:
    - If the service returns a profile, respond with a `200 OK` status and the profile data.
    - If the service returns `null` (or a `PGRST116` error from Supabase), respond with a `404 Not Found` status.
    - Wrap the service call in a `try...catch` block to handle unexpected errors and respond with a `500 Internal Server Error`.
6.  **Add Tests (Optional)**: Create unit tests for the `ProfileService` and integration tests for the API endpoint to verify correct behavior, error handling, and security.