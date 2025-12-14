# Setup Supabase Integration

Create the necessary file structure for integrating Supabase with this Astro project.

## Prerequisites Check

Before performing actions, verify:
- Project uses Astro 5, TypeScript 5, React 19, and Tailwind 4
- `@supabase/supabase-js` package is installed
- `/supabase/config.toml` exists
- `/src/db/database.types.ts` exists with correct type definitions

If prerequisites are not met, stop and ask the user to fix them.

## File Structure to Create

### 1. Supabase Client (`/src/db/supabase.client.ts`)

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
export type SupabaseClient = typeof supabaseClient;
```

### 2. Middleware (`/src/middleware/index.ts`)

```ts
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

### 3. TypeScript Environment Definitions (`src/env.d.ts`)

```ts
/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client.ts';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Action

Create or update the three files above, then confirm completion.
