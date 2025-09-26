import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  business_id: string;
  full_name: string;
  company_name: string;
  created_at: string;
}

export const UserWebhookList = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 5;

  const fetchUsers = async (page: number) => {
    try {
      setLoading(true);
      
      // Get all users with business IDs first to count them
      const { data: allUsers, error: countError } = await supabase
        .rpc('get_users_with_business_ids_for_admin');

      if (countError) {
        console.error('Error fetching user count:', countError);
        throw countError;
      }

      setTotalUsers(allUsers?.length || 0);

      // Get paginated subset
      const startIndex = (page - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      const paginatedUsers = allUsers?.slice(startIndex, endIndex) || [];

      setUsers(paginatedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch user business IDs"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const handleCopyBusinessId = (businessId: string) => {
    navigator.clipboard.writeText(businessId);
    toast({
      title: "Copied!",
      description: "Business ID copied to clipboard",
    });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Business IDs
        </CardTitle>
        <CardDescription>
          Paginated list of business IDs for each user's business settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading users...</div>
            </div>
          ) : users.length > 0 ? (
            <>
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-3 sm:space-y-0">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <p className="font-medium text-sm sm:text-base truncate">{user.email}</p>
                        {user.full_name && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {user.full_name}
                          </Badge>
                        )}
                      </div>
                      {user.company_name && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.company_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
                      <div className="w-full sm:w-auto">
                        <span className="font-mono text-xs sm:text-sm bg-background px-2 sm:px-3 py-1 rounded border block truncate max-w-[200px] sm:max-w-[300px]" title={user.business_id || 'No business ID'}>
                          {user.business_id || 'No business ID'}
                        </span>
                      </div>
                      {user.business_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyBusinessId(user.business_id)}
                          className="w-full sm:w-auto text-xs sm:text-sm"
                        >
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Copy
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col space-y-3 pt-4 border-t">
                  <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
                  </div>
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2 overflow-x-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="text-xs px-2 sm:px-3 flex-shrink-0"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Prev</span>
                    </Button>
                    
                    {/* Mobile: Show only current page and total */}
                    <div className="flex items-center sm:hidden">
                      <span className="text-xs text-muted-foreground px-2">
                        {currentPage} of {totalPages}
                      </span>
                    </div>
                    
                    {/* Desktop: Show page numbers */}
                    <div className="hidden sm:flex items-center space-x-1">
                      {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                        let page;
                        if (totalPages <= 3) {
                          page = i + 1;
                        } else if (currentPage === 1) {
                          page = i + 1;
                        } else if (currentPage === totalPages) {
                          page = totalPages - 2 + i;
                        } else {
                          page = currentPage - 1 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0 text-sm"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="text-xs px-2 sm:px-3 flex-shrink-0"
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                No users have been registered yet.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};