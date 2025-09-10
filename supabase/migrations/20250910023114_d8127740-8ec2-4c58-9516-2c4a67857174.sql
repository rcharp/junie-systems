-- Create services table with relationship to business_settings
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own services" 
ON public.services 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.business_settings bs 
  WHERE bs.id = services.business_id 
  AND bs.user_id = auth.uid()
));

CREATE POLICY "Users can create their own services" 
ON public.services 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.business_settings bs 
  WHERE bs.id = services.business_id 
  AND bs.user_id = auth.uid()
));

CREATE POLICY "Users can update their own services" 
ON public.services 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.business_settings bs 
  WHERE bs.id = services.business_id 
  AND bs.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own services" 
ON public.services 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.business_settings bs 
  WHERE bs.id = services.business_id 
  AND bs.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_services_business_id ON public.services(business_id);
CREATE INDEX idx_services_display_order ON public.services(business_id, display_order);