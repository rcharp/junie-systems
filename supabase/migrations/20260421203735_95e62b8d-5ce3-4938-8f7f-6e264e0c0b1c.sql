CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.ghl_setup_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (contact_id, item_id)
);

CREATE INDEX idx_ghl_setup_checklist_contact_id ON public.ghl_setup_checklist(contact_id);

ALTER TABLE public.ghl_setup_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view checklist progress"
ON public.ghl_setup_checklist
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert checklist progress"
ON public.ghl_setup_checklist
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update checklist progress"
ON public.ghl_setup_checklist
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete checklist progress"
ON public.ghl_setup_checklist
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ghl_setup_checklist_updated_at
BEFORE UPDATE ON public.ghl_setup_checklist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();