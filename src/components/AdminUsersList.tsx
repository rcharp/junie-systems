import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Phone, AlertTriangle, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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

interface AdminUsersListProps {
  users: any[];
  onRefresh: () => void;
}

export const AdminUsersList = ({ users, onRefresh }: AdminUsersListProps) => {
  const [assigningNumber, setAssigningNumber] = useState<string | null>(null);
  const [unassigningNumber, setUnassigningNumber] = useState<string | null>(null);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return users.slice(startIndex, startIndex + itemsPerPage);
  }, [users, currentPage]);

  const handleAssignNumber = async (userId: string, businessId: string) => {
    setAssigningNumber(userId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-twilio-number", {
        body: {
          user_id: userId,
          business_id: businessId,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Phone number ${data.phone_number} assigned successfully`,
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error assigning phone number:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign phone number",
        variant: "destructive",
      });
    } finally {
      setAssigningNumber(null);
    }
  };

  const handleUnassignNumber = async () => {
    if (!selectedUser) return;

    setUnassigningNumber(selectedUser.id);
    try {
      // Call edge function to release/deactivate the number
      const { error } = await supabase.functions.invoke("release-twilio-number", {
        body: {
          user_id: selectedUser.id,
          business_id: selectedUser.business_id,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Phone number unassigned and deactivated",
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error unassigning phone number:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to unassign phone number",
        variant: "destructive",
      });
    } finally {
      setUnassigningNumber(null);
      setShowUnassignDialog(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setDeletingUser(selectedUser.id);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: {
          userId: selectedUser.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User account deleted successfully",
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user account",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(null);
      setShowDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return "";
    const cleaned = phoneNumber.replace(/\D/g, "");
    const match = cleaned.match(/^1?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phoneNumber;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Users
            </CardTitle>
            {users.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, users.length)} of {users.length}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
            ) : (
              paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{user.email}</p>
                      {user.subscription_plan && (
                        <Badge variant="outline" className="text-xs">
                          {user.subscription_plan}
                        </Badge>
                      )}
                    </div>
                    {user.company_name && (
                      <p className="text-sm text-muted-foreground">Company: {user.company_name}</p>
                    )}
                    {user.full_name && (
                      <p className="text-sm text-muted-foreground">Name: {user.full_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {user.twilio_phone_number ? (
                      <>
                        <div className="text-right">
                          <p className="text-sm font-mono font-medium">{formatPhoneNumber(user.twilio_phone_number)}</p>
                          <p className="text-xs text-muted-foreground">Junie Number</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUnassignDialog(true);
                          }}
                          disabled={!!unassigningNumber}
                        >
                          {unassigningNumber === user.id ? "Unassigning..." : "Unassign"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignNumber(user.id, user.business_id)}
                        disabled={assigningNumber === user.id || !user.business_id}
                      >
                        {assigningNumber === user.id ? "Assigning..." : "Assign Number"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteDialog(true);
                      }}
                      disabled={!!deletingUser}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showUnassignDialog} onOpenChange={setShowUnassignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Unassign Phone Number
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign and deactivate the phone number{" "}
              <strong>
                {selectedUser?.twilio_phone_number && formatPhoneNumber(selectedUser.twilio_phone_number)}
              </strong>{" "}
              for {selectedUser?.full_name || selectedUser?.email}?
              <br />
              <br />
              This will release the number back to Twilio and it will no longer receive calls.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassignNumber}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unassign Number
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the account for{" "}
              <strong>{selectedUser?.email}</strong>
              {selectedUser?.company_name && <> ({selectedUser.company_name})</>}?
              <br />
              <br />
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User profile and account data</li>
                <li>All business settings and services</li>
                <li>Call logs and messages</li>
                <li>Appointments and calendar settings</li>
                <li>Any assigned Twilio phone number</li>
              </ul>
              <br />
              <strong className="text-destructive">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
