-- Create todos table for development tasks
CREATE TABLE public.todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Create policies for todos (publicly accessible for admin functionality)
CREATE POLICY "Anyone can view todos" 
ON public.todos 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create todos" 
ON public.todos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update todos" 
ON public.todos 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete todos" 
ON public.todos 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial todos
INSERT INTO public.todos (text, priority, display_order) VALUES
  ('Schedule meetings on Google Calendar', 'high', 1),
  ('Create call information in user dashboard → messages/calls', 'high', 2),
  ('Remove setup guide after initial setup', 'medium', 3),
  ('Fix analytics in user dashboard to show correct data', 'high', 4),
  ('Implement call forwarding', 'medium', 5),
  ('Implement text notifications', 'medium', 6),
  ('Implement analytics in user dashboard', 'low', 7);