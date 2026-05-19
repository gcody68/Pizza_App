/*
  # Staff Shift Schedules & Per-Staff Service Duration Overrides

  ## Summary
  1. Adds shift_start / shift_end / break_start / break_end to staff_profiles.
  2. New staff_service_durations table for per-stylist duration overrides per service.
  3. Rebuilds get_available_slots to respect shift windows, breaks, and staff-specific durations.

  ## Modified Tables
  - staff_profiles: + shift_start, shift_end, break_start, break_end (all time, nullable)

  ## New Tables
  - staff_service_durations (staff_id, menu_item_id, duration_minutes) UNIQUE per pair

  ## Security
  - RLS on staff_service_durations matching the staff_profiles owner-scoped pattern
*/

-- ── Shift schedule columns ────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_profiles' AND column_name='shift_start') THEN
    ALTER TABLE staff_profiles ADD COLUMN shift_start time DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_profiles' AND column_name='shift_end') THEN
    ALTER TABLE staff_profiles ADD COLUMN shift_end time DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_profiles' AND column_name='break_start') THEN
    ALTER TABLE staff_profiles ADD COLUMN break_start time DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_profiles' AND column_name='break_end') THEN
    ALTER TABLE staff_profiles ADD COLUMN break_end time DEFAULT NULL;
  END IF;
END $$;

-- ── staff_service_durations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_service_durations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  menu_item_id     uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  UNIQUE (staff_id, menu_item_id)
);

