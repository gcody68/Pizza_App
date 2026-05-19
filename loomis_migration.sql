-- =============================================================================
-- LOOMIS HQ RESTAURANT APP — FULL MIGRATION SCRIPT (IDEMPOTENT)
-- Target project: fdcdmnqcejfhbhxxkyrt
--
-- INSTRUCTIONS:
--   1. Go to https://supabase.com/dashboard/project/fdcdmnqcejfhbhxxkyrt/sql/new
--   2. Paste this entire script and click Run
--   3. After it completes, create your admin account via Authentication > Users
--   4. Run the claim query at the bottom to link your account to the restaurant
--
-- SAFE TO RE-RUN: Every statement uses IF EXISTS / IF NOT EXISTS / OR REPLACE /
-- DROP POLICY IF EXISTS so running this on an existing database will not error.
-- =============================================================================


-- =============================================================================
-- SECTION 1: EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- SECTION 2: FUNCTIONS
-- =============================================================================

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


-- =============================================================================
-- SECTION 3: TABLES
-- Schema matches the live target database exactly.
-- =============================================================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'user',
  email      text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- restaurant_settings
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

-- menu_items
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

-- demo_menu_items
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

-- gallery_items
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='gallery_items' AND column_name='image_url') THEN
    ALTER TABLE public.gallery_items ADD COLUMN image_url text NOT NULL DEFAULT '';
  END IF;
END $$;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- orders
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

-- order_items
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

-- customer_leads
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

-- affiliates (live schema: email NOT NULL, status with default 'active', no commission)
CREATE TABLE IF NOT EXISTS public.affiliates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  code       text NOT NULL UNIQUE,
  status     text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- referrals (live schema: referred_at, deactivated_at instead of code/created_at)
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

-- churn_events (live schema: restaurant_name, owner_email, stripe_subscription_id, ltv_at_churn, affiliate_id, affiliate_name, notes)
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='churn_events' AND column_name='restaurant_name') THEN
    ALTER TABLE public.churn_events ADD COLUMN restaurant_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='churn_events' AND column_name='owner_email') THEN
    ALTER TABLE public.churn_events ADD COLUMN owner_email text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='churn_events' AND column_name='ltv_at_churn') THEN
    ALTER TABLE public.churn_events ADD COLUMN ltv_at_churn numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='churn_events' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE public.churn_events ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;
ALTER TABLE public.churn_events ENABLE ROW LEVEL SECURITY;

-- setup_requests (live schema: login_email, desired_domain, menu_file_url, menu_file_name, notes)
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

-- subscription_plans (must come before subscriptions which references it)
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

-- subscriptions (live schema: cancelled_at, merchant_email, login_email — no trial_end/amount/currency/interval)
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

-- system_audits (live schema: actor_id, actor_email, impersonated_id, impersonated_email — NOT action/table_name/old_data/new_data)
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

-- app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 4: TRIGGERS
-- =============================================================================

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


-- =============================================================================
-- SECTION 5: RLS POLICIES
-- Each policy is dropped before creation so this script is safe to re-run.
-- =============================================================================

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;
CREATE POLICY "Super admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

-- restaurant_settings
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

-- menu_items
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

-- demo_menu_items
DROP POLICY IF EXISTS "Anyone can read demo menu items" ON public.demo_menu_items;
CREATE POLICY "Anyone can read demo menu items" ON public.demo_menu_items
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Authenticated users can read demo menu items" ON public.demo_menu_items;
CREATE POLICY "Authenticated users can read demo menu items" ON public.demo_menu_items
  FOR SELECT TO authenticated USING (true);

-- gallery_items
DROP POLICY IF EXISTS "Anyone can view gallery items" ON public.gallery_items;
CREATE POLICY "Anyone can view gallery items" ON public.gallery_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Owner can insert gallery items" ON public.gallery_items;
CREATE POLICY "Owner can insert gallery items" ON public.gallery_items
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Authenticated users can update gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Owner can update gallery items" ON public.gallery_items;
CREATE POLICY "Owner can update gallery items" ON public.gallery_items
  FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

