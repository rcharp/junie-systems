// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Plus, Save, Users } from 'lucide-react';

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
  snapshotId: '',
  customValuesJson: '{\n  "business_description": ""\n}',
};

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

  const handleCreate = async () => {
    if (!createForm.companyId || !createForm.name) {
      toast({ title: 'Missing fields', description: 'Company ID and Business Name are required', variant: 'destructive' });
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
        <TabsTrigger value="update">Update Sub-account</TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create GHL Sub-account</CardTitle>
            <CardDescription>Creates a new location in your GHL agency and imports a snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Agency Company ID *" value={createForm.companyId} onChange={(v) => setCreateForm({ ...createForm, companyId: v })} placeholder="From GHL Agency Settings" />
              <Field label="Business Name *" value={createForm.name} onChange={(v) => setCreateForm({ ...createForm, name: v })} />
              <Field label="First Name" value={createForm.firstName} onChange={(v) => setCreateForm({ ...createForm, firstName: v })} />
              <Field label="Last Name" value={createForm.lastName} onChange={(v) => setCreateForm({ ...createForm, lastName: v })} />
              <Field label="Email" value={createForm.email} onChange={(v) => setCreateForm({ ...createForm, email: v })} />
              <Field label="Phone" value={createForm.phone} onChange={(v) => setCreateForm({ ...createForm, phone: v })} />
              <Field label="Website" value={createForm.website} onChange={(v) => setCreateForm({ ...createForm, website: v })} />
              <Field label="Timezone" value={createForm.timezone} onChange={(v) => setCreateForm({ ...createForm, timezone: v })} />
              <Field label="Address" value={createForm.address} onChange={(v) => setCreateForm({ ...createForm, address: v })} />
              <Field label="City" value={createForm.city} onChange={(v) => setCreateForm({ ...createForm, city: v })} />
              <Field label="State" value={createForm.state} onChange={(v) => setCreateForm({ ...createForm, state: v })} />
              <Field label="Postal Code" value={createForm.postalCode} onChange={(v) => setCreateForm({ ...createForm, postalCode: v })} />
              <Field label="Country" value={createForm.country} onChange={(v) => setCreateForm({ ...createForm, country: v })} />
              <Field label="Snapshot ID (override)" value={createForm.snapshotId} onChange={(v) => setCreateForm({ ...createForm, snapshotId: v })} placeholder="Defaults to GHL_SNAPSHOT_ID secret" />
            </div>
            <div>
              <Label>Custom Values (JSON)</Label>
              <Textarea rows={5} value={createForm.customValuesJson} onChange={(e) => setCreateForm({ ...createForm, customValuesJson: e.target.value })} className="font-mono text-xs" />
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Sub-account
            </Button>
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

    </Tabs>
  );
};

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <Label className="capitalize">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);
