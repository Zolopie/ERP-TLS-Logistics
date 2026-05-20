
-- Schema additions
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_open_to_all boolean NOT NULL DEFAULT false;

ALTER TABLE public.purchase_orders
  ALTER COLUMN supplier_id DROP NOT NULL;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Update RLS for purchase_orders: users can insert + view their own
DROP POLICY IF EXISTS "Authenticated read POs" ON public.purchase_orders;
CREATE POLICY "Users view own or admin view all POs"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own POs"
  ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- sales_orders RLS
DROP POLICY IF EXISTS "Authenticated read SOs" ON public.sales_orders;
CREATE POLICY "Users view own or admin view all SOs"
  ON public.sales_orders FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create sales order when PO is approved
CREATE OR REPLACE FUNCTION public.create_sales_order_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  so_count INT;
  new_so_number TEXT;
BEGIN
  IF NEW.status = 'Approved' AND (OLD.status IS DISTINCT FROM 'Approved') THEN
    SELECT COUNT(*) INTO so_count FROM public.sales_orders;
    new_so_number := 'SO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((so_count + 1)::text, 4, '0');

    INSERT INTO public.sales_orders (
      order_number, customer_name, order_date, items_count, total_amount,
      status, purchase_order_id, supplier_name, created_by
    ) VALUES (
      new_so_number,
      COALESCE((SELECT full_name FROM public.profiles WHERE user_id = NEW.created_by), 'Customer'),
      CURRENT_DATE,
      NEW.items_count,
      NEW.total_amount,
      'Processing',
      NEW.id,
      NEW.supplier_name,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_so_on_approval ON public.purchase_orders;
CREATE TRIGGER trg_create_so_on_approval
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.create_sales_order_on_approval();
