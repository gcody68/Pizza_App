/*
  # Staff Profiles: Weekly Availability & Color Index

  ## Changes
  1. `staff_profiles.weekly_availability` (jsonb, nullable, default NULL)
     Stores a per-day schedule map:
     { "Mon": { "enabled": true, "start": "09:00", "end": "17:00" }, "Tue": {...}, ... }
     NULL means "use business defaults / no restriction set".

  2. `staff_profiles.color_index` (integer, nullable, default NULL)
     Stores the palette index so colors stay consistent across sessions
     without requiring a full hex string. The UI derives the hex from
     the index in AVATAR_COLORS[].

  Both columns are additive — no existing data is affected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_profiles' AND column_name = 'weekly_availability'
  ) THEN
    ALTER TABLE staff_profiles ADD COLUMN weekly_availability jsonb DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_profiles' AND column_name = 'color_index'
  ) THEN
    ALTER TABLE staff_profiles ADD COLUMN color_index integer DEFAULT NULL;
  END IF;
END $$;
