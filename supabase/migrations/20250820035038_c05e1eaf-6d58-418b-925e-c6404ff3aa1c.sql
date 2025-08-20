-- Add demo data for the AI answering service
INSERT INTO public.call_messages (
  user_id,
  caller_name,
  phone_number,
  email,
  message,
  urgency_level,
  best_time_to_call,
  call_type,
  status,
  created_at
) VALUES 
(
  '54b21009-f5f0-45bf-b126-d11094178719',
  'Sarah Johnson',
  '+1-555-0123',
  'sarah.johnson@email.com',
  'Hi, I''m interested in your services. I saw your website and would like to schedule a consultation. I''m available most weekdays after 2 PM. Please call me back when you have a chance. Thanks!',
  'medium',
  'Weekdays after 2 PM',
  'sales',
  'new',
  now() - interval '2 hours'
),
(
  '54b21009-f5f0-45bf-b126-d11094178719',
  'Mike Thompson',
  '+1-555-0456',
  null,
  'This is urgent! My heating system broke down and it''s freezing. I need someone to come out immediately. Please call me back ASAP at this number.',
  'urgent',
  'Immediately',
  'support',
  'new',
  now() - interval '4 hours'
),
(
  '54b21009-f5f0-45bf-b126-d11094178719',
  'Jennifer Davis',
  '+1-555-0789',
  'j.davis@company.com',
  'Hello, I have a question about your pricing for the premium package. Could someone call me back tomorrow morning between 9 and 11 AM? Thank you.',
  'low',
  'Tomorrow 9-11 AM',
  'inquiry',
  'read',
  now() - interval '1 day'
);

-- Add corresponding call logs
INSERT INTO public.call_logs (
  user_id,
  caller_name,
  phone_number,
  call_status,
  call_type,
  urgency_level,
  message,
  call_duration,
  created_at
) VALUES 
(
  '54b21009-f5f0-45bf-b126-d11094178719',
  'Sarah Johnson',
  '+1-555-0123',
  'completed',
  'sales',
  'medium',
  'Incoming call handled by AI assistant. Captured lead information and scheduled follow-up.',
  145,
  now() - interval '2 hours'
),
(
  '54b21009-f5f0-45bf-b126-d11094178719',
  'Mike Thompson',
  '+1-555-0456',
  'completed',
  'support',
  'urgent',
  'Emergency heating system call. AI assistant captured urgent request and contact details.',
  89,
  now() - interval '4 hours'
),
(
  '54b21009-f5f0-45bf-b126-d11094178719',
  'Jennifer Davis',
  '+1-555-0789',
  'completed',
  'inquiry',
  'low',
  'Pricing inquiry call handled successfully. Information provided and callback scheduled.',
  167,
  now() - interval '1 day'
);