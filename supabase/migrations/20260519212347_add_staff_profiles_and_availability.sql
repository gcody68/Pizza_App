/*
  # Staff Profiles, Staff Assignment & Availability Algorithm

  ## Summary
  This migration adds multi-staff support to the salon booking system.

  ## New Tables
  - `staff_profiles`
    - `id` (uuid, PK)
    - `restaurant_id` (uuid, FK → restaurant_settings)
    - `name` (text) — display name shown in the booking UI
    - `is_clocked_in` (boolean, default false) — live clock-in status
    - `color` (text, optional) — accent hex used in the schedule view
    - `created_at` (timestamptz)

  ## Modified Tables
  - `orders`
    - Adds `staff_id` (uuid, nullable FK → staff_profiles) — the assigned stylist

  ## New Functions
  - `get_available_slots(p_restaurant_id, p_date, p_duration_minutes, p_staff_id?)` — returns
    a jsonb array of available time-slot strings for a given service duration and optional
    specific stylist. If no staff_id is provided, returns slots where AT LEAST ONE clocked-in
    staff member is free for the full duration block.

  ## Security
  - RLS enabled on staff_profiles
  - Authenticated owners can read/write their own restaurant's staff
  - Public (anon) can read clocked-in staff for the booking UI (SELECT only, clocked_in filter)
*/

-- ── staff_profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant_settings(id) ON DELETE CASCADE,
  name          text NOT NULL,
  is_clocked_in boolean NOT NULL DEFAULT false,
  color         text DEFAULT NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- Restaurant owner can manage their staff
CREATE POLICY "Owner can manage own staff"
  ON staff_profiles FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert own staff"
  ON staff_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update own staff"
  ON staff_profiles FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete own staff"
  ON staff_profiles FOR DELETE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  );

-- Public (anon) can read clocked-in staff for the booking modal
CREATE POLICY "Public can view clocked-in staff"
  ON staff_profiles FOR SELECT
  TO anon
  USING (is_clocked_in = true);

-- Super admin can see all
CREATE POLICY "Super admin full access to staff"
  ON staff_profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true
  );

-- ── Add staff_id to orders ────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS staff_id uuid DEFAULT NULL REFERENCES staff_profiles(id) ON DELETE SET NULL;

-- ── Availability algorithm ────────────────────────────────────────────────────
-- Returns JSON array of time slot strings that have an uninterrupted free block
-- matching p_duration_minutes for the given date and restaurant.
-- If p_staff_id is provided → only check that stylist.
-- If p_staff_id is NULL     → return slots where ANY clocked-in stylist is free.

