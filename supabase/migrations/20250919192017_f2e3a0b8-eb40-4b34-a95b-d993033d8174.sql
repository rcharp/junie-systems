-- Create table for tracking business data requests
CREATE TABLE public.business_data_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'unknown',
  request_source TEXT NOT NULL DEFAULT 'unknown',
  request_data JSONB,
  response_status INTEGER NOT NULL DEFAULT 200,
  response_data JSONB,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_data_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all requests
CREATE POLICY "Admins can view all business data requests" 
ON public.business_data_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for service role to insert requests
CREATE POLICY "Service role can insert business data requests" 
ON public.business_data_requests 
FOR INSERT 
WITH CHECK (true);

-- Create policy for service role to update requests
CREATE POLICY "Service role can update business data requests" 
ON public.business_data_requests 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_data_requests_updated_at
BEFORE UPDATE ON public.business_data_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_business_data_requests_created_at ON public.business_data_requests(created_at DESC);
CREATE INDEX idx_business_data_requests_business_id ON public.business_data_requests(business_id);