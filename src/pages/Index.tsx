import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Database, ArrowRight } from "lucide-react";
import HIRETEK_LOGO from "@/assets/HIRETEK_LOGO.jpg";


const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
 
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex justify-center mb-6">
              <img 
            src={HIRETEK_LOGO} 
            alt="Hiretek Logo" 
            className="w-48 mx-auto -mb-[62px]"
          />
            {/* <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Database className="h-10 w-10 text-primary" />
            </div> */}
          </div>
          <h1 className="text-5xl font-bold text-foreground">
            Candidate Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional platform for managing candidates with role-based access control.
            Track candidates through stages, manage sub-admins, and generate comprehensive reports.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
