import { Home, Inbox, Users, Settings, HelpCircle, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/ticket";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

const getMenuItems = (role: UserRole) => {
  const baseItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: Inbox, label: "Tickets", href: "/tickets" },
  ];

  if (role === "customer") {
    return [
      ...baseItems,
      { icon: HelpCircle, label: "Help Center", href: "/help" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ];
  }

  if (role === "agent") {
    return [
      ...baseItems,
      { icon: Users, label: "Customers", href: "/customers" },
      { icon: HelpCircle, label: "Help Center", href: "/help" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ];
  }

  // Admin role
  return [
    ...baseItems,
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: UserCog, label: "Agents", href: "/agents" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];
};

const Sidebar = () => {
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching user role:', error);
            toast({
              title: "Error",
              description: "Could not fetch user role",
              variant: "destructive",
            });
            return;
          }

          if (profile) {
            setUserRole(profile.role as UserRole);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Could not fetch user role",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [toast]);

  const handleNavigation = (item: { label: string; href: string }) => {
    if (["/dashboard", "/tickets", "/customers", "/agents", "/settings"].includes(item.href)) {
      navigate(item.href);
    } else {
      toast({
        title: "Navigation",
        description: `${item.label} page is not implemented yet.`,
      });
    }
  };

  const menuItems = getMenuItems(userRole);

  if (loading) {
    return (
      <div className="h-screen w-64 bg-white border-r border-zendesk-border flex items-center justify-center">
        <p className="text-zendesk-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-64 bg-white border-r border-zendesk-border flex flex-col">
      <div className="p-4 border-b border-zendesk-border">
        <h1 className="text-xl font-bold text-zendesk-secondary">Help Desk</h1>
        <p className="text-sm text-zendesk-muted mt-1 capitalize">{userRole} Portal</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => handleNavigation(item)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-2 rounded-md text-zendesk-secondary w-full text-left",
                  "hover:bg-zendesk-background transition-colors duration-200",
                  location.pathname === item.href && "bg-zendesk-background"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;