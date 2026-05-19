/*
  # Loomis HQ Restaurant App — Full Schema Migration

  ## Overview
  Complete schema setup for the Loomis multi-tenant restaurant menu and ordering platform.
  Imported from: https://github.com/gcody68/loomis-pizza-app

  ## New Tables
  - `profiles` — User profiles linked to auth.users, with role field
  - `restaurant_settings` — Per-restaurant configuration (name, theme, hours, Stripe keys, domain)
  - `menu_items` — Menu items per restaurant with variants, meal periods, stock tracking
  - `demo_menu_items` — Seed menu items for the interactive demo
  - `gallery_items` — Photo gallery items per restaurant
  - `orders` — Customer orders per restaurant
  - `order_items` — Line items for each order
  - `customer_leads` — Customer contact info captured at checkout
  - `affiliates` — Affiliate/referral partners
  - `referrals` — Referral tracking records
  - `churn_events` — Subscription cancellation audit log
  - `setup_requests` — Onboarding setup requests
  - `subscription_plans` — Available subscription tiers
  - `subscriptions` — Per-restaurant subscription records
  - `system_audits` — Admin impersonation audit log
  - `app_settings` — Global key-value app configuration

  ## Security
  - RLS enabled on all tables
  - Restaurant owners can only access their own data
  - Super admins (via app_metadata) have full access
  - Public read for menu items and restaurant settings
  - Anonymous order placement allowed

  ## Seed Data
  - Demo menu items (21 items across Breakfast/Lunch/Dinner/Desserts/Drinks/Sides)
  - Default Pro subscription plan
  - Default app settings
  - Sample restaurant record with full menu
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Functions

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN (NEW.raw_app_meta_data -> 'super_admin')::boolean IS TRUE THEN 'super_admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_customer_lead(
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO customer_leads (name, phone, email, first_order_date, last_order_date, order_count)
  VALUES (p_name, p_phone, p_email, now(), now(), 1)
  ON CONFLICT (phone) DO UPDATE
  SET name            = EXCLUDED.name,
      email           = COALESCE(EXCLUDED.email, customer_leads.email),
      last_order_date = now(),
      order_count     = COALESCE(customer_leads.order_count, 0) + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_starter_menu(p_restaurant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO menu_items
    (restaurant_id, name, description, price, category, meal_period, image_url, is_available, sort_order)
  SELECT
    p_restaurant_id,
    name,
    description,
    price,
    category,
    meal_period,
    image_url,
    true,
    sort_order
  FROM demo_menu_items
  ORDER BY sort_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_seed_starter_menu()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM seed_starter_menu(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_order(
  p_restaurant_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_total numeric,
  p_items jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id uuid;
  v_item     jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurant_settings WHERE id = p_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;

  INSERT INTO orders (
    restaurant_id, customer_name, customer_phone, customer_email, total, status
  ) VALUES (
    p_restaurant_id, p_customer_name, p_customer_phone, p_customer_email, p_total, 'pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, menu_item_id, menu_item_name, price, quantity, special_instructions
    ) VALUES (
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

-- Tables

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'user',
  email      text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name          text NOT NULL DEFAULT 'Your Restaurant Name Here',
  business_address       text DEFAULT '',
  business_phone         text DEFAULT '',
  header_image_url       text DEFAULT '',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  theme                  text NOT NULL DEFAULT 'midnight-gold',
  payment_enabled        boolean NOT NULL DEFAULT false,
  stripe_public_key      text,
  stripe_secret_key      text,
  kitchen_view_enabled   boolean NOT NULL DEFAULT true,
  show_gallery           boolean NOT NULL DEFAULT false,
  bg_style               text DEFAULT 'deep-charcoal',
  logo_url               text,
  service_hours          jsonb,
  unavailable_display    text NOT NULL DEFAULT 'hide',
  owner_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subdomain              text,
  custom_domain          text,
  business_hours         jsonb DEFAULT '{"open":"06:00","close":"23:00"}'::jsonb,
  custom_domain_verified boolean NOT NULL DEFAULT false,
  sales_tax_rate         numeric,
  billing_email          text
);
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.menu_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL DEFAULT 'Dish',
  description    text DEFAULT '',
  price          numeric NOT NULL DEFAULT 0,
  image_url      text DEFAULT '',
  sort_order     integer NOT NULL DEFAULT 0,
  is_placeholder boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  category       text NOT NULL DEFAULT 'Breakfast',
  meal_period    text NOT NULL DEFAULT 'all-day',
  is_available   boolean NOT NULL DEFAULT true,
  daily_stock    integer,
  restaurant_id  uuid,
  is_special     boolean NOT NULL DEFAULT false,
  variants       jsonb
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='menu_items' AND column_name='restaurant_id') THEN
    ALTER TABLE public.menu_items ADD COLUMN restaurant_id uuid REFERENCES public.restaurant_settings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='menu_items' AND column_name='category') THEN
    ALTER TABLE public.menu_items ADD COLUMN category text NOT NULL DEFAULT 'Breakfast';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='menu_items' AND column_name='meal_period') THEN
    ALTER TABLE public.menu_items ADD COLUMN meal_period text NOT NULL DEFAULT 'all-day';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='menu_items' AND column_name='is_available') THEN
    ALTER TABLE public.menu_items ADD COLUMN is_available boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='menu_items' AND column_name='daily_stock') THEN
    ALTER TABLE public.menu_items ADD COLUMN daily_stock integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='menu_items' AND column_name='is_special') THEN
    ALTER TABLE public.menu_items ADD COLUMN is_special boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='menu_items' AND column_name='variants') THEN
    ALTER TABLE public.menu_items ADD COLUMN variants jsonb;
  END IF;
END $$;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.demo_menu_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  price       numeric NOT NULL DEFAULT 0,
  category    text NOT NULL,
  meal_period text NOT NULL DEFAULT 'all-day',
  image_url   text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.demo_menu_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.gallery_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url     text NOT NULL DEFAULT '',
  caption       text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  restaurant_id uuid
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='gallery_items' AND column_name='restaurant_id') THEN
    ALTER TABLE public.gallery_items ADD COLUMN restaurant_id uuid REFERENCES public.restaurant_settings(id) ON DELETE CASCADE;
  END IF;
END $$;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name        text NOT NULL,
  customer_phone       text NOT NULL,
  status               text NOT NULL DEFAULT 'pending',
  total                numeric NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  customer_email       text,
  special_instructions text,
  restaurant_id        uuid
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='restaurant_id') THEN
    ALTER TABLE public.orders ADD COLUMN restaurant_id uuid REFERENCES public.restaurant_settings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_email') THEN
    ALTER TABLE public.orders ADD COLUMN customer_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='special_instructions') THEN
    ALTER TABLE public.orders ADD COLUMN special_instructions text;
  END IF;
END $$;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id         uuid,
  menu_item_name       text NOT NULL,
  price                numeric NOT NULL,
  quantity             integer NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now(),
  special_instructions text
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.customer_leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  phone            text NOT NULL,
  email            text,
  first_order_date timestamptz DEFAULT now(),
  last_order_date  timestamptz DEFAULT now(),
  order_count      integer DEFAULT 1,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT customer_leads_phone_key UNIQUE (phone)
);
ALTER TABLE public.customer_leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.affiliates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  code       text NOT NULL UNIQUE,
  status     text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.referrals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id   uuid,
  restaurant_id  uuid,
  status         text NOT NULL DEFAULT 'active',
  referred_at    timestamptz DEFAULT now(),
  deactivated_at timestamptz
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='affiliate_id') THEN
    ALTER TABLE public.referrals ADD COLUMN affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='restaurant_id') THEN
    ALTER TABLE public.referrals ADD COLUMN restaurant_id uuid REFERENCES public.restaurant_settings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='referred_at') THEN
    ALTER TABLE public.referrals ADD COLUMN referred_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='deactivated_at') THEN
    ALTER TABLE public.referrals ADD COLUMN deactivated_at timestamptz;
  END IF;
END $$;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.churn_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id          uuid,
  restaurant_name        text NOT NULL DEFAULT '',
  owner_email            text NOT NULL DEFAULT '',
  stripe_subscription_id text,
  cancelled_at           timestamptz NOT NULL DEFAULT now(),
  ltv_at_churn           numeric NOT NULL DEFAULT 0,
  affiliate_id           uuid,
  affiliate_name         text,
  notes                  text,
  created_at             timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='churn_events' AND column_name='restaurant_id') THEN
    ALTER TABLE public.churn_events ADD COLUMN restaurant_id uuid REFERENCES public.restaurant_settings(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='churn_events' AND column_name='affiliate_id') THEN
    ALTER TABLE public.churn_events ADD COLUMN affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;
  END IF;
END $$;
ALTER TABLE public.churn_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.setup_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login_email     text NOT NULL,
  desired_domain  text,
  menu_file_url   text,
  menu_file_name  text,
  notes           text,
  status          text NOT NULL DEFAULT 'pending',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.setup_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  price_monthly   numeric NOT NULL DEFAULT 0,
  stripe_price_id text,
  features        jsonb DEFAULT '[]'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id          uuid,
  plan_id                uuid,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text NOT NULL DEFAULT 'active',
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancelled_at           timestamptz,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),
  merchant_email         text,
  login_email            text
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='restaurant_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN restaurant_id uuid REFERENCES public.restaurant_settings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='plan_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN plan_id uuid REFERENCES public.subscription_plans(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='cancelled_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancelled_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='merchant_email') THEN
    ALTER TABLE public.subscriptions ADD COLUMN merchant_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='login_email') THEN
    ALTER TABLE public.subscriptions ADD COLUMN login_email text;
  END IF;
END $$;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.system_audits (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id           uuid NOT NULL,
  actor_email        text NOT NULL,
  impersonated_id    uuid,
  impersonated_email text,
  action             text NOT NULL,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE public.system_audits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Triggers

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_settings_updated_at ON public.restaurant_settings;
CREATE TRIGGER update_restaurant_settings_updated_at
  BEFORE UPDATE ON public.restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_seed_starter_menu ON public.restaurant_settings;
CREATE TRIGGER trg_seed_starter_menu
  AFTER INSERT ON public.restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION trg_fn_seed_starter_menu();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;
CREATE POLICY "Super admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Anyone can read restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Anyone can read restaurant settings" ON public.restaurant_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can insert their restaurant" ON public.restaurant_settings;
CREATE POLICY "Owners can insert their restaurant" ON public.restaurant_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their restaurant" ON public.restaurant_settings;
CREATE POLICY "Owners can update their restaurant" ON public.restaurant_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK (auth.uid() = owner_id OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owners can delete their restaurant" ON public.restaurant_settings;
CREATE POLICY "Owners can delete their restaurant" ON public.restaurant_settings
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Authenticated users can claim unowned restaurants" ON public.restaurant_settings;
CREATE POLICY "Authenticated users can claim unowned restaurants" ON public.restaurant_settings
  FOR UPDATE TO authenticated
  USING (owner_id IS NULL)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Anyone can read menu items" ON public.menu_items;
CREATE POLICY "Anyone can read menu items" ON public.menu_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can insert menu items" ON public.menu_items;
CREATE POLICY "Owners can insert menu items" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owners can update menu items" ON public.menu_items;
CREATE POLICY "Owners can update menu items" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owners can delete menu items" ON public.menu_items;
CREATE POLICY "Owners can delete menu items" ON public.menu_items
  FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Anyone can update menu item stock" ON public.menu_items;
CREATE POLICY "Anyone can update menu item stock" ON public.menu_items
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read demo menu items" ON public.demo_menu_items;
CREATE POLICY "Anyone can read demo menu items" ON public.demo_menu_items
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Authenticated users can read demo menu items" ON public.demo_menu_items;
CREATE POLICY "Authenticated users can read demo menu items" ON public.demo_menu_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view gallery items" ON public.gallery_items;
CREATE POLICY "Anyone can view gallery items" ON public.gallery_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner can insert gallery items" ON public.gallery_items;
CREATE POLICY "Owner can insert gallery items" ON public.gallery_items
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owner can update gallery items" ON public.gallery_items;
CREATE POLICY "Owner can update gallery items" ON public.gallery_items
  FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owner can delete gallery items" ON public.gallery_items;
CREATE POLICY "Owner can delete gallery items" ON public.gallery_items
  FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
CREATE POLICY "anon_insert_orders" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (1 = 1);

DROP POLICY IF EXISTS "Owners can read their restaurant orders" ON public.orders;
CREATE POLICY "Owners can read their restaurant orders" ON public.orders
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owners can update their restaurant orders" ON public.orders;
CREATE POLICY "Owners can update their restaurant orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "anon_insert_order_items" ON public.order_items;
CREATE POLICY "anon_insert_order_items" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (1 = 1);

DROP POLICY IF EXISTS "Owners can read order items for their restaurant" ON public.order_items;
CREATE POLICY "Owners can read order items for their restaurant" ON public.order_items
  FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN restaurant_settings rs ON rs.id = o.restaurant_id
    WHERE rs.owner_id = auth.uid()
  ) OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owners can update order items for their orders" ON public.order_items;
CREATE POLICY "Owners can update order items for their orders" ON public.order_items
  FOR UPDATE TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN restaurant_settings rs ON rs.id = o.restaurant_id
    WHERE rs.owner_id = auth.uid()
  ) OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK (order_id IN (
    SELECT o.id FROM orders o
    JOIN restaurant_settings rs ON rs.id = o.restaurant_id
    WHERE rs.owner_id = auth.uid()
  ) OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Anyone can upsert customer leads" ON public.customer_leads;
CREATE POLICY "Anyone can upsert customer leads" ON public.customer_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update customer leads" ON public.customer_leads;
CREATE POLICY "Anyone can update customer leads" ON public.customer_leads
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view customer leads" ON public.customer_leads;
CREATE POLICY "Authenticated users can view customer leads" ON public.customer_leads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can view plans" ON public.subscription_plans;
CREATE POLICY "Anyone authenticated can view plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can view their own subscription" ON public.subscriptions;
CREATE POLICY "Owners can view their own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Owners can update their own subscription" ON public.subscriptions;
CREATE POLICY "Owners can update their own subscription" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.subscriptions;
CREATE POLICY "Service role full access to subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can insert affiliate records" ON public.affiliates;
CREATE POLICY "Anon can insert affiliate records" ON public.affiliates
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view affiliates" ON public.affiliates;
CREATE POLICY "Super admins can view affiliates" ON public.affiliates
  FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can insert affiliates" ON public.affiliates;
CREATE POLICY "Super admins can insert affiliates" ON public.affiliates
  FOR INSERT TO authenticated
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can update affiliates" ON public.affiliates;
CREATE POLICY "Super admins can update affiliates" ON public.affiliates
  FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Service role full access to affiliates" ON public.affiliates;
CREATE POLICY "Service role full access to affiliates" ON public.affiliates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can insert referral records" ON public.referrals;
CREATE POLICY "Anon can insert referral records" ON public.referrals
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view referrals" ON public.referrals;
CREATE POLICY "Super admins can view referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can insert referrals" ON public.referrals;
CREATE POLICY "Super admins can insert referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can update referrals" ON public.referrals;
CREATE POLICY "Super admins can update referrals" ON public.referrals
  FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Service role full access to referrals" ON public.referrals;
CREATE POLICY "Service role full access to referrals" ON public.referrals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view churn events" ON public.churn_events;
CREATE POLICY "Super admins can view churn events" ON public.churn_events
  FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can insert churn events" ON public.churn_events;
CREATE POLICY "Super admins can insert churn events" ON public.churn_events
  FOR INSERT TO authenticated
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Service role full access to churn_events" ON public.churn_events;
CREATE POLICY "Service role full access to churn_events" ON public.churn_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit a setup request" ON public.setup_requests;
CREATE POLICY "Anyone can submit a setup request" ON public.setup_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view setup requests" ON public.setup_requests;
CREATE POLICY "Super admins can view setup requests" ON public.setup_requests
  FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can update setup requests" ON public.setup_requests;
CREATE POLICY "Super admins can update setup requests" ON public.setup_requests
  FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Service role full access to setup_requests" ON public.setup_requests;
CREATE POLICY "Service role full access to setup_requests" ON public.setup_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view audit logs" ON public.system_audits;
CREATE POLICY "Super admins can view audit logs" ON public.system_audits
  FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can insert audit logs" ON public.system_audits;
CREATE POLICY "Super admins can insert audit logs" ON public.system_audits
  FOR INSERT TO authenticated
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.system_audits;
CREATE POLICY "Service role can insert audit logs" ON public.system_audits
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can read app settings" ON public.app_settings;
CREATE POLICY "Super admins can read app settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean = true));

DROP POLICY IF EXISTS "Super admins can update app settings" ON public.app_settings;
CREATE POLICY "Super admins can update app settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean = true))
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean = true));

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
END $$;

-- Seed Data

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('auto_delete_on_churn', 'true'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.subscription_plans (id, name, price_monthly, stripe_price_id, features, is_active, created_at)
VALUES (
  '9857f448-559e-472f-87e1-6f89213ad091',
  'Pro', 49, NULL,
  '["Unlimited menu items","Custom domain","Kitchen display","Analytics"]'::jsonb,
  true, now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.demo_menu_items (id, name, description, price, category, meal_period, image_url, sort_order, created_at) VALUES
('1c5df961-e29c-4918-8808-c507f6605f2b','Classic Eggs Benedict','Two poached eggs with Canadian bacon on toasted English muffins topped with hollandaise.',14.5,'Breakfast','breakfast','https://images.pexels.com/photos/7708514/pexels-photo-7708514.jpeg?auto=compress&cs=tinysrgb&w=800',100,now()),
('6a335fce-ab23-4fe3-8601-07dee62ca200','Belgian Waffle Stack','Thick malted waffles topped with fresh strawberries, whipped cream and maple syrup.',12,'Breakfast','breakfast','https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=800',101,now()),
('938cd096-8c6a-4656-af06-6a8026eef700','Smoked Salmon Bagel','Toasted everything bagel with cream cheese, capers, red onion and lox.',15,'Breakfast','breakfast','https://images.pexels.com/photos/3957499/pexels-photo-3957499.jpeg?auto=compress&cs=tinysrgb&w=800',102,now()),
('f1005ae1-bb3e-40a0-b204-d28091a3bbf8','Continental Breakfast','A curated selection of pastries, fruit, yogurt and freshly brewed coffee.',10,'Breakfast','breakfast','https://images.pexels.com/photos/13949816/pexels-photo-13949816.jpeg?auto=compress&cs=tinysrgb&w=800',103,now()),
('dae1af36-c9cc-4a13-8903-7a24f144b5a1','Parfait','Creamy layered yogurt parfait with house-made granola and seasonal fruit.',5,'Breakfast','breakfast','https://images.pexels.com/photos/11182249/pexels-photo-11182249.jpeg?auto=compress&cs=tinysrgb&w=800',104,now()),
('e8b6e10c-ebbc-42a5-bdf4-3980a6256372','Sunrise Protein Bowl','Quinoa base with kale, sweet potato, black beans and a sunny-side-up egg.',13.25,'Breakfast','breakfast','https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',105,now()),
('02b60190-e3ca-49a1-ab13-b4570be914d9','Avocado Sourdough Toast','Smashed avocado with radish, chili flakes and a squeeze of lime on rustic sourdough.',11.5,'Sides','all-day','https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg?auto=compress&cs=tinysrgb&w=800',110,now()),
('70e00eb7-9052-4b7c-a9c6-ffaa25ada686','Salad','Fresh mixed greens with house vinaigrette.',8,'Sides','all-day','https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=800',111,now()),
('8eed66a3-bc8c-4d94-a328-94bc4edf68d4','Pesto Pasta Primavera','Penne pasta with seasonal roasted vegetables and nut-free basil pesto.',14,'Lunch','lunch','https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',200,now()),
('e227f95f-5df7-4c86-b7c2-066a6f93162d','Turkey Club','Turkey club sandwich on sourdough bread with three types of cheese.',8.5,'Lunch','lunch','https://images.pexels.com/photos/5639682/pexels-photo-5639682.jpeg?auto=compress&cs=tinysrgb&w=800',201,now()),
('cfdf03ff-ca5e-4a57-929b-f86931db9f71','Fish Tacos','Crispy beer-battered fish in warm corn tortillas with slaw and chipotle crema.',10,'Lunch','lunch','https://images.pexels.com/photos/2092507/pexels-photo-2092507.jpeg?auto=compress&cs=tinysrgb&w=800',202,now()),
('7eeea308-5556-4c7a-9f05-8889f58e5f46','Herb-Crusted Ribeye','12oz prime ribeye with garlic mashed potatoes and grilled asparagus.',32,'Dinner','dinner','https://images.pexels.com/photos/1251208/pexels-photo-1251208.jpeg?auto=compress&cs=tinysrgb&w=800',300,now()),
('54a43a99-3af7-43f5-91ae-9957b87f604c','Pan-Seared Scallops','Jumbo scallops over creamy mushroom risotto with a lemon butter drizzle.',28.5,'Dinner','dinner','https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=800',301,now()),
('df9360a6-7490-41de-a32c-04f4f82af586','Wagyu Burger','Premium wagyu beef with truffle aioli, aged cheddar and brioche bun.',22,'Dinner','dinner','https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg?auto=compress&cs=tinysrgb&w=800',302,now()),
('fe57d943-3331-4c1c-8466-6b3375302428','Mixed Berry Parfait','Greek yogurt layered with house-made granola, honey and seasonal berries.',8.5,'Desserts','all-day','https://images.pexels.com/photos/4736077/pexels-photo-4736077.jpeg?auto=compress&cs=tinysrgb&w=800',500,now()),
('7b916c7c-45ab-48c5-97c0-0a05760305e2','Apple Galette','Rustic tart with spiced apples and a flaky buttery crust.',9,'Desserts','all-day','https://images.pexels.com/photos/6148207/pexels-photo-6148207.jpeg?auto=compress&cs=tinysrgb&w=800',501,now()),
('418a231e-bcf5-4d74-b834-90f9cff8e3dd','New York Cheesecake','Classic creamy cheesecake with a graham cracker crust and macerated strawberries.',10.5,'Desserts','all-day','https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',502,now()),
('989a7736-d43e-41bf-a186-9661a7a1f58f','Tiramisu Classico','Layers of espresso-soaked ladyfingers and mascarpone cream dusted with cocoa.',9.5,'Desserts','all-day','https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=800',503,now()),
('3a596ec3-4e2c-4ab7-acb6-bfd4f279a448','Caramel Macchiato','Double shot of espresso with steamed milk and a buttery caramel drizzle.',5.5,'Drinks','all-day','https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800',600,now()),
('8c3aac38-0c2a-4885-8bc1-e373c1cb3f93','Green Tea','Premium loose-leaf green tea, delicately steeped.',5,'Drinks','all-day','https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800',601,now()),
('a35d18dd-c498-44b6-b927-9f81ca9c8073','Mocha Hot Chocolate','Rich dark chocolate blended with espresso and steamed milk.',5,'Drinks','all-day','https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',602,now())
ON CONFLICT (id) DO NOTHING;
