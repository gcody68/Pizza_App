/*
  # Add duration_minutes to menu_items

  ## Summary
  Adds an optional `duration_minutes` integer column to `menu_items`.
  Used by salon tenants to indicate how long each service takes (e.g. 25, 60, 90).
  Null = no duration set (restaurant mode). Default null so existing rows are unaffected.
*/

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT NULL;
