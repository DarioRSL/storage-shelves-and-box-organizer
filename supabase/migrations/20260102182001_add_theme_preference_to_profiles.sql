/*
  # Add Theme Preference to Profiles

  ## Purpose
  This migration adds a `theme_preference` column to the `public.profiles` table
  to store user's preferred theme mode (light, dark, or system) globally across
  the entire application.

  ## Changes
  1. Add `theme_preference` column to `public.profiles` table
     - Type: text (stores 'light', 'dark', or 'system')
     - Default: 'system' (respects user's OS preference)
     - Constraint: Must be one of the three valid values

  ## Affected Tables
  - `public.profiles`

  ## Security
  - No RLS policy changes needed (existing policies already cover this column)
  - Users can only update their own profile via existing `authenticated` policies

  ## Notes
  - Existing users will default to 'system' theme
  - This column will be synced with localStorage for fast initial render
  - Backend API will validate and persist changes to this column
*/

-- Add theme_preference column to profiles table
alter table public.profiles
add column theme_preference text not null default 'system'
check (theme_preference in ('light', 'dark', 'system'));

comment on column public.profiles.theme_preference is 'User theme preference: light, dark, or system';
