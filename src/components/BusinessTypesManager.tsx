import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BusinessType {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  display_order: number;
}

export const BusinessTypesManager = () => {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTypeValue, setNewTypeValue] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<BusinessType | null>(null);

  useEffect(() => {
    loadBusinessTypes();
  }, []);

  const loadBusinessTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_types')
        .select('*')
        .order('label');

      if (error) throw error;
      setBusinessTypes(data || []);
    } catch (error) {
      console.error('Error loading business types:', error);
      toast({
        title: "Error",
        description: "Failed to load business types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeValue.trim() || !newTypeLabel.trim()) {
      toast({
        title: "Validation Error",
        description: "Both value and label are required",
        variant: "destructive",
      });
      return;
    }

    setAddingType(true);
    try {
      const { error } = await supabase
        .from('business_types')
        .insert({
          value: newTypeValue.toLowerCase().trim(),
          label: newTypeLabel.trim(),
          is_active: true,
          display_order: businessTypes.length + 1,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Business type added successfully",
      });

      setNewTypeValue('');
      setNewTypeLabel('');
      loadBusinessTypes();
    } catch (error: any) {
      console.error('Error adding business type:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add business type",
        variant: "destructive",
      });
    } finally {
      setAddingType(false);
    }
  };

  const handleDeleteType = async () => {
    if (!typeToDelete) return;

    try {
      const { error } = await supabase
        .from('business_types')
        .delete()
        .eq('id', typeToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Business type deleted successfully",
      });

      loadBusinessTypes();
    } catch (error: any) {
      console.error('Error deleting business type:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete business type",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    }
  };

  const openDeleteDialog = (type: BusinessType) => {
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Types Management</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Business Types Management</CardTitle>
          <CardDescription>
            Add or remove business types available in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Type Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">Add New Business Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type-value">Value (lowercase, no spaces)</Label>
                <Input
                  id="type-value"
                  placeholder="e.g., car-repair"
                  value={newTypeValue}
                  onChange={(e) => setNewTypeValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-label">Label (display name)</Label>
                <Input
                  id="type-label"
                  placeholder="e.g., Car Repair"
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleAddType}
              disabled={addingType}
              className="w-full md:w-auto"
            >
              {addingType ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Business Type
            </Button>
          </div>

          {/* Existing Types List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Existing Business Types ({businessTypes.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {businessTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant={type.is_active ? "default" : "secondary"} className="text-xs">
                      {type.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm truncate">{type.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(type)}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