CREATE OR REPLACE FUNCTION get_available_slots(
  p_restaurant_id   uuid,
  p_date            date,
  p_duration_minutes integer,
  p_staff_id        uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- All half-hour slots from 9:00 AM to 6:00 PM (inclusive start of last bookable slot)
  all_slots text[] := ARRAY[
    '9:00 AM','9:30 AM','10:00 AM','10:30 AM',
    '11:00 AM','11:30 AM','12:00 PM','12:30 PM',
    '1:00 PM','1:30 PM','2:00 PM','2:30 PM',
    '3:00 PM','3:30 PM','4:00 PM','4:30 PM',
    '5:00 PM','5:30 PM','6:00 PM'
  ];
  slot_time       text;
  slot_ts         timestamptz;
  slot_end_ts     timestamptz;
  available_slots jsonb := '[]'::jsonb;
  staff_row       record;
  has_free        boolean;
  conflict_count  integer;
  staff_free      boolean;
BEGIN
  FOREACH slot_time IN ARRAY all_slots LOOP
    -- Parse slot into a timestamptz for interval arithmetic
    slot_ts     := (p_date::text || ' ' || slot_time)::timestamptz;
    slot_end_ts := slot_ts + (p_duration_minutes || ' minutes')::interval;

    -- Don't offer a slot if the service would run past 7 PM
    IF slot_end_ts > (p_date::text || ' 7:00 PM')::timestamptz THEN
      CONTINUE;
    END IF;

    IF p_staff_id IS NOT NULL THEN
      -- Specific stylist: check that stylist has no overlapping confirmed appointment
      SELECT COUNT(*) INTO conflict_count
        FROM orders o
        JOIN staff_profiles sp ON sp.id = o.staff_id
       WHERE o.restaurant_id = p_restaurant_id
         AND o.staff_id      = p_staff_id
         AND o.appointment_date = p_date
         AND o.status NOT IN ('cancelled', 'rejected')
         -- Overlap: existing [appt_start, appt_start+duration) overlaps [slot_ts, slot_end_ts)
         AND (
           (p_date::text || ' ' || o.appointment_time)::timestamptz
             < slot_end_ts
           AND
           (p_date::text || ' ' || o.appointment_time)::timestamptz
             + (
                 SELECT COALESCE(mi.duration_minutes, 30)
                   FROM order_items oi
                   JOIN menu_items mi ON mi.id = oi.menu_item_id
                  WHERE oi.order_id = o.id
                  LIMIT 1
               ) * interval '1 minute'
             > slot_ts
         );

      IF conflict_count = 0 THEN
        available_slots := available_slots || to_jsonb(slot_time);
      END IF;

    ELSE
      -- "Anyone available": slot is available if at least one clocked-in stylist is free
      has_free := false;

      FOR staff_row IN
        SELECT id FROM staff_profiles
         WHERE restaurant_id = p_restaurant_id
           AND is_clocked_in = true
      LOOP
        SELECT COUNT(*) INTO conflict_count
          FROM orders o
         WHERE o.restaurant_id = p_restaurant_id
           AND o.staff_id      = staff_row.id
           AND o.appointment_date = p_date
           AND o.status NOT IN ('cancelled', 'rejected')
           AND (
             (p_date::text || ' ' || o.appointment_time)::timestamptz
               < slot_end_ts
             AND
             (p_date::text || ' ' || o.appointment_time)::timestamptz
               + (
                   SELECT COALESCE(mi.duration_minutes, 30)
                     FROM order_items oi
                     JOIN menu_items mi ON mi.id = oi.menu_item_id
                    WHERE oi.order_id = o.id
                    LIMIT 1
                 ) * interval '1 minute'
               > slot_ts
           );

        IF conflict_count = 0 THEN
          has_free := true;
          EXIT; -- one free stylist is enough
        END IF;
      END LOOP;

      -- If no staff at all are clocked in, show all slots (graceful fallback)
      IF NOT EXISTS (
        SELECT 1 FROM staff_profiles
         WHERE restaurant_id = p_restaurant_id AND is_clocked_in = true
      ) THEN
        has_free := true;
      END IF;

      IF has_free THEN
        available_slots := available_slots || to_jsonb(slot_time);
      END IF;
    END IF;
  END LOOP;

  RETURN available_slots;
END;
$$;

-- ── Update place_order to accept staff_id ─────────────────────────────────────
CREATE OR REPLACE FUNCTION place_order(
  p_restaurant_id    uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_email   text DEFAULT NULL,
  p_total            numeric DEFAULT 0,
  p_items            jsonb DEFAULT '[]',
  p_appointment_date date DEFAULT NULL,
  p_appointment_time text DEFAULT NULL,
  p_staff_id         uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item     jsonb;
BEGIN
  INSERT INTO orders (
    restaurant_id, customer_name, customer_phone, customer_email,
    total, status, appointment_date, appointment_time, staff_id
  )
  VALUES (
    p_restaurant_id, p_customer_name, p_customer_phone, p_customer_email,
    p_total, 'pending', p_appointment_date, p_appointment_time, p_staff_id
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (
      order_id, menu_item_id, menu_item_name, price, quantity, special_instructions
    )
    VALUES (
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      v_item->>'menu_item_name',
      (v_item->>'price')::numeric,
      (v_item->>'quantity')::integer,
      v_item->>'special_instructions'
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;
