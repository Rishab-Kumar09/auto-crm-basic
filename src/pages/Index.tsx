import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import TicketList from "@/components/TicketList";
import TicketForm from "@/components/TicketForm";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types/ticket";

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("customer");

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setUserRole(profile.role as UserRole);
        }
      }
    };

    fetchUserRole();
  }, []);

  return (
    <div className="flex h-screen bg-zendesk-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-zendesk-secondary">
              {userRole === 'agent' ? 'My Assigned Tickets' : 'Support Dashboard'}
            </h1>
            {userRole !== 'agent' && (
              <Button onClick={() => setShowForm(!showForm)}>
                {showForm ? "View Tickets" : "Create Ticket"}
              </Button>
            )}
          </div>
          {showForm && userRole !== 'agent' ? <TicketForm /> : <TicketList />}
        </main>
      </div>
    </div>
  );
};

export default Index;