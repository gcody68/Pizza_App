/*
  # Add notification settings to restaurant_settings

  Adds columns for SMS (Twilio) and Email (Resend) notification configuration toggles.
  Each channel has a master enable/disable flag plus granular per-event toggles.

  ## New columns on restaurant_settings

  ### SMS (Twilio)
  - `sms_enabled` — master SMS toggle
  - `sms_appointment_confirmation` — send confirmation when booking is made
  - `sms_24h_reminder` — reminder 24 hours before
  - `sms_2h_reminder` — reminder 2 hours before
  - `sms_no_show_followup` — follow-up message after a no-show
  - `twilio_phone_number` — outbound phone number (set by owner)

  ### Email (Resend)
  - `email_enabled` — master email toggle
  - `email_appointment_confirmation` — confirmation email on booking
  - `email_24h_reminder` — reminder 24 hours before
  - `email_marketing_blasts` — permission to send promotional emails
  - `email_review_request` — post-visit review request
  - `reply_to_email` — reply-to address for outbound emails

  ## Notes
  All boolean columns default to false (opt-in model). String columns default to ''.
*/

DO $$
BEGIN
  -- SMS columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='sms_enabled') THEN
    ALTER TABLE restaurant_settings ADD COLUMN sms_enabled boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='sms_appointment_confirmation') THEN
    ALTER TABLE restaurant_settings ADD COLUMN sms_appointment_confirmation boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='sms_24h_reminder') THEN
    ALTER TABLE restaurant_settings ADD COLUMN sms_24h_reminder boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='sms_2h_reminder') THEN
    ALTER TABLE restaurant_settings ADD COLUMN sms_2h_reminder boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='sms_no_show_followup') THEN
    ALTER TABLE restaurant_settings ADD COLUMN sms_no_show_followup boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='twilio_phone_number') THEN
    ALTER TABLE restaurant_settings ADD COLUMN twilio_phone_number text NOT NULL DEFAULT '';
  END IF;

  -- Email columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='email_enabled') THEN
    ALTER TABLE restaurant_settings ADD COLUMN email_enabled boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='email_appointment_confirmation') THEN
    ALTER TABLE restaurant_settings ADD COLUMN email_appointment_confirmation boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='email_24h_reminder') THEN
    ALTER TABLE restaurant_settings ADD COLUMN email_24h_reminder boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='email_marketing_blasts') THEN
    ALTER TABLE restaurant_settings ADD COLUMN email_marketing_blasts boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='email_review_request') THEN
    ALTER TABLE restaurant_settings ADD COLUMN email_review_request boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_settings' AND column_name='reply_to_email') THEN
    ALTER TABLE restaurant_settings ADD COLUMN reply_to_email text NOT NULL DEFAULT '';
  END IF;
END $$;