ALTER TABLE staff_service_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage service durations"
  ON staff_service_durations FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      JOIN restaurant_settings rs ON rs.id = sp.restaurant_id
      WHERE rs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert service durations"
  ON staff_service_durations FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      JOIN restaurant_settings rs ON rs.id = sp.restaurant_id
      WHERE rs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update service durations"
  ON staff_service_durations FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      JOIN restaurant_settings rs ON rs.id = sp.restaurant_id
      WHERE rs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      JOIN restaurant_settings rs ON rs.id = sp.restaurant_id
      WHERE rs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete service durations"
  ON staff_service_durations FOR DELETE
  TO authenticated
  USING (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      JOIN restaurant_settings rs ON rs.id = sp.restaurant_id
      WHERE rs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can read service durations"
  ON staff_service_durations FOR SELECT
  TO anon
  USING (true);

-- ── Rebuild get_available_slots ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_available_slots(
  p_restaurant_id    uuid,
  p_date             date,
  p_duration_minutes integer,
  p_staff_id         uuid DEFAULT NULL,
  p_menu_item_id     uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  all_slots text[] := ARRAY[
    '9:00 AM','9:30 AM','10:00 AM','10:30 AM',
    '11:00 AM','11:30 AM','12:00 PM','12:30 PM',
    '1:00 PM','1:30 PM','2:00 PM','2:30 PM',
    '3:00 PM','3:30 PM','4:00 PM','4:30 PM',
    '5:00 PM','5:30 PM','6:00 PM'
  ];
  slot_time         text;
  slot_ts           timestamptz;
  slot_end_ts       timestamptz;
  available_slots   jsonb := '[]'::jsonb;
  staff_row         record;
  has_free          boolean;
  conflict_count    integer;
  eff_duration      integer;
BEGIN
  FOREACH slot_time IN ARRAY all_slots LOOP
    slot_ts := (p_date::text || ' ' || slot_time)::timestamptz;

    IF p_staff_id IS NOT NULL THEN
      -- ── Specific stylist mode ──
      -- Resolve effective duration (staff override → default)
      SELECT COALESCE(
        (SELECT ssd.duration_minutes FROM staff_service_durations ssd
          WHERE ssd.staff_id = p_staff_id
            AND ssd.menu_item_id = p_menu_item_id LIMIT 1),
        p_duration_minutes
      ) INTO eff_duration;

      slot_end_ts := slot_ts + (eff_duration || ' minutes')::interval;

      -- Hard stop at 7 PM
      IF slot_end_ts > (p_date::text || ' 7:00 PM')::timestamptz THEN CONTINUE; END IF;

      -- Outside stylist's shift?
      IF EXISTS (
        SELECT 1 FROM staff_profiles
         WHERE id = p_staff_id
           AND shift_start IS NOT NULL
           AND slot_ts::time < shift_start
      ) THEN CONTINUE; END IF;

      IF EXISTS (
        SELECT 1 FROM staff_profiles
         WHERE id = p_staff_id
           AND shift_end IS NOT NULL
           AND slot_end_ts::time > shift_end
      ) THEN CONTINUE; END IF;

      -- Overlaps break?
      IF EXISTS (
        SELECT 1 FROM staff_profiles
         WHERE id = p_staff_id
           AND break_start IS NOT NULL
           AND break_end IS NOT NULL
           AND slot_ts::time < break_end
           AND slot_end_ts::time > break_start
      ) THEN CONTINUE; END IF;

      -- Conflicting appointment?
      SELECT COUNT(*) INTO conflict_count
        FROM orders o
       WHERE o.restaurant_id   = p_restaurant_id
         AND o.staff_id        = p_staff_id
         AND o.appointment_date = p_date
         AND o.status NOT IN ('cancelled', 'rejected')
         AND (
           (p_date::text || ' ' || o.appointment_time)::timestamptz < slot_end_ts
           AND
           (p_date::text || ' ' || o.appointment_time)::timestamptz
             + COALESCE(
                 (SELECT COALESCE(
                    (SELECT ssd2.duration_minutes FROM staff_service_durations ssd2
                      WHERE ssd2.staff_id = p_staff_id AND ssd2.menu_item_id = oi2.menu_item_id LIMIT 1),
                    mi2.duration_minutes,
                    30
                  )
                   FROM order_items oi2
                   JOIN menu_items mi2 ON mi2.id = oi2.menu_item_id
                  WHERE oi2.order_id = o.id LIMIT 1),
                 30
               ) * interval '1 minute'
             > slot_ts
         );

      IF conflict_count = 0 THEN
        available_slots := available_slots || to_jsonb(slot_time);
      END IF;

    ELSE
      -- ── Anyone-available mode ──
      has_free := false;

      FOR staff_row IN
        SELECT id, shift_start, shift_end, break_start, break_end
          FROM staff_profiles
         WHERE restaurant_id = p_restaurant_id
           AND is_clocked_in = true
      LOOP
        -- Resolve effective duration for this staff member
        SELECT COALESCE(
          (SELECT ssd.duration_minutes FROM staff_service_durations ssd
            WHERE ssd.staff_id = staff_row.id
              AND ssd.menu_item_id = p_menu_item_id LIMIT 1),
          p_duration_minutes
        ) INTO eff_duration;

        slot_end_ts := slot_ts + (eff_duration || ' minutes')::interval;

        -- Hard stop
        IF slot_end_ts > (p_date::text || ' 7:00 PM')::timestamptz THEN CONTINUE; END IF;

        -- Shift window
        IF staff_row.shift_start IS NOT NULL AND slot_ts::time < staff_row.shift_start THEN CONTINUE; END IF;
        IF staff_row.shift_end   IS NOT NULL AND slot_end_ts::time > staff_row.shift_end   THEN CONTINUE; END IF;

        -- Break
        IF staff_row.break_start IS NOT NULL AND staff_row.break_end IS NOT NULL THEN
          IF slot_ts::time < staff_row.break_end AND slot_end_ts::time > staff_row.break_start THEN
            CONTINUE;
          END IF;
        END IF;

        -- Conflicting appointment for this stylist
        SELECT COUNT(*) INTO conflict_count
          FROM orders o
         WHERE o.restaurant_id   = p_restaurant_id
           AND o.staff_id        = staff_row.id
           AND o.appointment_date = p_date
           AND o.status NOT IN ('cancelled', 'rejected')
           AND (
             (p_date::text || ' ' || o.appointment_time)::timestamptz < slot_end_ts
             AND
             (p_date::text || ' ' || o.appointment_time)::timestamptz
               + COALESCE(
                   (SELECT COALESCE(
                      (SELECT ssd2.duration_minutes FROM staff_service_durations ssd2
                        WHERE ssd2.staff_id = staff_row.id AND ssd2.menu_item_id = oi2.menu_item_id LIMIT 1),
                      mi2.duration_minutes,
                      30
                    )
                     FROM order_items oi2
                     JOIN menu_items mi2 ON mi2.id = oi2.menu_item_id
                    WHERE oi2.order_id = o.id LIMIT 1),
                   30
                 ) * interval '1 minute'
               > slot_ts
           );

        IF conflict_count = 0 THEN
          has_free := true;
          EXIT;
        END IF;
      END LOOP;

      -- Graceful fallback: no staff clocked in → show all within hard stop
      IF NOT EXISTS (
        SELECT 1 FROM staff_profiles
         WHERE restaurant_id = p_restaurant_id AND is_clocked_in = true
      ) THEN
        slot_end_ts := slot_ts + (p_duration_minutes || ' minutes')::interval;
        IF slot_end_ts <= (p_date::text || ' 7:00 PM')::timestamptz THEN
          has_free := true;
        END IF;
      END IF;

      IF has_free THEN
        available_slots := available_slots || to_jsonb(slot_time);
      END IF;
    END IF;
  END LOOP;

  RETURN available_slots;
END;
$$;
