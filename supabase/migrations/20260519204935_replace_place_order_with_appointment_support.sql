/*
  # Replace place_order RPC with appointment support

  ## Summary
  Drops and recreates the `place_order` stored procedure to add two new optional parameters:
  - `p_appointment_date` (date): the client's requested appointment date
  - `p_appointment_time` (text): the time slot string, e.g. "10:00 AM"

  Both default to NULL so the standard restaurant flow is unaffected.
  The values are stored directly in the existing `appointment_date` and
  `appointment_time` columns on the `orders` table.
*/

DROP FUNCTION IF EXISTS place_order(uuid, text, text, text, numeric, jsonb);
DROP FUNCTION IF EXISTS place_order(uuid, text, text, text, numeric, jsonb, date, text);

CREATE FUNCTION place_order(
  p_restaurant_id   uuid,
  p_customer_name   text,
  p_customer_phone  text,
  p_customer_email  text,
  p_total           numeric,
  p_items           jsonb,
  p_appointment_date date    DEFAULT NULL,
  p_appointment_time text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item     jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurant_settings WHERE id = p_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;

  INSERT INTO orders (
    restaurant_id, customer_name, customer_phone, customer_email,
    total, status, appointment_date, appointment_time
  ) VALUES (
    p_restaurant_id, p_customer_name, p_customer_phone, p_customer_email,
    p_total, 'pending', p_appointment_date, p_appointment_time
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
