// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Users } from 'lucide-react';

export const StripeCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStripe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-list-customers');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCustomers(data.customers || []);
      toast({ title: 'Loaded', description: `${data.total} customers` });
    } catch (e: any) {
      toast({ title: 'Fetch failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Junie Customers (Stripe)</CardTitle>
          <CardDescription>Pulled live from Stripe. Shows plan and active status.</CardDescription>
        </div>
        <Button onClick={fetchStripe} disabled={loading} size="sm" variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Click Refresh to load customers</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.customerId}>
                  <TableCell>{c.name || '—'}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>
                    {c.plan}
                    {c.amount != null && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ${c.amount}/{c.interval || 'mo'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
