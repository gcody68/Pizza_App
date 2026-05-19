/*
  # Reseed demo_menu_items as Loomis Salon services

  ## Summary
  Replaces all demo menu items (previously restaurant food items) with Loomis Salon
  hair services. Adds a duration_minutes column to support booking time calculations.
  Updates the salon name reference to "Loomis Salon" with the new Header_Image.

  ## Changes
  - demo_menu_items: adds duration_minutes column (integer, nullable)
  - demo_menu_items: truncates all existing rows and inserts 11 salon services
    across 4 categories: Cuts, Color, Styling, Treatments
  - All image_url values point to the temp.images Supabase Storage bucket
*/

-- Add duration_minutes column if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_menu_items' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE demo_menu_items ADD COLUMN duration_minutes integer DEFAULT NULL;
  END IF;
END $$;

-- Replace all demo items with Loomis Salon services
DELETE FROM demo_menu_items;

INSERT INTO demo_menu_items (id, name, description, price, category, meal_period, image_url, sort_order, duration_minutes) VALUES
  -- Cuts
  (gen_random_uuid(), 'Women''s Haircut & Style',   'Precision cut and blowout styled to your preference. Includes shampoo and conditioning treatment.',          65.00,  'Cuts',       'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Women''s_Haircut_%26_Style.png', 100, 60),
  (gen_random_uuid(), 'Men''s Haircut',              'Classic or modern cut with a professional finish. Includes shampoo and style.',                               40.00,  'Cuts',       'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Men''s_Haircut.png',            101, 30),
  (gen_random_uuid(), 'Children''s Haircut',         'Gentle, patient haircut for kids 12 and under. Includes shampoo and style.',                                  30.00,  'Cuts',       'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Children''s_Haircut.png',       102, 30),
  (gen_random_uuid(), 'Bang Trim',                   'Quick fringe trim to keep your style sharp between cuts.',                                                    15.00,  'Cuts',       'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Bang_Trim.png',                103, 15),
  -- Color
  (gen_random_uuid(), 'Full Color',                  'Single-process all-over color with professional formulation and gloss rinse.',                               85.00,  'Color',      'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/full_color.png',               200, 90),
  (gen_random_uuid(), 'Root Touch-Up',               'Single-process color application at the roots to refresh your existing color.',                              55.00,  'Color',      'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Root_Touch-Up.png',            201, 60),
  (gen_random_uuid(), 'Highlights / Balayage',       'Hand-painted or foil highlights for a natural, sun-kissed dimensional look.',                               120.00, 'Color',      'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Highlights_Balayage.png',      202, 120),
  -- Styling
  (gen_random_uuid(), 'Blowout',                     'Shampoo, condition and professional blowout styled to perfection.',                                          45.00,  'Styling',    'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Blowout.png',                  300, 45),
  (gen_random_uuid(), 'Curling / Flat Iron Style',   'Heat-styled finish with curls, waves or a sleek straight look.',                                             50.00,  'Styling',    'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Curling_Flat_Iron_Style.png',  301, 45),
  -- Treatments
  (gen_random_uuid(), 'Keratin Smoothing',           'Professional keratin treatment that eliminates frizz and adds lasting shine for up to 3 months.',           200.00, 'Treatments', 'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Keratin_Smoothing.png',         400, 150),
  (gen_random_uuid(), 'Scalp Treatment',             'Targeted scalp therapy with nourishing serums to improve health and stimulate growth.',                      55.00,  'Treatments', 'all-day', 'https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Scalp_Treatment.png',           401, 45);
