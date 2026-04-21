// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Plus, Save, UserPlus, Check, ChevronsUpDown, Copy, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const SETUP_CHECKLIST_ITEMS: { id: string; label: string; note?: string }[] = [
  { id: 'disable-reselling', label: 'Disable Reselling options for the subaccount' },
  { id: 'custom-values', label: 'Update custom values' },
  { id: 'add-user', label: 'Add a user and configure their permissions' },
  { id: 'phone-number', label: 'Get a phone number', note: 'ONLY for Growth or Full System Plan customers' },
  { id: 'connect-gmb', label: 'Connect Google My Business account to GHL' },
  { id: 'reputation-settings', label: 'Update Reputation Management Settings' },
  { id: 'auto-reviews', label: 'Add automatic Google Reviews scheduling' },
  { id: 'edit-gmb', label: 'Edit and update Google My Business Page' },
  { id: 'chat-widget', label: 'Set up Chat Widget' },
];

const SetupChecklist = ({ contactId }: { contactId: string }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const completed = SETUP_CHECKLIST_ITEMS.filter((i) => checked[i.id]).length;
  const total = SETUP_CHECKLIST_ITEMS.length;

  useEffect(() => {
    if (!contactId) {
      setChecked({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ghl_setup_checklist')
        .select('item_id, completed')
        .eq('contact_id', contactId);
      if (!cancelled) {
        if (error) {
          toast({ title: 'Failed to load progress', description: error.message, variant: 'destructive' });
        } else {
          const map: Record<string, boolean> = {};
          (data || []).forEach((row: any) => { map[row.item_id] = !!row.completed; });
          setChecked(map);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  const toggleItem = async (itemId: string, value: boolean) => {
    if (!contactId) {
      toast({ title: 'No contact selected', description: 'Pick a contact above to track progress.', variant: 'destructive' });
      return;
    }
    setChecked((prev) => ({ ...prev, [itemId]: value }));
    const { error } = await supabase
      .from('ghl_setup_checklist')
      .upsert({ contact_id: contactId, item_id: itemId, completed: value }, { onConflict: 'contact_id,item_id' });
    if (error) {
      setChecked((prev) => ({ ...prev, [itemId]: !value }));
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  };

  if (!contactId) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Select a contact above to track setup progress.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {loading ? 'Loading…' : `${completed} of ${total} steps complete`}
      </div>
      <ul className="space-y-3">
        {SETUP_CHECKLIST_ITEMS.map((item, idx) => (
          <li key={item.id} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
            <Checkbox
              id={`setup-${item.id}`}
              checked={!!checked[item.id]}
              onCheckedChange={(v) => toggleItem(item.id, v === true)}
              className="mt-0.5"
            />
            <Label htmlFor={`setup-${item.id}`} className="flex-1 cursor-pointer leading-snug">
              <span className="font-medium">{idx + 1}. {item.label}</span>
              {item.note && (
                <span className="ml-2 text-xs text-muted-foreground">({item.note})</span>
              )}
            </Label>
          </li>
        ))}
      </ul>
      {completed === total ? (
        <div className="rounded-md border border-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/10 px-4 py-3 text-center text-sm font-semibold text-[hsl(142,71%,35%)]">
          Sub-account setup complete
        </div>
      ) : (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
          Sub-account setup not complete
        </div>
      )}
    </div>
  );
};

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

type CreateForm = {
  companyId: string;
  name: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  website: string;
  timezone: string;
  einNumber: string;
  snapshotId: string;
  customValuesJson: string;
};

const emptyCreate: CreateForm = {
  companyId: '',
  name: '',
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  website: '',
  timezone: 'America/New_York',
  einNumber: '',
  snapshotId: '',
  customValuesJson: '',
};

const CUSTOM_VALUES_PLACEHOLDER = '{\n  "business_description": "Family-owned plumbing company serving the Richmond area"\n}';

export const GhlAdmin = () => {
  // URL contact_id param - shared identifier for which customer's setup we're tracking
  const [urlContactId, setUrlContactId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('contact_id') || '';
  });

  useEffect(() => {
    const onPop = () => {
      setUrlContactId(new URLSearchParams(window.location.search).get('contact_id') || '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const updateContactIdParam = (id: string) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('contact_id', id);
    else url.searchParams.delete('contact_id');
    window.history.replaceState({}, '', url.toString());
    setUrlContactId(id);
  };

  // Setup tab contact picker state
  const [setupContacts, setSetupContacts] = useState<{ id: string; name: string; email: string; phone: string; companyName: string }[]>([]);
  const [setupContactSearch, setSetupContactSearch] = useState('');
  const [setupContactsLoading, setSetupContactsLoading] = useState(false);
  const [setupContactOpen, setSetupContactOpen] = useState(false);
  const [selectedSetupContactLabel, setSelectedSetupContactLabel] = useState('');

  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [creating, setCreating] = useState(false);

  const [updateLocationId, setUpdateLocationId] = useState('');
  const [updateForm, setUpdateForm] = useState({
    name: '', email: '', phone: '', firstName: '', lastName: '',
    address: '', city: '', state: '', postalCode: '', country: '', website: '', timezone: '',
  });
  const [updateCustomJson, setUpdateCustomJson] = useState('{}');
  const [updating, setUpdating] = useState(false);

  const [stripeCustomers, setStripeCustomers] = useState<any[]>([]);
  const [stripeLoading, setStripeLoading] = useState(false);

  const [contactId, setContactId] = useState('');
  const [loadingContact, setLoadingContact] = useState(false);

  // Create User tab state
  const [userForm, setUserForm] = useState({
    locationId: '',
    sourceLocationId: 'yvDlEJb1YBBk2JhD3map',
    contactId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin',
    type: 'account',
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdUserResult, setCreatedUserResult] = useState<any>(null);

  // Location dropdown
  const [locations, setLocations] = useState<{ id: string; name: string; email: string }[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  // Contact dropdown (searchable) — Create User tab
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string; phone: string; companyName: string }[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedContactLabel, setSelectedContactLabel] = useState('');

  // Contact dropdown (searchable) — Create Sub-account tab
  const [createContacts, setCreateContacts] = useState<{ id: string; name: string; email: string; phone: string; companyName: string }[]>([]);
  const [createContactSearch, setCreateContactSearch] = useState('');
  const [createContactsLoading, setCreateContactsLoading] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [selectedCreateContactLabel, setSelectedCreateContactLabel] = useState('');

  const loadLocations = async () => {
    setLocationsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-list-locations');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLocations(data.locations || []);
    } catch (e: any) {
      toast({ title: 'Failed to load locations', description: e.message, variant: 'destructive' });
    } finally {
      setLocationsLoading(false);
    }
  };

  useEffect(() => {
    if (locations.length === 0) loadLocations();
  }, []);

  useEffect(() => {
    if (!contactOpen) return;
    const t = setTimeout(async () => {
      setContactsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ghl-search-contacts', {
          body: { query: contactSearch },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setContacts(data.contacts || []);
      } catch (e: any) {
        toast({ title: 'Failed to search contacts', description: e.message, variant: 'destructive' });
      } finally {
        setContactsLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [contactSearch, contactOpen]);

  useEffect(() => {
    if (!createContactOpen) return;
    const t = setTimeout(async () => {
      setCreateContactsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ghl-search-contacts', {
          body: { query: createContactSearch },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setCreateContacts(data.contacts || []);
      } catch (e: any) {
        toast({ title: 'Failed to search contacts', description: e.message, variant: 'destructive' });
      } finally {
        setCreateContactsLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [createContactSearch, createContactOpen]);

  // Setup tab: debounced contact search
  useEffect(() => {
    if (!setupContactOpen) return;
    const t = setTimeout(async () => {
      setSetupContactsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ghl-search-contacts', {
          body: { query: setupContactSearch },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setSetupContacts(data.contacts || []);
      } catch (e: any) {
        toast({ title: 'Failed to search contacts', description: e.message, variant: 'destructive' });
      } finally {
        setSetupContactsLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [setupContactSearch, setupContactOpen]);

  const populateCreateFromContactId = async (cid: string) => {
    setLoadingContact(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-get-contact', {
        body: { contactId: cid },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      const c = data.contact || {};
      setCreateForm((f) => {
        let mergedCustomJson = f.customValuesJson;
        if (c.customValues && typeof c.customValues === 'object') {
          let existing: Record<string, string> = {};
          if (f.customValuesJson.trim()) {
            try { existing = JSON.parse(f.customValuesJson); } catch {}
          }
          const cleaned = Object.fromEntries(
            Object.entries(c.customValues).filter(([, v]) => v && String(v).trim())
          );
          mergedCustomJson = JSON.stringify({ ...existing, ...cleaned }, null, 2);
        }
        return {
          ...f,
          name: c.companyName || c.name || f.name,
          email: c.email || f.email,
          phone: c.phone || f.phone,
          firstName: c.firstName || f.firstName,
          lastName: c.lastName || f.lastName,
          address: c.address || f.address,
          city: c.city || f.city,
          state: c.state || f.state,
          postalCode: c.postalCode || f.postalCode,
          country: c.country || f.country,
          website: c.website || f.website,
          timezone: c.timezone || f.timezone,
          einNumber: c.einNumber || f.einNumber,
          customValuesJson: mergedCustomJson,
        };
      });
      toast({ title: 'Contact loaded', description: 'Form populated from GHL contact' });
    } catch (e: any) {
      toast({ title: 'Failed to load contact', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingContact(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.locationId.trim()) {
      toast({ title: 'Missing target location', variant: 'destructive' });
      return;
    }
    if (!userForm.contactId.trim()) {
      toast({ title: 'Pick a contact', variant: 'destructive' });
      return;
    }
    setCreatingUser(true);
    setCreatedUserResult(null);
    try {
      // Fetch contact details to get email/name/phone
      const { data: contactData, error: contactErr } = await supabase.functions.invoke('ghl-get-contact', {
        body: { contactId: userForm.contactId.trim() },
      });
      if (contactErr) throw contactErr;
      if (contactData?.error) throw new Error(contactData.error);
      const c = contactData.contact || {};
      if (!c.email) throw new Error('Contact has no email — required to create a user');

      const { data, error } = await supabase.functions.invoke('ghl-create-user', {
        body: {
          locationId: userForm.locationId.trim(),
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          email: c.email,
          phone: c.phone || '',
          role: 'admin',
          type: 'account',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      setCreatedUserResult(data);
      toast({ title: 'User created', description: data.action === 'added_location_to_existing_user' ? 'Added location to existing user' : 'New user created' });
    } catch (e: any) {
      toast({ title: 'Create user failed', description: e.message, variant: 'destructive' });
    } finally {
      setCreatingUser(false);
    }
  };

  const handlePopulateFromContact = async () => {
    if (!contactId.trim()) {
      toast({ title: 'Missing Contact ID', variant: 'destructive' });
      return;
    }
    setLoadingContact(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-get-contact', {
        body: { contactId: contactId.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      const c = data.contact || {};
      setCreateForm((f) => {
        let mergedCustomJson = f.customValuesJson;
        if (c.customValues && typeof c.customValues === 'object') {
          let existing: Record<string, string> = {};
          if (f.customValuesJson.trim()) {
            try { existing = JSON.parse(f.customValuesJson); } catch {}
          }
          const cleaned = Object.fromEntries(
            Object.entries(c.customValues).filter(([, v]) => v && String(v).trim())
          );
          mergedCustomJson = JSON.stringify({ ...existing, ...cleaned }, null, 2);
        }
        return {
          ...f,
          name: c.name || f.name,
          email: c.email || f.email,
          phone: c.phone || f.phone,
          firstName: c.firstName || f.firstName,
          lastName: c.lastName || f.lastName,
          address: c.address || f.address,
          city: c.city || f.city,
          state: c.state || f.state,
          postalCode: c.postalCode || f.postalCode,
          country: c.country || f.country,
          website: c.website || f.website,
          timezone: c.timezone || f.timezone,
          einNumber: c.einNumber || f.einNumber,
          customValuesJson: mergedCustomJson,
        };
      });
      toast({ title: 'Contact loaded', description: 'Form populated from GHL contact' });
    } catch (e: any) {
      toast({ title: 'Failed to load contact', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingContact(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('ghl-get-company-id');
        if (data?.companyId) setCreateForm((f) => ({ ...f, companyId: data.companyId }));
      } catch {}
    })();
  }, []);

  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; existing: any | null }>({ open: false, existing: null });

  // Lovable Prompt tab state
  const [promptForm, setPromptForm] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    hours: '',
    googleBusinessPage: '',
    existingWebsite: '',
    instagram: '',
    facebook: '',
    services: '',
    serviceAreas: '',
    aboutUs: '',
    trustBar: '',
    chatWidgetEmbed: '',
    quoteWebhook: '',
    reviewFormUrl: '',
    discountFormUrl: '',
    logoUrl: '',
    industry: '',
  });
  const [promptContacts, setPromptContacts] = useState<{ id: string; name: string; email: string; phone: string; companyName: string; tags: string[] }[]>([]);
  const [promptContactSearch, setPromptContactSearch] = useState('');
  const [promptContactsLoading, setPromptContactsLoading] = useState(false);
  const [promptContactOpen, setPromptContactOpen] = useState(false);
  const [selectedPromptContactLabel, setSelectedPromptContactLabel] = useState('');
  const [promptContactId, setPromptContactId] = useState('');
  const [loadingPromptContact, setLoadingPromptContact] = useState(false);
  const [promptContactPlan, setPromptContactPlan] = useState<string>('');

  const toTitleCase = (s: string) => {
    if (!s) return '';
    return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
  };

  const detectPlanFromTags = (tags: string[]): string => {
    const norm = tags.map((t) => (t || '').toLowerCase());
    if (norm.some((t) => t.includes('full'))) return 'Full Plan';
    if (norm.some((t) => t.includes('growth'))) return 'Growth Plan';
    if (norm.some((t) => t.includes('presence'))) return 'Presence Plan';
    return '';
  };

  useEffect(() => {
    if (!promptContactOpen) return;
    const t = setTimeout(async () => {
      setPromptContactsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ghl-search-contacts', {
          body: { query: promptContactSearch },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setPromptContacts(data.contacts || []);
      } catch (e: any) {
        toast({ title: 'Failed to search contacts', description: e.message, variant: 'destructive' });
      } finally {
        setPromptContactsLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [promptContactSearch, promptContactOpen]);

  const populatePromptFromContactId = async (cid: string) => {
    setLoadingPromptContact(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-get-contact', {
        body: { contactId: cid },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const c = data.contact || {};
      const cv = c.customValues || {};
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const found = Object.entries(cv).find(([key]) => key.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, ''));
          if (found && found[1]) return String(found[1]);
        }
        return '';
      };
      const fullAddress = [c.address, c.city, c.state, c.postalCode].filter(Boolean).join(', ');
      setPromptForm((f) => ({
        ...f,
        businessName: c.companyName || c.name || f.businessName,
        ownerName: [c.firstName, c.lastName].filter(Boolean).join(' ') || f.ownerName,
        phone: c.phone || f.phone,
        email: c.email || f.email,
        address: fullAddress || f.address,
        hours: cv.hours_of_operation || get('hours', 'hoursofoperation', 'businesshours') || f.hours,
        googleBusinessPage: get('googlebusinesspage', 'googlepage', 'gmblink', 'googlebusiness') || f.googleBusinessPage,
        existingWebsite: cv.existing_website_url || c.website || get('website', 'existingwebsite', 'existingwebsiteurl') || f.existingWebsite,
        instagram: cv.company_instagram_link || get('instagram', 'instagramurl') || f.instagram,
        facebook: cv.company_facebook_link || get('facebook', 'facebookurl') || f.facebook,
        services: cv.services_offered || get('services', 'servicesoffered') || f.services,
        serviceAreas: cv.service_areas || get('serviceareas', 'areas', 'cities') || f.serviceAreas,
        aboutUs: cv.about_us || get('aboutus', 'about', 'description', 'businessdescription') || f.aboutUs,
        trustBar: cv.trust_bar || get('trustbar', 'specialthings', 'usp') || f.trustBar,
        chatWidgetEmbed: get('chatwidget', 'chatembed', 'chatwidgetembed') || f.chatWidgetEmbed,
        quoteWebhook: get('quotewebhook', 'quoteformwebhook', 'quoteformurl') || f.quoteWebhook,
        reviewFormUrl: get('reviewformurl', 'reviewform', 'reviewurl') || f.reviewFormUrl,
        discountFormUrl: get('discountformurl', 'discountform', 'discounturl') || f.discountFormUrl,
        logoUrl: cv.company_logo_url || get('logo', 'logourl', 'companylogo', 'companylogourl') || f.logoUrl,
        industry: cv.company_industry || get('industry', 'companyindustry', 'businesstype') || f.industry,
      }));
      toast({ title: 'Contact loaded', description: 'Normalizing fields…' });

      // Run AI normalization on the messy fields
      try {
        const rawBusinessName = c.companyName || c.name || '';
        const rawOwnerName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        const rawPhone = c.phone || '';
        const rawServices = cv.services_offered || get('services', 'servicesoffered') || '';
        const rawAreas = cv.service_areas || get('serviceareas', 'areas', 'cities') || '';
        const rawAbout = cv.about_us || get('aboutus', 'about', 'description', 'businessdescription') || '';
        const rawTrust = cv.trust_bar || get('trustbar', 'specialthings', 'usp') || '';
        const rawIndustry = cv.company_industry || get('industry', 'companyindustry', 'businesstype') || '';

        const { data: norm, error: normErr } = await supabase.functions.invoke('normalize-prompt-fields', {
          body: {
            businessName: rawBusinessName,
            ownerName: rawOwnerName,
            phone: rawPhone,
            address: fullAddress,
            services: rawServices,
            serviceAreas: rawAreas,
            aboutUs: rawAbout,
            trustBar: rawTrust,
            industry: rawIndustry,
          },
        });
        if (normErr) throw normErr;
        if (norm?.error) throw new Error(norm.error);

        setPromptForm((f) => ({
          ...f,
          businessName: norm.businessName || f.businessName,
          ownerName: norm.ownerName || f.ownerName,
          phone: norm.phone || f.phone,
          services: norm.services || f.services,
          serviceAreas: norm.serviceAreas || f.serviceAreas,
          aboutUs: norm.aboutUs || f.aboutUs,
          trustBar: norm.trustBar || f.trustBar,
        }));
        toast({ title: 'Fields normalized', description: 'Cleaned services, areas, about us, and trust bar' });
      } catch (e: any) {
        toast({ title: 'Normalization skipped', description: e.message, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Failed to load contact', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingPromptContact(false);
    }
  };

  const buildLovablePrompt = () => {
    const v = (s: string, fallback = 'None') => (s && s.trim() ? s.trim() : fallback);
    const isPresence = promptContactPlan === 'Presence Plan';

    const toBulletList = (s: string) => {
      if (!s || !s.trim()) return '- None';
      return s
        .split(/[,\n;]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => `- ${x}`)
        .join('\n');
    };
    const servicesList = toBulletList(promptForm.services);
    const areasList = toBulletList(promptForm.serviceAreas);

    const techRows = isPresence
      ? `| Quote Form Email Recipient | ${v(promptForm.email)} |`
      : `| Chat Widget Embed Code | ${v(promptForm.chatWidgetEmbed)} |
| Quote Form Webhook URL | ${v(promptForm.quoteWebhook)} |
| Discount Form URL | ${v(promptForm.discountFormUrl)} |`;

    const reviewRedirect = promptForm.googleBusinessPage?.trim()
      ? `The 5-star and 4-star rating buttons on the /review page MUST redirect the user to the Google Business Page URL: ${promptForm.googleBusinessPage.trim()}.`
      : `No Google Business Page URL was provided — leave the existing 5-star/4-star button behavior on the /review page as-is.`;

    const technicalIntegrations = isPresence
      ? `Technical Integrations (Presence Plan):
- Quote Forms: The business is on the Presence Plan and does NOT have a chat widget, quote webhook, or discount form. Wire ALL quote/contact forms throughout the site (including forms on pages, in the popup modal, and on the /quote page) to ALWAYS send the submission as an email to the company email address: ${v(promptForm.email)}. Use the standard email-sending edge function pattern already used in the template. Do NOT include a chat widget. Do NOT include a /get-your-discount page or link to it.
- Review: Update the form on /review to POST to the Review Form URL from above. ${reviewRedirect}
- Existing Website URL: Only use the existing website URL to pull additional context/information about the business if needed to enrich the new site's content. Do NOT link to it from the new site.`
      : `Technical Integrations:
- Chat Widget Embed Code: Embed this code in the footer of the index page (place it in index.html) so it propagates across the entire site. Replace any existing chat widget embed code.
- Quote Form Webhook URL: On the Growth and Full plans, update ALL quote/contact forms throughout the site (including forms on pages, in the popup modal, and on the /quote page) to POST submissions to this webhook URL.
- Review: Update the form on /review to POST to the Review Form URL from above. ${reviewRedirect}
- Discount Form URL: Update the form on /get-your-discount to POST to the Discount Form URL from above.
- Existing Website URL: Only use the existing website URL to pull additional context/information about the business if needed to enrich the new site's content. Do NOT link to it from the new site.`;

    const businessInfoLines = isPresence
      ? `- /review page: replace where the form POSTs to the REVIEW FORM URL. Be sure to replace the logo with the company logo, or none.`
      : `- /review page: replace where the form POSTs to the REVIEW FORM URL. Be sure to replace the logo with the company logo, or none.
- /get-your-discount page: replace where the form POSTs to the DISCOUNT FORM URL.`;

    const stepSix = isPresence
      ? `6. Remove the chat widget from the footer (Presence Plan does not include a chat widget).`
      : `6. Replace the existing chat widget embed code in the footer with the new embed code provided.`;

    const stepSeven = isPresence
      ? `7. Update ALL quote/contact forms throughout the entire site to send submissions as an email to the business email address (${v(promptForm.email)}), including:
   - Quote forms embedded on individual pages
   - Quote form in the popup modal
   - Quote form on the dedicated /quote page
   - Any other quote/contact form instances
   Also remove the /get-your-discount page and any links to it (Presence Plan does not include the discount form).`
      : `7. Update ALL quote/contact forms throughout the entire site to POST to the provided quote form webhook URL, including:
   - Quote forms embedded on individual pages
   - Quote form in the popup modal
   - Quote form on the dedicated /quote page
   - Any other quote/contact form instances`;

    const deliverable = isPresence
      ? `Deliverable: A fully functional website with all new business information, updated color scheme, replaced imagery, no chat widget in footer, and all quote forms wired to email submissions to the business's email address, while maintaining 100% of the original template's functionality and user experience.`
      : `Deliverable: A fully functional website with all new business information, updated color scheme, replaced imagery, updated chat widget in footer, and all quote forms connected to the new webhook URL, while maintaining 100% of the original template's functionality and user experience.`;

    return `You are a senior web designer tasked with remixing this existing website template for a new business client. Your job is to replace all existing business information with the new client's information while preserving ALL existing functionality, layout structure, and interactive features. CRITICAL: Do NOT change any functionality, animations, interactions, or structural elements of the site. Only replace content and update the color scheme.

Information that will be used:

| Field | Value |
| --- | --- |
| Business Name | ${v(promptForm.businessName)} |
| Owner Name | ${v(promptForm.ownerName)} |
| Phone Number | ${v(promptForm.phone)} |
| Email Address | ${v(promptForm.email)} |
| Business Address | ${v(promptForm.address)} |
| Hours of Operation | ${v(promptForm.hours)} |
| Google Business Page | ${v(promptForm.googleBusinessPage)} |
| Existing Website URL | ${v(promptForm.existingWebsite)} |
| Instagram URL | ${v(promptForm.instagram)} |
| Facebook URL | ${v(promptForm.facebook)} |
| About Us | ${v(promptForm.aboutUs)} |
| Trust Bar | ${v(promptForm.trustBar)} |
${techRows}
| Review Form URL | ${v(promptForm.reviewFormUrl)} |
| Company Logo URL | ${promptForm.logoUrl?.trim() || ''} |
| Company Industry | ${v(promptForm.industry)} |

Services Offered:
${servicesList}

Service Areas:
${areasList}

Business Information to Replace:

- Business Name: Make sure to replace this everywhere on the site, including all the pages, in the quote form, and in any meta and SEO tags.
- Owner Name
- Phone Number
- Email
- Business Address
- Hours of Operation
- Google Business Page: If provided, use this to pull customer reviews to populate the "What our customers are saying" section of the landing page, as well as the "Trusted by X customers" section underneath the hero text. Also use this information to get the Google Map embed to replace the map embed on the home page, the contact pages, and everywhere else they appear on the site.
- Existing Website URL: if provided, visit this website to gather additional context and information about the business to enhance the content.
- Instagram: If provided, link the instagram icon in the footer to this link.
- Facebook: If provided, link the facebook icon in the footer to this link.
${businessInfoLines}

Services Offered: Use the bulleted list above. Treat each item as a separate service.

Service Areas: Use the bulleted list above. Treat each item as a separate service area.

About Us Section:
If this is None, create a professional, engaging About Us section based on the business name, services offered, and any information gathered from their existing website. Keep it authentic and focused on their expertise and commitment to customer service.

Trust Bar Section:
Update the trust bar section, directly under the hero section, with information from the Trust Bar section in the table above. If not provided, create the trust bar from information provided by and relevant to the business. Include proper icons for each of the items in the trust bar. Have a minimum of 3 and maximum of 5 items in the Trust Bar.

Hero Section information:
In the hero section, craft an appropriate H1 header and hero paragraph text for the business using the following information:
1. The About Us section from above
2. The Trust Bar section from above

${technicalIntegrations}

Logo: Use this URL for the company logo. Replace it in the navbar, in the footer, and anywhere else that the logo is located. In the navbar, set the logo to a fixed height of 150px, and keep the aspect ratio. On mobile, the logo should have a fixed width of 64px, maintaining the aspect ratio.

Photos: [25-50 photos uploaded separately - replace existing imagery throughout the site with these new photos in appropriate locations]. These photos will be attached separately, and will be used for the gallery and the "See Us In Action" section. These should be compressed, optimized, and cropped appropriately. If you can identify before and after photos of completed work, create before and after sliders on both the homepage as well as in the image gallery. Also, update the stock photos in the services section on the homepage to relevant photos that have been uploaded. If none can be found, use stock photos relevant to the industry. Important: DO NOT USE AI GENERATED IMAGES. Use actual stock photos from Pexels or Pixabay or Unsplash.

Blog:
Update the Blog section with blog articles that are relevant to the company industry, the services offered and the service areas.

Background Images:
For the background images behind the hero section and the Special Offers and Benefits section, use the best and most appropriate images that have been uploaded. Upscale the images to at least 1600px width, 4k resolution, and keep the aspect ratio. If none can be found, or none are appropriate or look good enough, use unique stock photos that are relevant to the industry.

Site content:
For content across the site, make sure that the information in it matches the Company Industry from the table above. This includes headers, paragraphs, subtext and subheaders, blog articles, and everything else on the site. Create a sitemap file.

For the "Homeowners Trust Us" header, update the heading to "Customers across [General Area] trust ${v(promptForm.businessName, '[Business Name]')}". Replace [General Area] with a SHORT, natural region name (e.g., a metro area, county, or state) inferred from the Service Areas list above — do NOT paste the full list of cities. Examples: "Greater Columbus", "Central Ohio", "the Richmond Metro".

Instructions:
1. Systematically go through every page and section of the website.
2. Replace all instances of the old business information with the new information provided above.
3. Update the logo in the header, footer, and any other locations where it appears.
4. Replace all photos with the newly provided images, maintaining the same layout and image placement structure.
5. Apply the new color scheme consistently across all pages and components.
${stepSix}
${stepSeven}
8. If an existing website URL is provided, visit it to gather additional details about the business (services descriptions, tone of voice, unique selling points) to make the content more accurate and comprehensive.
9. Ensure all contact information (phone, address, social media links, Google Business link) is updated throughout the site.
10. Update meta tags, page titles, and any SEO elements with the new business name and relevant information.
11. Verify all links are functional and point to the correct new destinations.
12. DO NOT alter any existing functionality, animations, forms, interactive elements, or structural layout.
13. Create a sitemap file.

${deliverable}`;
  };

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const handleCopyPrompt = async () => {
    const isPresence = promptContactPlan === 'Presence Plan';
    const requiredFields: { key: keyof typeof promptForm; label: string }[] = [
      { key: 'businessName', label: 'Business Name' },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'email', label: 'Email Address' },
      { key: 'address', label: 'Business Address' },
      { key: 'hours', label: 'Hours of Operation' },
      { key: 'googleBusinessPage', label: 'Google Business Page' },
      { key: 'industry', label: 'Company Industry' },
      { key: 'services', label: 'Services Offered' },
      { key: 'serviceAreas', label: 'Service Areas' },
      ...(isPresence ? [] : [
        { key: 'chatWidgetEmbed' as const, label: 'Chat Widget Embed Code' },
        { key: 'quoteWebhook' as const, label: 'Quote Form Webhook URL' },
        { key: 'discountFormUrl' as const, label: 'Discount Form URL' },
      ]),
    ];
    const missing = requiredFields.filter((f) => !promptForm[f.key]?.trim()).map((f) => f.label);
    if (missing.length) {
      toast({ title: 'Missing required fields', description: missing.join(', '), variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildLovablePrompt());
      setCopiedPrompt(true);
      toast({ title: 'Copied!', description: 'Prompt copied to clipboard' });
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const submitCreate = async (allowDuplicate: boolean) => {
    setCreating(true);
    try {
      let customValues: Record<string, string> | undefined;
      if (createForm.customValuesJson.trim()) {
        try {
          customValues = JSON.parse(createForm.customValuesJson);
        } catch {
          toast({ title: 'Invalid JSON', description: 'Custom values JSON is malformed', variant: 'destructive' });
          setCreating(false);
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke('ghl-create-subaccount', {
        body: { ...createForm, customValues, allowDuplicate },
      });
      let payload: any = data;
      if (error && (error as any).context?.json) {
        try { payload = await (error as any).context.json(); } catch {}
      }
      // Duplicate detected — prompt user
      if (!allowDuplicate && (payload?.duplicate || payload?.existing)) {
        setDuplicateDialog({ open: true, existing: payload.existing });
        return;
      }
      if (error) throw error;
      if (payload?.error) {
        throw new Error(payload.error + (payload.details ? ': ' + JSON.stringify(payload.details) : ''));
      }
      toast({ title: 'Sub-account created', description: `Location ID: ${payload.locationId}` });
      setUpdateLocationId(payload.locationId || '');
    } catch (e: any) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = async () => {
    const required: (keyof CreateForm)[] = [
      'companyId', 'name', 'email', 'phone', 'firstName', 'lastName',
      'address', 'city', 'state', 'postalCode', 'country', 'timezone', 'einNumber',
    ];
    const missing = required.filter((k) => !createForm[k]?.toString().trim());
    if (missing.length) {
      toast({ title: 'Missing required fields', description: missing.join(', '), variant: 'destructive' });
      return;
    }
    await submitCreate(false);
  };

  const handleUpdate = async () => {
    if (!updateLocationId) {
      toast({ title: 'Missing Location ID', variant: 'destructive' });
      return;
    }
    setUpdating(true);
    try {
      let customValues: Record<string, string> | undefined;
      if (updateCustomJson.trim() && updateCustomJson.trim() !== '{}') {
        try { customValues = JSON.parse(updateCustomJson); }
        catch { toast({ title: 'Invalid JSON', variant: 'destructive' }); setUpdating(false); return; }
      }
      const { data, error } = await supabase.functions.invoke('ghl-update-subaccount', {
        body: { locationId: updateLocationId, ...updateForm, customValues },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      toast({ title: 'Sub-account updated' });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const fetchStripe = async () => {
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-list-customers');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeCustomers(data.customers || []);
      toast({ title: 'Loaded', description: `${data.total} customers` });
    } catch (e: any) {
      toast({ title: 'Fetch failed', description: e.message, variant: 'destructive' });
    } finally {
      setStripeLoading(false);
    }
  };

  // Global contact picker — drives all 3 tabs
  const [globalContactOpen, setGlobalContactOpen] = useState(false);
  const [globalContactSearch, setGlobalContactSearch] = useState('');
  const [globalContacts, setGlobalContacts] = useState<{ id: string; name: string; email: string; phone: string; companyName: string; tags: string[] }[]>([]);
  const [globalContactsLoading, setGlobalContactsLoading] = useState(false);
  const [globalContactLabel, setGlobalContactLabel] = useState('');

  useEffect(() => {
    if (!globalContactOpen) return;
    if (globalContacts.length > 0) return; // already loaded
    setGlobalContactsLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ghl-search-contacts', {
          body: { tag: 'customer' },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const onlyCustomers = (data.contacts || []).filter((c: any) =>
          Array.isArray(c.tags) && c.tags.some((t: string) => (t || '').toLowerCase().trim() === 'customer')
        );
        setGlobalContacts(onlyCustomers);
      } catch (e: any) {
        toast({ title: 'Failed to load contacts', description: e.message, variant: 'destructive' });
      } finally {
        setGlobalContactsLoading(false);
      }
    })();
  }, [globalContactOpen, globalContacts.length]);

  const filteredGlobalContacts = globalContactSearch.trim()
    ? globalContacts.filter((c) => {
        const q = globalContactSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.companyName.toLowerCase().includes(q)
        );
      })
    : globalContacts;

  const handleGlobalContactSelect = (c: { id: string; name: string; companyName: string; tags: string[] }) => {
    const personDisplay = toTitleCase(c.name);
    const businessDisplay = toTitleCase(c.companyName);
    const combined = [personDisplay, businessDisplay].filter(Boolean).join(' - ') || personDisplay || businessDisplay || '(no name)';
    setGlobalContactLabel(combined);

    // Step 1 (Create Sub-account)
    setContactId(c.id);
    setSelectedCreateContactLabel(combined);
    populateCreateFromContactId(c.id);

    // Step 2 (Setup checklist) — drives via URL param
    setSelectedSetupContactLabel(combined);
    updateContactIdParam(c.id);

    // Step 3 (Lovable Prompt)
    setPromptContactId(c.id);
    setSelectedPromptContactLabel(combined);
    setPromptContactPlan(detectPlanFromTags(c.tags || []));
    populatePromptFromContactId(c.id);

    setGlobalContactOpen(false);
  };

  return (
    <Tabs defaultValue="create" className="w-full">
      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2 mb-4 mx-auto w-[60%] min-w-[500px] max-w-full">
        <Label className="text-base font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Populate from GHL Contact
        </Label>
        <p className="text-xs text-muted-foreground">
          Select a contact once to fill in fields across all three steps.
        </p>
        <Popover open={globalContactOpen} onOpenChange={setGlobalContactOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full h-12 justify-between font-normal text-base bg-background">
              <span className="truncate">{globalContactLabel || 'Search a contact...'}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name, email, phone..."
                value={globalContactSearch}
                onValueChange={setGlobalContactSearch}
              />
              <CommandList>
                {globalContactsLoading && <div className="p-3 text-xs text-muted-foreground">Loading customers...</div>}
                {!globalContactsLoading && filteredGlobalContacts.length === 0 && (
                  <CommandEmpty>No contacts found.</CommandEmpty>
                )}
                <CommandGroup>
                  {filteredGlobalContacts.map((c) => {
                    const personDisplay = toTitleCase(c.name);
                    const businessDisplay = toTitleCase(c.companyName);
                    const combined = [personDisplay, businessDisplay].filter(Boolean).join(' - ') || personDisplay || businessDisplay || '(no name)';
                    return (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => handleGlobalContactSelect(c)}
                      >
                        <Check className={cn('mr-2 h-4 w-4', urlContactId === c.id ? 'opacity-100' : 'opacity-0')} />
                        <div className="flex flex-col">
                          <span className="font-medium">{combined}</span>
                          <span className="text-xs text-muted-foreground">
                            {[c.email, c.phone].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate font-mono">{urlContactId}</span>
            {promptContactPlan && (
              <Badge variant="secondary" className="shrink-0">{promptContactPlan}</Badge>
            )}
          </div>
          {(loadingContact || loadingPromptContact) && <RefreshCw className="w-3 h-3 animate-spin shrink-0" />}
        </div>
      </div>

      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="create">Step 1: Create Sub-account</TabsTrigger>
        <TabsTrigger value="setup">Step 2: Set Up Sub-Account</TabsTrigger>
        <TabsTrigger value="prompt">Step 3: Create Website</TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create GHL Sub-account</CardTitle>
            <CardDescription>Creates a new location in your GHL agency and imports a snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Business Name" value={createForm.name} onChange={(v) => setCreateForm({ ...createForm, name: v })} required />
              <Field label="First Name" value={createForm.firstName} onChange={(v) => setCreateForm({ ...createForm, firstName: v })} required />
              <Field label="Last Name" value={createForm.lastName} onChange={(v) => setCreateForm({ ...createForm, lastName: v })} required />
              <Field label="Email" value={createForm.email} onChange={(v) => setCreateForm({ ...createForm, email: v })} required />
              <Field label="Phone" value={createForm.phone} onChange={(v) => setCreateForm({ ...createForm, phone: v })} required />
              <Field label="Website" value={createForm.website} onChange={(v) => setCreateForm({ ...createForm, website: v })} />
              <Field label="Timezone" value={createForm.timezone} onChange={(v) => setCreateForm({ ...createForm, timezone: v })} required />
              <Field label="Address" value={createForm.address} onChange={(v) => setCreateForm({ ...createForm, address: v })} required />
              <Field label="City" value={createForm.city} onChange={(v) => setCreateForm({ ...createForm, city: v })} required />
              <div>
                <Label>State<span className="text-destructive ml-0.5">*</span></Label>

                <Select value={createForm.state} onValueChange={(v) => setCreateForm({ ...createForm, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Postal Code" value={createForm.postalCode} onChange={(v) => setCreateForm({ ...createForm, postalCode: v })} required />
              <Field label="Country" value={createForm.country} onChange={(v) => setCreateForm({ ...createForm, country: v })} required />
              <Field label="Business Tax ID / EIN" value={createForm.einNumber} onChange={(v) => setCreateForm({ ...createForm, einNumber: v })} required placeholder="12-3456789" />
              <Field label="Snapshot ID (override)" value={createForm.snapshotId} onChange={(v) => setCreateForm({ ...createForm, snapshotId: v })} placeholder="Defaults to GHL_SNAPSHOT_ID secret" />
            </div>
            <div>
              <Label>Custom Values (JSON, optional)</Label>
              <Textarea
                rows={5}
                value={createForm.customValuesJson}
                onChange={(e) => setCreateForm({ ...createForm, customValuesJson: e.target.value })}
                placeholder={CUSTOM_VALUES_PLACEHOLDER}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Sub-account
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled
                onClick={() =>
                  setCreateForm((f) => ({
                    ...f,
                    name: 'Test Plumbing Co',
                    email: `test+${Date.now()}@example.com`,
                    phone: '+15555550123',
                    firstName: 'Test',
                    lastName: 'User',
                    address: '123 Main St',
                    city: 'Richmond',
                    state: 'VA',
                    postalCode: '23220',
                    country: 'US',
                    website: 'https://example.com',
                    timezone: 'America/New_York',
                    einNumber: '12-3456789',
                  }))
                }
              >
                Fill Test Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="update">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Save className="w-5 h-5" /> Update GHL Sub-account</CardTitle>
            <CardDescription>Update contact info and custom values for an existing location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Location ID *" value={updateLocationId} onChange={setUpdateLocationId} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(updateForm).map(([k, v]) => (
                <Field key={k} label={k} value={v as string} onChange={(val) => setUpdateForm({ ...updateForm, [k]: val })} />
              ))}
            </div>
            <div>
              <Label>Custom Values (JSON)</Label>
              <Textarea rows={5} value={updateCustomJson} onChange={(e) => setUpdateCustomJson(e.target.value)} className="font-mono text-xs" />
            </div>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update Sub-account
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="user">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Create GHL User</CardTitle>
            <CardDescription>
              Create a user inside an existing sub-account location. Optionally pass a Contact ID to auto-fill name/email/phone from a GHL contact.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Target Location *</Label>
                <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {userForm.locationId
                          ? locations.find((l) => l.id === userForm.locationId)?.name || userForm.locationId
                          : 'Select a sub-account...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search sub-accounts..." />
                      <CommandList>
                        {locationsLoading && <div className="p-3 text-xs text-muted-foreground">Loading...</div>}
                        <CommandEmpty>No sub-accounts found.</CommandEmpty>
                        <CommandGroup>
                          {locations.map((loc) => (
                            <CommandItem
                              key={loc.id}
                              value={`${loc.name} ${loc.email} ${loc.id}`}
                              onSelect={() => {
                                setUserForm({ ...userForm, locationId: loc.id });
                                setLocationOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', userForm.locationId === loc.id ? 'opacity-100' : 'opacity-0')} />
                              <div className="flex flex-col">
                                <span>{loc.name}</span>
                                {loc.email && <span className="text-xs text-muted-foreground">{loc.email}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground truncate">{userForm.locationId}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={loadLocations} disabled={locationsLoading}>
                    <RefreshCw className={cn('w-3 h-3', locationsLoading && 'animate-spin')} />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Contact *</Label>
                <Popover open={contactOpen} onOpenChange={setContactOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {userForm.contactId ? selectedContactLabel || userForm.contactId : 'Search a contact...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by name, email, phone..."
                        value={contactSearch}
                        onValueChange={setContactSearch}
                      />
                      <CommandList>
                        {contactsLoading && <div className="p-3 text-xs text-muted-foreground">Searching...</div>}
                        {!contactsLoading && contacts.length === 0 && (
                          <CommandEmpty>No contacts found.</CommandEmpty>
                        )}
                        <CommandGroup>
                          {contacts.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.id}
                              onSelect={() => {
                                const label = `${c.name}${c.email ? ` — ${c.email}` : ''}`;
                                setUserForm({ ...userForm, contactId: c.id });
                                setSelectedContactLabel(label);
                                setContactOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', userForm.contactId === c.id ? 'opacity-100' : 'opacity-0')} />
                              <div className="flex flex-col">
                                <span>{c.name}{c.companyName ? ` · ${c.companyName}` : ''}</span>
                                <span className="text-xs text-muted-foreground">
                                  {[c.email, c.phone].filter(Boolean).join(' · ')}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground truncate block mt-1">{userForm.contactId}</span>
              </div>
            </div>

            <Button onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Create User
            </Button>

            {createdUserResult && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono space-y-2">
                {createdUserResult.generatedPassword && (
                  <div>
                    <Badge variant="secondary">Generated Password</Badge>{' '}
                    <span className="font-bold">{createdUserResult.generatedPassword}</span>
                  </div>
                )}
                <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(createdUserResult.user, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="setup">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Check className="w-5 h-5" /> Set Up Sub-Account Checklist</CardTitle>
            <CardDescription>Complete these steps after creating the sub-account to fully configure it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SetupChecklist contactId={urlContactId} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="prompt">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Create Lovable Website Prompt</CardTitle>
            <CardDescription>Select a contact to auto-fill business information, then copy the generated prompt to remix a website template in Lovable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field required label="Business Name" value={promptForm.businessName} onChange={(v) => setPromptForm({ ...promptForm, businessName: v })} />
              <Field required label="Owner Name" value={promptForm.ownerName} onChange={(v) => setPromptForm({ ...promptForm, ownerName: v })} />
              <Field required label="Phone Number" value={promptForm.phone} onChange={(v) => setPromptForm({ ...promptForm, phone: v })} />
              <Field required label="Email Address" value={promptForm.email} onChange={(v) => setPromptForm({ ...promptForm, email: v })} />
              <Field required label="Business Address" value={promptForm.address} onChange={(v) => setPromptForm({ ...promptForm, address: v })} />
              <Field required label="Hours of Operation" value={promptForm.hours} onChange={(v) => setPromptForm({ ...promptForm, hours: v })} placeholder="Mon-Fri 8a-6p" />
              <Field required label="Google Business Page" value={promptForm.googleBusinessPage} onChange={(v) => setPromptForm({ ...promptForm, googleBusinessPage: v })} placeholder="URL" />
              <Field label="Existing Website URL" value={promptForm.existingWebsite} onChange={(v) => setPromptForm({ ...promptForm, existingWebsite: v })} placeholder="URL or None" />
              <Field label="Instagram URL" value={promptForm.instagram} onChange={(v) => setPromptForm({ ...promptForm, instagram: v })} placeholder="URL or None" />
              <Field label="Facebook URL" value={promptForm.facebook} onChange={(v) => setPromptForm({ ...promptForm, facebook: v })} placeholder="URL or None" />
              <Field required label="Company Industry" value={promptForm.industry} onChange={(v) => setPromptForm({ ...promptForm, industry: v })} placeholder="Plumbing, HVAC, etc." />
              <Field label="Company Logo URL" value={promptForm.logoUrl} onChange={(v) => setPromptForm({ ...promptForm, logoUrl: v })} placeholder="https://... (or leave blank)" />
              <Field
                required={promptContactPlan !== 'Presence Plan'}
                disabled={promptContactPlan === 'Presence Plan'}
                label="Chat Widget Embed Code"
                value={promptForm.chatWidgetEmbed}
                onChange={(v) => setPromptForm({ ...promptForm, chatWidgetEmbed: v })}
                placeholder={promptContactPlan === 'Presence Plan' ? 'Not included on Presence Plan' : '<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="XXXXXXXXXXXXXXXXXXXXXXXX"></script>'}
                multiline
                helpTitle="How to find the Chat Widget Embed Code"
                helpContent={
                  <div className="space-y-4">
                    <div className="relative w-full" style={{ paddingBottom: '62.5%', height: 0 }}>
                      <iframe
                        src="https://www.loom.com/embed/e02f2b7c082b4e12beace8e654fe1ef4"
                        frameBorder={0}
                        allowFullScreen
                        className="absolute inset-0 w-full h-full rounded-md"
                        title="How to find the Chat Widget Embed Code"
                      />
                    </div>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li>Open the newly created company <strong>Subaccount</strong> in GoHighLevel.</li>
                      <li>Navigate to <strong>Sites</strong> → <strong>Chat Widget</strong>.</li>
                      <li>Configure (or open) the chat widget and locate the <strong>Embed Code</strong>.</li>
                      <li>Copy the full embed code snippet and paste it here.</li>
                    </ol>
                  </div>
                }
              />
              <Field
                required={promptContactPlan !== 'Presence Plan'}
                disabled={promptContactPlan === 'Presence Plan'}
                label="Quote Form Webhook URL"
                value={promptForm.quoteWebhook}
                onChange={(v) => setPromptForm({ ...promptForm, quoteWebhook: v })}
                placeholder={promptContactPlan === 'Presence Plan' ? 'Quote forms will email the business' : 'https://services.leadconnectorhq.com/hooks/XXXXXXXXXXXXXXXXXXXX/webhook-trigger/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                helpTitle="How to find the Quote Form Webhook URL"
                helpContent={
                  <div className="space-y-4">
                    <div className="relative w-full" style={{ paddingBottom: '62.5%', height: 0 }}>
                      <iframe
                        src="https://www.loom.com/embed/af2c666052f141628af2719f21fe08c2"
                        frameBorder={0}
                        allowFullScreen
                        className="absolute inset-0 w-full h-full rounded-md"
                        title="How to find the Quote Form Webhook URL"
                      />
                    </div>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li>Open the newly created company <strong>Subaccount</strong> in GoHighLevel.</li>
                      <li>Navigate to <strong>Automation</strong>.</li>
                      <li>Open the <strong>Incoming Lead Workflows</strong>.</li>
                      <li>Open the <strong>"Form Submission → Confirmation"</strong> workflow.</li>
                      <li>Copy the inbound webhook <strong>URL</strong> and paste it here.</li>
                    </ol>
                  </div>
                }
              />
              <Field
                required
                label="Review Form Webhook URL"
                value={promptForm.reviewFormUrl}
                onChange={(v) => setPromptForm({ ...promptForm, reviewFormUrl: v })}
                placeholder="https://services.leadconnectorhq.com/hooks/XXXXXXXXXXXXXXXXXXXX/webhook-trigger/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                helpTitle="How to find the Review Form Webhook URL"
                helpContent={
                  <div className="space-y-4">
                    <div className="relative w-full" style={{ paddingBottom: '62.5%', height: 0 }}>
                      <iframe
                        src="https://www.loom.com/embed/0907d2a2b7d9469c95a23c9596a9b37f"
                        frameBorder={0}
                        allowFullScreen
                        className="absolute inset-0 w-full h-full rounded-md"
                        title="How to find the Review Form URL"
                      />
                    </div>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li>Open the newly created company <strong>Subaccount</strong> in GoHighLevel.</li>
                      <li>Navigate to <strong>Automation</strong>.</li>
                      <li>Open the <strong>Review / Referral Workflows</strong>.</li>
                      <li>Find the <strong>Inbound Webhook</strong> trigger.</li>
                      <li>Copy the <strong>URL</strong> from the inbound webhook and paste it here.</li>
                    </ol>
                  </div>
                }
              />
              <Field
                required={promptContactPlan !== 'Presence Plan'}
                disabled={promptContactPlan === 'Presence Plan'}
                label="Discount Form Webhook URL"
                value={promptForm.discountFormUrl}
                onChange={(v) => setPromptForm({ ...promptForm, discountFormUrl: v })}
                placeholder={promptContactPlan === 'Presence Plan' ? 'Not included on Presence Plan' : 'https://services.leadconnectorhq.com/hooks/XXXXXXXXXXXXXXXXXXXX/webhook-trigger/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                helpTitle="How to find the Discount Form Webhook URL"
                helpContent={
                  <div className="space-y-4">
                    <div className="relative w-full" style={{ paddingBottom: '62.5%', height: 0 }}>
                      <iframe
                        src="https://www.loom.com/embed/db46ccc583354c518a38483d3ec9cfac"
                        frameBorder={0}
                        allowFullScreen
                        className="absolute inset-0 w-full h-full rounded-md"
                        title="How to find the Discount Form URL"
                      />
                    </div>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li>Open the newly created company <strong>Subaccount</strong> in GoHighLevel.</li>
                      <li>Navigate to <strong>Automation</strong>.</li>
                      <li>Open the <strong>Review / Referral Workflows</strong>.</li>
                      <li>Open the <strong>"Discount form filled in → notify lead and contractor"</strong> workflow.</li>
                      <li>Copy the <strong>Inbound Webhook URL</strong> and paste it here.</li>
                    </ol>
                  </div>
                }
              />
            </div>
            <div>
              <Label>Services Offered<span className="text-destructive ml-0.5">*</span></Label>
              <Textarea rows={2} value={promptForm.services} onChange={(e) => setPromptForm({ ...promptForm, services: e.target.value })} placeholder="Comma separated list" />
            </div>
            <div>
              <Label>Service Areas<span className="text-destructive ml-0.5">*</span></Label>
              <Textarea rows={2} value={promptForm.serviceAreas} onChange={(e) => setPromptForm({ ...promptForm, serviceAreas: e.target.value })} placeholder="Comma separated list of cities" />
            </div>
            <div>
              <Label>About Us</Label>
              <Textarea rows={3} value={promptForm.aboutUs} onChange={(e) => setPromptForm({ ...promptForm, aboutUs: e.target.value })} placeholder="Leave blank to auto-generate" />
            </div>
            <div>
              <Label>Trust Bar</Label>
              <Textarea rows={2} value={promptForm.trustBar} onChange={(e) => setPromptForm({ ...promptForm, trustBar: e.target.value })} placeholder="Leave blank to auto-generate" />
            </div>

            <div className="space-y-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Generated Prompt</Label>
                </div>
                <Button onClick={handleCopyPrompt} variant={copiedPrompt ? 'default' : 'default'}>
                  {copiedPrompt ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                </Button>
              </div>
              <Textarea
                readOnly
                value={buildLovablePrompt()}
                rows={20}
                className="font-mono text-xs bg-background"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <AlertDialog open={duplicateDialog.open} onOpenChange={(open) => setDuplicateDialog((d) => ({ ...d, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sub-account already exists</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{duplicateDialog.existing?.name || 'A matching sub-account'}</span>
              {duplicateDialog.existing?.email && <> ({duplicateDialog.existing.email})</>} already exists in your agency.
              <br /><br />
              Are you sure you want to create a duplicate?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUpdateLocationId(duplicateDialog.existing?.id || '');
              setDuplicateDialog({ open: false, existing: null });
            }}>No, cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setDuplicateDialog({ open: false, existing: null });
              submitCreate(true);
            }}>Yes, create duplicate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
};

const Field = ({ label, value, onChange, placeholder, required, disabled, helpTitle, helpContent, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; disabled?: boolean; helpTitle?: string; helpContent?: React.ReactNode; multiline?: boolean }) => (
  <div>
    <div className="flex items-center gap-2">
      <Label className="capitalize">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {helpContent && (
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="text-xs text-primary hover:underline">
              How Do I find this?
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{helpTitle || `How to find the ${label}`}</DialogTitle>
              <DialogDescription asChild>
                <div className="pt-2">{helpContent}</div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </div>
    {multiline ? (
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} disabled={disabled} className="min-h-[80px] text-sm font-mono" />
    ) : (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} disabled={disabled} />
    )}
  </div>
);
