import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Truck, ShoppingBag, ShoppingCart, FileText, Settings as SettingsIcon, LogOut, Bell, Search, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const allNav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: false },
  { to: "/products", icon: Package, label: "Products", adminOnly: false },
  { to: "/suppliers", icon: Truck, label: "Suppliers", adminOnly: false },
  { to: "/purchase-orders", icon: ShoppingBag, label: "Purchase Orders", adminOnly: false },
  { to: "/sales-orders", icon: ShoppingCart, label: "Sales Orders", adminOnly: false },
  { to: "/reports", icon: FileText, label: "Reports", adminOnly: true },
  { to: "/settings", icon: SettingsIcon, label: "Settings", adminOnly: true },
];

interface PendingPO { id: string; order_number: string; supplier_name: string; created_at: string; }

export const Layout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingPO[]>([]);

  const nav = allNav.filter((n) => !n.adminOnly || isAdmin);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data } = await supabase
        .from("purchase_orders")
        .select("id,order_number,supplier_name,created_at")
        .eq("status", "Pending Approval")
        .order("created_at", { ascending: false })
        .limit(10);
      setPending(data || []);
    };
    load();
    const channel = supabase
      .channel("po-pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col fixed h-screen">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src="/tls-logo.png" alt="TLS Logistics" className="w-10 h-10 object-contain rounded-lg bg-white/90 p-1" />
            <div>
              <h1 className="text-xl font-bold">TLS Logistics</h1>
              <p className="text-sm text-sidebar-muted mt-1">ERP System</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-sidebar-active text-sidebar-active-foreground" : "text-sidebar-foreground hover:bg-sidebar-border"
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-muted text-center">
          © 2026 TLS Logistics
        </div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex-1 max-w-2xl mx-8 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, orders, suppliers..."
              className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  {isAdmin && pending.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      {pending.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!isAdmin && <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>}
                {isAdmin && pending.length === 0 && <DropdownMenuItem disabled>No pending approvals</DropdownMenuItem>}
                {isAdmin && pending.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => navigate("/purchase-orders")}>
                    <div>
                      <p className="text-sm font-medium">New purchase order submitted</p>
                      <p className="text-xs text-muted-foreground">{p.order_number} · {p.supplier_name}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-full p-1 hover:bg-secondary transition-colors">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{user?.email?.split("@")[0]}</p>
                    <p className="text-xs text-muted-foreground">{isAdmin ? "Admin" : "User"}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && <DropdownMenuItem onSelect={() => navigate("/settings")}><SettingsIcon className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>}
                <DropdownMenuItem onSelect={signOut}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};