DROP POLICY IF EXISTS "Authenticated users can delete gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Owner can delete gallery items" ON public.gallery_items;
CREATE POLICY "Owner can delete gallery items" ON public.gallery_items
  FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurant_settings WHERE owner_id = auth.uid())
    OR (((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean IS TRUE));

-- orders
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

-- order_items
DROP POLICY IF EXISTS "anon_insert_order_items" ON public.order_items;
CREATE POLICY "anon_insert_order_items" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (1 = 1);

DROP POLICY IF EXISTS "Owners can read order items for their orders" ON public.order_items;
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

-- customer_leads
DROP POLICY IF EXISTS "Anyone can upsert customer leads" ON public.customer_leads;
CREATE POLICY "Anyone can upsert customer leads" ON public.customer_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update customer leads" ON public.customer_leads;
CREATE POLICY "Anyone can update customer leads" ON public.customer_leads
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view customer leads" ON public.customer_leads;
CREATE POLICY "Authenticated users can view customer leads" ON public.customer_leads
  FOR SELECT TO authenticated USING (true);

-- subscription_plans
DROP POLICY IF EXISTS "Anyone authenticated can view plans" ON public.subscription_plans;
CREATE POLICY "Anyone authenticated can view plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

-- subscriptions
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

-- affiliates
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

-- referrals
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

-- churn_events
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

-- setup_requests
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

-- system_audits
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

-- app_settings
DROP POLICY IF EXISTS "Super admins can read app settings" ON public.app_settings;
CREATE POLICY "Super admins can read app settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean = true));

DROP POLICY IF EXISTS "Super admins can update app settings" ON public.app_settings;
CREATE POLICY "Super admins can update app settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean = true))
  WITH CHECK ((((auth.jwt() -> 'app_metadata') ->> 'super_admin')::boolean = true));


-- =============================================================================
-- SECTION 6: REALTIME
-- =============================================================================
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


-- =============================================================================
-- SECTION 7: SEED DATA
-- =============================================================================

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('auto_delete_on_churn', 'true'::jsonb, '2026-05-08T16:06:38.621925+00:00')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.subscription_plans (id, name, price_monthly, stripe_price_id, features, is_active, created_at)
VALUES (
  '9857f448-559e-472f-87e1-6f89213ad091',
  'Pro', 49, NULL,
  '["Unlimited menu items","Custom domain","Kitchen display","Analytics"]'::jsonb,
  true, '2026-05-05T17:01:07.940793+00:00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.demo_menu_items (id, name, description, price, category, meal_period, image_url, sort_order, created_at) VALUES
('1c5df961-e29c-4918-8808-c507f6605f2b','Classic Eggs Benedict','Two poached eggs with Canadian bacon on toasted English muffins topped with hollandaise.',14.5,'Breakfast','breakfast','https://images.pexels.com/photos/7708514/pexels-photo-7708514.jpeg?auto=compress&cs=tinysrgb&w=800',100,'2026-05-08T18:13:35.407023+00:00'),
('6a335fce-ab23-4fe3-8601-07dee62ca200','Belgian Waffle Stack','Thick malted waffles topped with fresh strawberries, whipped cream and maple syrup.',12,'Breakfast','breakfast','https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=800',101,'2026-05-08T18:13:35.407023+00:00'),
('938cd096-8c6a-4656-af06-6a8026eef700','Smoked Salmon Bagel','Toasted everything bagel with cream cheese, capers, red onion and lox.',15,'Breakfast','breakfast','https://images.pexels.com/photos/3957499/pexels-photo-3957499.jpeg?auto=compress&cs=tinysrgb&w=800',102,'2026-05-08T18:13:35.407023+00:00'),
('f1005ae1-bb3e-40a0-b204-d28091a3bbf8','Continental Breakfast','A curated selection of pastries, fruit, yogurt and freshly brewed coffee.',10,'Breakfast','breakfast','https://images.pexels.com/photos/13949816/pexels-photo-13949816.jpeg?auto=compress&cs=tinysrgb&w=800',103,'2026-05-08T18:13:35.407023+00:00'),
('dae1af36-c9cc-4a13-8903-7a24f144b5a1','Parfait','Creamy layered yogurt parfait with house-made granola and seasonal fruit.',5,'Breakfast','breakfast','https://images.pexels.com/photos/11182249/pexels-photo-11182249.jpeg?auto=compress&cs=tinysrgb&w=800',104,'2026-05-08T18:13:35.407023+00:00'),
('e8b6e10c-ebbc-42a5-bdf4-3980a6256372','Sunrise Protein Bowl','Quinoa base with kale, sweet potato, black beans and a sunny-side-up egg.',13.25,'Breakfast','breakfast','https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',105,'2026-05-08T18:13:35.407023+00:00'),
('02b60190-e3ca-49a1-ab13-b4570be914d9','Avocado Sourdough Toast','Smashed avocado with radish, chili flakes and a squeeze of lime on rustic sourdough.',11.5,'Sides','all-day','https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg?auto=compress&cs=tinysrgb&w=800',110,'2026-05-08T18:13:35.407023+00:00'),
('70e00eb7-9052-4b7c-a9c6-ffaa25ada686','Salad','Fresh mixed greens with house vinaigrette.',8,'Sides','all-day','https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=800',111,'2026-05-08T18:13:35.407023+00:00'),
('8eed66a3-bc8c-4d94-a328-94bc4edf68d4','Pesto Pasta Primavera','Penne pasta with seasonal roasted vegetables and nut-free basil pesto.',14,'Lunch','lunch','https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',200,'2026-05-08T18:13:35.407023+00:00'),
('e227f95f-5df7-4c86-b7c2-066a6f93162d','Turkey Club','Turkey club sandwich on sourdough bread with three types of cheese.',8.5,'Lunch','lunch','https://images.pexels.com/photos/5639682/pexels-photo-5639682.jpeg?auto=compress&cs=tinysrgb&w=800',201,'2026-05-08T18:13:35.407023+00:00'),
('cfdf03ff-ca5e-4a57-929b-f86931db9f71','Fish Tacos','Crispy beer-battered fish in warm corn tortillas with slaw and chipotle crema.',10,'Lunch','lunch','https://images.pexels.com/photos/2092507/pexels-photo-2092507.jpeg?auto=compress&cs=tinysrgb&w=800',202,'2026-05-08T18:13:35.407023+00:00'),
('7eeea308-5556-4c7a-9f05-8889f58e5f46','Herb-Crusted Ribeye','12oz prime ribeye with garlic mashed potatoes and grilled asparagus.',32,'Dinner','dinner','https://images.pexels.com/photos/1251208/pexels-photo-1251208.jpeg?auto=compress&cs=tinysrgb&w=800',300,'2026-05-08T18:13:35.407023+00:00'),
('54a43a99-3af7-43f5-91ae-9957b87f604c','Pan-Seared Scallops','Jumbo scallops over creamy mushroom risotto with a lemon butter drizzle.',28.5,'Dinner','dinner','https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=800',301,'2026-05-08T18:13:35.407023+00:00'),
('df9360a6-7490-41de-a32c-04f4f82af586','Wagyu Burger','Premium wagyu beef with truffle aioli, aged cheddar and brioche bun.',22,'Dinner','dinner','https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg?auto=compress&cs=tinysrgb&w=800',302,'2026-05-08T18:13:35.407023+00:00'),
('fe57d943-3331-4c1c-8466-6b3375302428','Mixed Berry Parfait','Greek yogurt layered with house-made granola, honey and seasonal berries.',8.5,'Desserts','all-day','https://images.pexels.com/photos/4736077/pexels-photo-4736077.jpeg?auto=compress&cs=tinysrgb&w=800',500,'2026-05-08T18:13:35.407023+00:00'),
('7b916c7c-45ab-48c5-97c0-0a05760305e2','Apple Galette','Rustic tart with spiced apples and a flaky buttery crust.',9,'Desserts','all-day','https://images.pexels.com/photos/6148207/pexels-photo-6148207.jpeg?auto=compress&cs=tinysrgb&w=800',501,'2026-05-08T18:13:35.407023+00:00'),
('418a231e-bcf5-4d74-b834-90f9cff8e3dd','New York Cheesecake','Classic creamy cheesecake with a graham cracker crust and macerated strawberries.',10.5,'Desserts','all-day','https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',502,'2026-05-08T18:13:35.407023+00:00'),
('989a7736-d43e-41bf-a186-9661a7a1f58f','Tiramisu Classico','Layers of espresso-soaked ladyfingers and mascarpone cream dusted with cocoa.',9.5,'Desserts','all-day','https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=800',503,'2026-05-08T18:13:35.407023+00:00'),
('3a596ec3-4e2c-4ab7-acb6-bfd4f279a448','Caramel Macchiato','Double shot of espresso with steamed milk and a buttery caramel drizzle.',5.5,'Drinks','all-day','https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800',600,'2026-05-08T18:13:35.407023+00:00'),
('8c3aac38-0c2a-4885-8bc1-e373c1cb3f93','Green Tea','Premium loose-leaf green tea, delicately steeped.',5,'Drinks','all-day','https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800',601,'2026-05-08T18:13:35.407023+00:00'),
('a35d18dd-c498-44b6-b927-9f81ca9c8073','Mocha Hot Chocoloate','Rich dark chocolate blended with espresso and steamed milk.',5,'Drinks','all-day','https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',602,'2026-05-08T18:13:35.407023+00:00')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 8: YOUR RESTAURANT DATA
--
-- Inserted with owner_id = NULL so RLS does not block it.
-- After creating your admin account, run this to claim it (replace YOUR_NEW_USER_ID):
--
--   UPDATE restaurant_settings
--   SET owner_id = 'YOUR_NEW_USER_ID'
--   WHERE id = 'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1';
-- =============================================================================

ALTER TABLE public.restaurant_settings DISABLE TRIGGER trg_seed_starter_menu;

INSERT INTO public.restaurant_settings (
  id, business_name, business_address, business_phone, header_image_url,
  theme, payment_enabled, stripe_public_key, stripe_secret_key,
  kitchen_view_enabled, show_gallery, bg_style, logo_url,
  service_hours, unavailable_display, owner_id, subdomain, custom_domain,
  business_hours, custom_domain_verified, sales_tax_rate, billing_email,
  created_at, updated_at
) VALUES (
  'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',
  'admin', '', '',
  'https://lh3.googleusercontent.com/d/1uOExCqGDDESM8Xvzc9BIcOdsaZVNQ135',
  'midnight-gold', true,
  NULL,
  NULL,
  true, false, 'deep-charcoal', NULL,
  '{"lunch":{"end":"16:00","start":"11:00","enabled":true},"dinner":{"end":"23:00","start":"16:00","enabled":true},"breakfast":{"end":"11:00","start":"06:00","enabled":true}}'::jsonb,
  'hide', NULL, NULL, 'workoutdailyfree-apparel.com',
  '{"open":"06:00","close":"23:00"}'::jsonb,
  false, 3.5, NULL,
  '2026-05-08T05:21:28.194165+00:00', '2026-05-13T04:13:35.278929+00:00'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.restaurant_settings ENABLE TRIGGER trg_seed_starter_menu;

INSERT INTO public.menu_items (id, name, description, price, image_url, sort_order, is_placeholder, created_at, updated_at, category, meal_period, is_available, daily_stock, restaurant_id, is_special, variants) VALUES
('09245d27-10be-4ff8-837e-d7779dd2bef4','Classic Eggs Benedict','Two poached eggs with Canadian bacon on toasted English muffins topped with hollandaise.',0.2,'https://images.pexels.com/photos/7708514/pexels-photo-7708514.jpeg?auto=compress&cs=tinysrgb&w=800',100,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:24:05.615473+00:00','Breakfast','breakfast',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,'[{"label":"Large","price":0.2,"isDefault":true},{"label":"Medium","price":0.19,"isDefault":false},{"label":"Small","price":0.18,"isDefault":false}]'::jsonb),
('da608235-5f1d-4123-ae70-440860166f71','Belgian Waffle Stack','Thick malted waffles topped with fresh strawberries, whipped cream and maple syrup.',0.2,'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=800',101,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:21:02.127509+00:00','Breakfast','breakfast',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('2d9243bf-d5ae-4fab-8934-0eb16e7061bb','Smoked Salmon Bagel','Toasted everything bagel with cream cheese, capers, red onion and lox.',0.22,'https://images.pexels.com/photos/3957499/pexels-photo-3957499.jpeg?auto=compress&cs=tinysrgb&w=800',102,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:21:09.801732+00:00','Breakfast','breakfast',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('c7380f4c-bf82-4fe5-a0ad-c0911294d620','Continental Breakfast','A curated selection of pastries, fruit, yogurt and freshly brewed coffee.',0.23,'https://images.pexels.com/photos/13949816/pexels-photo-13949816.jpeg?auto=compress&cs=tinysrgb&w=800',103,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:21:23.89455+00:00','Breakfast','breakfast',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('510cd857-e2fd-4d76-bda5-d3da947a318b','Parfait','Creamy layered yogurt parfait with house-made granola and seasonal fruit.',0.24,'https://images.pexels.com/photos/11182249/pexels-photo-11182249.jpeg?auto=compress&cs=tinysrgb&w=800',104,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:21:34.462984+00:00','Breakfast','breakfast',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('0963c803-acb7-420e-b62a-c50774cfefa7','Sunrise Protein Bowl','Quinoa base with kale, sweet potato, black beans and a sunny-side-up egg.',0.25,'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',105,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:21:42.231641+00:00','Breakfast','breakfast',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('a7a36071-c07b-4743-9c34-7f9ebd30523b','Avocado Sourdough Toast','Smashed avocado with radish, chili flakes and a squeeze of lime on rustic sourdough.',0.26,'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg?auto=compress&cs=tinysrgb&w=800',110,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:21:51.789588+00:00','Sides','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('81fe66f8-ab5b-4641-a871-8adf51649a87','Salad','Fresh mixed greens with house vinaigrette.',0.27,'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=800',111,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:21:59.831827+00:00','Sides','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('f98a641b-41bd-4883-a5c0-386930e6a80c','Pesto Pasta Primavera','Penne pasta with seasonal roasted vegetables and nut-free basil pesto.',0.28,'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',200,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:22:07.395836+00:00','Lunch','lunch',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('ef1c04dd-c540-4b00-954c-fe7098921fdd','Turkey Club','Turkey club sandwich on sourdough bread with three types of cheese.',0.29,'https://images.pexels.com/photos/5639682/pexels-photo-5639682.jpeg?auto=compress&cs=tinysrgb&w=800',201,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:22:15.40437+00:00','Lunch','lunch',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('0de5e1e6-b92e-4023-b2bc-62104e521ab0','Fish Tacos','Crispy beer-battered fish in warm corn tortillas with slaw and chipotle crema.',0.3,'https://images.pexels.com/photos/2092507/pexels-photo-2092507.jpeg?auto=compress&cs=tinysrgb&w=800',202,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:22:23.915688+00:00','Lunch','lunch',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('0dbd9719-90bd-4624-8195-42800962df8d','Herb-Crusted Ribeye','12oz prime ribeye with garlic mashed potatoes and grilled asparagus.',0.31,'https://images.pexels.com/photos/1251208/pexels-photo-1251208.jpeg?auto=compress&cs=tinysrgb&w=800',300,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:22:32.235734+00:00','Dinner','dinner',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('4ed1a271-9c84-48a2-9de7-6a62d1e0b06f','Pan-Seared Scallops','Jumbo scallops over creamy mushroom risotto with a lemon butter drizzle.',0.31,'https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=800',301,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:22:40.154138+00:00','Dinner','dinner',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('2b27b002-1a26-470e-b1cd-bbbb16d76c3d','Wagyu Burger','Premium wagyu beef with truffle aioli, aged cheddar and brioche bun.',1.07,'https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg?auto=compress&cs=tinysrgb&w=800',302,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:22:53.204387+00:00','Dinner','dinner',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('0768d9ea-59db-40b4-87dc-9d511be2538b','Mixed Berry Parfait','Greek yogurt layered with house-made granola, honey and seasonal berries.',0.25,'https://images.pexels.com/photos/4736077/pexels-photo-4736077.jpeg?auto=compress&cs=tinysrgb&w=800',500,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:23:09.811871+00:00','Desserts','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('88c17c29-12ad-45e4-a7c3-92b131722e10','Apple Galette','Rustic tart with spiced apples and a flaky buttery crust.',0.21,'https://images.pexels.com/photos/6148207/pexels-photo-6148207.jpeg?auto=compress&cs=tinysrgb&w=800',501,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:23:18.29405+00:00','Desserts','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('b2ea64ea-8501-48e7-bf95-5f9a8d45107b','New York Cheesecake','Classic creamy cheesecake with a graham cracker crust and macerated strawberries.',0.21,'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',502,false,'2026-05-08T18:13:35.407023+00:00','2026-05-12T19:23:25.848819+00:00','Desserts','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('35b6e522-ebe7-49bb-872c-3c8e2404da28','Tiramisu Classico','Layers of espresso-soaked ladyfingers and mascarpone cream dusted with cocoa.',9.5,'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=800',503,false,'2026-05-08T18:13:35.407023+00:00','2026-05-08T18:13:35.407023+00:00','Desserts','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('1bfd07ca-0dd4-4a6a-afa0-4b20a92c50c3','Caramel Macchiato','Double shot of espresso with steamed milk and a buttery caramel drizzle.',5.5,'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800',600,false,'2026-05-08T18:13:35.407023+00:00','2026-05-08T18:13:35.407023+00:00','Drinks','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('6e58e31f-280a-447d-ad15-816e6434bb45','Green Tea','Premium loose-leaf green tea, delicately steeped.',5,'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800',601,false,'2026-05-08T18:13:35.407023+00:00','2026-05-08T18:13:35.407023+00:00','Drinks','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL),
('d29a6ad0-29c7-4dc1-afaf-5c945009806e','Mocha Hot Chocoloate','Rich dark chocolate blended with espresso and steamed milk.',5,'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',602,false,'2026-05-08T18:13:35.407023+00:00','2026-05-08T18:13:35.407023+00:00','Drinks','all-day',true,NULL,'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1',false,NULL)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- DONE!
-- Next steps:
--   1. Go to Authentication > Users and create your admin account
--   2. Copy the new user's UUID
--   3. Run this to claim your restaurant (replace YOUR_NEW_USER_ID):
--      UPDATE restaurant_settings SET owner_id = 'YOUR_NEW_USER_ID' WHERE id = 'bc0cd8ab-0240-4e40-bcd9-b0c5d375edf1';
--   4. The app is already pointed at this project — you are done!
-- =============================================================================
