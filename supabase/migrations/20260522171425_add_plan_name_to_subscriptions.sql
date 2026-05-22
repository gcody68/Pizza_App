/*
  # Add plan_name column to subscriptions

  The app queries subscriptions.plan_name but the column doesn't exist —
  only plan_id does. Adding plan_name as a text column so existing queries
  don't crash. Defaults to 'pro' so active subscribers are not blocked.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'plan_name'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN plan_name text DEFAULT 'pro';
  END IF;
END $$;
