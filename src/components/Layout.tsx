import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Truck, ShoppingBag, ShoppingCart, FileText, Settings as SettingsIcon, LogOut, Bell, Search, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/suppliers", icon: Truck, label: "Suppliers" },
  { to: "/purchase-orders", icon: ShoppingBag, label: "Purchase Orders" },
  { to: "/sales-orders", icon: ShoppingCart, label: "Sales Orders" },
  { to: "/reports", icon: FileText, label: "Reports" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export const Layout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

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
                  isActive
                    ? "bg-sidebar-active text-sidebar-active-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-border"
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
            <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
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
                <DropdownMenuItem onSelect={() => navigate("/settings")}> <SettingsIcon className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
                <DropdownMenuItem onSelect={signOut}> <LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};
