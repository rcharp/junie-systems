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
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Plus, Save, UserPlus } from 'lucide-react';

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

  const handleCreateUser = async () => {
    if (!userForm.locationId.trim()) {
      toast({ title: 'Missing Location ID', variant: 'destructive' });
      return;
    }
    if (!userForm.contactId.trim() && !userForm.email.trim()) {
      toast({ title: 'Provide Contact ID or Email', variant: 'destructive' });
      return;
    }
    setCreatingUser(true);
    setCreatedUserResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-create-user', {
        body: {
          locationId: userForm.locationId.trim(),
          sourceLocationId: userForm.sourceLocationId.trim() || undefined,
          contactId: userForm.contactId.trim() || undefined,
          firstName: userForm.firstName || undefined,
          lastName: userForm.lastName || undefined,
          email: userForm.email || undefined,
          phone: userForm.phone || undefined,
          password: userForm.password || undefined,
          role: userForm.role,
          type: userForm.type,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      setCreatedUserResult(data);
      toast({ title: 'User created', description: data.user?.id ? `User ID: ${data.user.id}` : 'Success' });
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
        body: { ...createForm, customValues },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      toast({ title: 'Sub-account created', description: `Location ID: ${data.locationId}` });
      setUpdateLocationId(data.locationId || '');
    } catch (e: any) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
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

  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="create">Create Sub-account</TabsTrigger>
        <TabsTrigger value="user">Create User</TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create GHL Sub-account</CardTitle>
            <CardDescription>Creates a new location in your GHL agency and imports a snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Agency Company ID</Label>
                <Input value={createForm.companyId} disabled readOnly placeholder="Auto-filled from secret..." className="bg-muted" />
              </div>
              <div>
                <Label>Populate from GHL Contact</Label>
                <div className="flex gap-2">
                  <Input
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    placeholder="Contact ID"
                  />
                  <Button type="button" variant="outline" onClick={handlePopulateFromContact} disabled={loadingContact}>
                    {loadingContact ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Populate'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Business Name *" value={createForm.name} onChange={(v) => setCreateForm({ ...createForm, name: v })} required />
              <Field label="First Name *" value={createForm.firstName} onChange={(v) => setCreateForm({ ...createForm, firstName: v })} required />
              <Field label="Last Name *" value={createForm.lastName} onChange={(v) => setCreateForm({ ...createForm, lastName: v })} required />
              <Field label="Email *" value={createForm.email} onChange={(v) => setCreateForm({ ...createForm, email: v })} required />
              <Field label="Phone *" value={createForm.phone} onChange={(v) => setCreateForm({ ...createForm, phone: v })} required />
              <Field label="Website" value={createForm.website} onChange={(v) => setCreateForm({ ...createForm, website: v })} />
              <Field label="Timezone *" value={createForm.timezone} onChange={(v) => setCreateForm({ ...createForm, timezone: v })} required />
              <Field label="Address *" value={createForm.address} onChange={(v) => setCreateForm({ ...createForm, address: v })} required />
              <Field label="City *" value={createForm.city} onChange={(v) => setCreateForm({ ...createForm, city: v })} required />
              <div>
                <Label>State *</Label>
                <Select value={createForm.state} onValueChange={(v) => setCreateForm({ ...createForm, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Postal Code *" value={createForm.postalCode} onChange={(v) => setCreateForm({ ...createForm, postalCode: v })} required />
              <Field label="Country *" value={createForm.country} onChange={(v) => setCreateForm({ ...createForm, country: v })} required />
              <Field label="Business Tax ID / EIN *" value={createForm.einNumber} onChange={(v) => setCreateForm({ ...createForm, einNumber: v })} required placeholder="12-3456789" />
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
              <Field label="Location ID * (target — where to create user)" value={userForm.locationId} onChange={(v) => setUserForm({ ...userForm, locationId: v })} required placeholder="New sub-account location ID" />
              <div>
                <Label>Source Location ID (where contacts live)</Label>
                <Input value={userForm.sourceLocationId} readOnly disabled className="bg-muted cursor-not-allowed" />
              </div>
              <Field label="Contact ID (optional)" value={userForm.contactId} onChange={(v) => setUserForm({ ...userForm, contactId: v })} placeholder="GHL contact to pull info from" />
              <Field label="First Name" value={userForm.firstName} onChange={(v) => setUserForm({ ...userForm, firstName: v })} />
              <Field label="Last Name" value={userForm.lastName} onChange={(v) => setUserForm({ ...userForm, lastName: v })} />
              <Field label="Email" value={userForm.email} onChange={(v) => setUserForm({ ...userForm, email: v })} placeholder="Required if no Contact ID" />
              <Field label="Phone" value={userForm.phone} onChange={(v) => setUserForm({ ...userForm, phone: v })} />
              <Field label="Password (optional)" value={userForm.password} onChange={(v) => setUserForm({ ...userForm, password: v })} placeholder="Auto-generated if blank" />
              <div>
                <Label>Role</Label>
                <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
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

    </Tabs>
  );
};

const Field = ({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) => (
  <div>
    <Label className="capitalize">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} />
  </div>
);
