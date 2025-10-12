-- Assign admin role to admin@getjunie.com user
-- User ID: 1566ab9f-254c-454d-9454-d6b8e4af6965 (from auth logs)

INSERT INTO public.user_roles (user_id, role)
VALUES ('1566ab9f-254c-454d-9454-d6b8e4af6965', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;