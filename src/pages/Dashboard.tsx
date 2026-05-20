import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Users, ShoppingCart, AlertTriangle, Plus, FileBarChart, ShoppingBag, Clock, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { StatusBadge, stockStatus } from "@/components/StatusBadge";

interface LowStock { id: string; name: string; current_stock: number; min_stock: number }

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState({
    products: 0, suppliers: 0, totalPO: 0, pending: 0, salesOrders: 0,
    revenue: 0, myOrders: 0, lowStock: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<LowStock[]>([]);
  const [trend, setTrend] = useState<{ month: string; purchase: number; sales: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [
        { count: products },
        { count: suppliers },
        { count: totalPO },
        { count: pending },
        { count: salesOrders },
        { data: revenueRows },
        { count: myOrders },
        { data: low },
        { data: poByMonth },
        { data: soByMonth },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("*", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("*", { count: "exact", head: true }).eq("status", "Pending Approval"),
        supabase.from("sales_orders").select("*", { count: "exact", head: true }),
        supabase.from("sales_orders").select("total_amount"),
        supabase.from("purchase_orders").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("products").select("id,name,current_stock,min_stock").order("current_stock"),
        supabase.from("purchase_orders").select("order_date"),
        supabase.from("sales_orders").select("order_date"),
      ]);
      const lowItems = (low || []).filter((p) => p.current_stock < p.min_stock);
      const revenue = (revenueRows || []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
      setStats({
        products: products || 0, suppliers: suppliers || 0,
        totalPO: totalPO || 0, pending: pending || 0,
        salesOrders: salesOrders || 0, revenue,
        myOrders: myOrders || 0, lowStock: lowItems.length,
      });
      setLowStockItems(lowItems);

      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const buckets: Record<string, { purchase: number; sales: number }> = {};
      months.forEach((m) => (buckets[m] = { purchase: 0, sales: 0 }));
      (poByMonth || []).forEach((r: any) => { const m = months[new Date(r.order_date).getMonth()]; if (m) buckets[m].purchase += 1; });
      (soByMonth || []).forEach((r: any) => { const m = months[new Date(r.order_date).getMonth()]; if (m) buckets[m].sales += 1; });
      setTrend(months.map((m) => ({ month: m, ...buckets[m] })));
    };
    load();
  }, [user]);

  const adminCards = [
    { label: "Total Products", value: stats.products, icon: Package, color: "bg-blue-100 text-blue-600", to: "/products" },
    { label: "Total Suppliers", value: stats.suppliers, icon: Users, color: "bg-green-100 text-green-600", to: "/suppliers" },
    { label: "Purchase Orders", value: stats.totalPO, icon: ShoppingBag, color: "bg-indigo-100 text-indigo-600", to: "/purchase-orders" },
    { label: "Pending Approvals", value: stats.pending, icon: Clock, color: "bg-orange-100 text-orange-600", to: "/purchase-orders" },
    { label: "Sales Orders", value: stats.salesOrders, icon: ShoppingCart, color: "bg-purple-100 text-purple-600", to: "/sales-orders" },
    { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "bg-emerald-100 text-emerald-600", to: "/reports" },
  ];

  const userCards = [
    { label: "My Orders", value: stats.myOrders, icon: ShoppingBag, color: "bg-blue-100 text-blue-600", to: "/purchase-orders" },
    { label: "Sales Orders", value: stats.salesOrders, icon: ShoppingCart, color: "bg-purple-100 text-purple-600", to: "/sales-orders" },
    { label: "Products Available", value: stats.products, icon: Package, color: "bg-green-100 text-green-600", to: "/products" },
    { label: "Suppliers Available", value: stats.suppliers, icon: Users, color: "bg-orange-100 text-orange-600", to: "/suppliers" },
  ];

  const cards = isAdmin ? adminCards : userCards;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {isAdmin && (
          <Button onClick={() => navigate("/products?action=add")}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
        )}
        <Button variant={isAdmin ? "outline" : "default"} onClick={() => navigate("/purchase-orders?action=add")}>
          <Plus className="w-4 h-4 mr-2" />Create Purchase Order
        </Button>
        {isAdmin && (
          <Button variant="outline" onClick={() => navigate("/reports")}><FileBarChart className="w-4 h-4 mr-2" />View Reports</Button>
        )}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-5`}>
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => navigate(c.to)}
            className="bg-card rounded-xl p-5 border border-border shadow-sm text-left transition hover:bg-secondary/50"
          >
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{typeof c.value === "number" ? c.value.toLocaleString() : c.value}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-semibold">Order Trends</h3>
          <p className="text-sm text-muted-foreground mb-4">Monthly comparison of purchase and sales orders</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="purchase" stroke="hsl(221 83% 53%)" strokeWidth={2} name="Purchase Orders" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="sales" stroke="hsl(142 71% 45%)" strokeWidth={2} name="Sales Orders" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold">Low Stock Alert</h3>
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
            {lowStockItems.length === 0 && <p className="text-sm text-muted-foreground">All products in stock</p>}
            {lowStockItems.map((p) => {
              const status = stockStatus(p.current_stock, p.min_stock);
              const pct = Math.min((p.current_stock / Math.max(p.min_stock, 1)) * 100, 100);
              return (
                <button
                  key={p.id}
                  onClick={() => navigate("/products")}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{p.name}</p>
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Current: {p.current_stock}</span>
                    <span>Min Required: {p.min_stock}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                    <div
                      className={status === "Critical" ? "h-full bg-destructive" : "h-full bg-warning"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
