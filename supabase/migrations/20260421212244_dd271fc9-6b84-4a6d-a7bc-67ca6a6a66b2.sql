-- Deduplicate any existing rows, keeping the most recently updated
DELETE FROM public.ghl_setup_checklist a
USING public.ghl_setup_checklist b
WHERE a.contact_id = b.contact_id
  AND a.item_id = b.item_id
  AND a.updated_at < b.updated_at;

-- Also remove any remaining ties (same updated_at) keeping one
DELETE FROM public.ghl_setup_checklist a
USING public.ghl_setup_checklist b
WHERE a.contact_id = b.contact_id
  AND a.item_id = b.item_id
  AND a.id < b.id;

-- Add the unique constraint required for upsert ON CONFLICT
ALTER TABLE public.ghl_setup_checklist
ADD CONSTRAINT ghl_setup_checklist_contact_item_unique UNIQUE (contact_id, item_id);