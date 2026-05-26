/*
  # Add processing_gap_minutes to menu_items

  Adds an optional integer column `processing_gap_minutes` to `menu_items`.

  ## Purpose
  Enables salons to define a "processing gap" for chemical services (e.g., color, keratin).
  When set, the booking calendar renders a dashed processing-time block after the primary
  service block, during which a stylist is free to take a quick secondary appointment (trim,
  blowout, etc.). A value of NULL means no processing gap — the full duration is occupied.

  ## Changes
  - `menu_items.processing_gap_minutes` (integer, nullable, default NULL)
    — Minutes of unattended processing time within the total service duration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'processing_gap_minutes'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN processing_gap_minutes integer DEFAULT NULL;
  END IF;
END $$;
