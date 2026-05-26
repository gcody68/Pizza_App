/*
  # Shift Logs — Payroll Timecard

  ## Purpose
  Records a timestamped entry every time a stylist is toggled On Floor or Off Duty.
  Used to calculate accumulated shift hours per stylist for payroll reporting in
  the Bookkeeping & Payouts panel.

  ## New Table: shift_logs
  - `id`            (uuid, PK)
  - `staff_id`      (uuid, FK → staff_profiles, CASCADE DELETE)
  - `restaurant_id` (uuid, FK → restaurant_settings, CASCADE DELETE)
  - `event`         (text) — 'clock_in' | 'clock_out'
  - `logged_at`     (timestamptz, default now())

  ## Security
  - RLS enabled
  - Authenticated owners can read/write logs for their own restaurant's staff
  - No public (anon) access — payroll data is owner-only
*/

CREATE TABLE IF NOT EXISTS shift_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurant_settings(id) ON DELETE CASCADE,
  event         text NOT NULL CHECK (event IN ('clock_in', 'clock_out')),
  logged_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_logs_staff_logged ON shift_logs (staff_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS shift_logs_restaurant_logged ON shift_logs (restaurant_id, logged_at DESC);

ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select own shift logs"
  ON shift_logs FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert own shift logs"
  ON shift_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete own shift logs"
  ON shift_logs FOR DELETE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()
    )
  );
