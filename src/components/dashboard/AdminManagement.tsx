import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminDialog from "./AdminDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Admin {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: any;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      // First, fetch user_roles for sub_admins
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "sub_admin")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Then fetch profiles for those users
      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(role => role.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const combinedData = rolesData.map(role => ({
          ...role,
          profiles: profilesData?.find(profile => profile.id === role.user_id) || { full_name: "Unknown", email: "Unknown" }
        }));

        setAdmins(combinedData);
      } else {
        setAdmins([]);
      }
    } catch (error) {
      console.error("Error loading admins:", error);
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this admin? Their candidates will remain in the system.")) return;

    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);

      if (error) throw error;

      toast.success("Admin removed successfully");
      loadAdmins();
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error("Failed to remove admin");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Sub Admin Management</CardTitle>
            <CardDescription>Manage sub admin accounts and permissions</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No sub admins yet. Add your first admin to get started.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.profiles.full_name}
                    </TableCell>
                    <TableCell>{admin.profiles.email}</TableCell>
                    <TableCell>
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(admin.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AdminDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          loadAdmins();
          setDialogOpen(false);
        }}
      />
    </Card>
  );
}
