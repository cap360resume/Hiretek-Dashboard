import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: "super_admin" | "sub_admin" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"super_admin" | "sub_admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching with setTimeout
          setTimeout(async () => {
            try {
              console.log("Fetching role for user:", session.user.id);
              const { data: roleData, error } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .maybeSingle();
              
              console.log("Role data:", roleData, "Error:", error);
              setUserRole(roleData?.role ?? null);
            } catch (error) {
              console.error("Error fetching user role:", error);
              setUserRole(null);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          try {
            console.log("Initial fetch - Fetching role for user:", session.user.id);
            const { data: roleData, error } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .maybeSingle();
            
            console.log("Initial fetch - Role data:", roleData, "Error:", error);
            setUserRole(roleData?.role ?? null);
          } catch (error) {
            console.error("Initial fetch - Error fetching user role:", error);
            setUserRole(null);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ session, user, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
