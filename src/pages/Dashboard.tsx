import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Users, ShoppingCart, AlertTriangle, Plus, FileBarChart, ArrowUpRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge, stockStatus } from "@/components/StatusBadge";

interface LowStock { id: string; name: string; current_stock: number; min_stock: number }

const trendData = [
  { month: "Jan", purchase: 45, sales: 52 },
  { month: "Feb", purchase: 52, sales: 58 },
  { month: "Mar", purchase: 48, sales: 55 },
  { month: "Apr", purchase: 61, sales: 65 },
  { month: "May", purchase: 55, sales: 63 },
  { month: "Jun", purchase: 67, sales: 72 },
  { month: "Jul", purchase: 70, sales: 78 },
  { month: "Aug", purchase: 68, sales: 75 },
  { month: "Sep", purchase: 75, sales: 82 },
  { month: "Oct", purchase: 80, sales: 88 },
  { month: "Nov", purchase: 85, sales: 92 },
  { month: "Dec", purchase: 90, sales: 98 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, suppliers: 0, pending: 0, lowStock: 0 });
  const [lowStockItems, setLowStockItems] = useState<LowStock[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ count: products }, { count: suppliers }, { count: pending }, { data: low }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("*", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("products").select("id,name,current_stock,min_stock").order("current_stock"),
      ]);
      const lowItems = (low || []).filter((p) => p.current_stock < p.min_stock);
      setStats({ products: products || 0, suppliers: suppliers || 0, pending: pending || 0, lowStock: lowItems.length });
      setLowStockItems(lowItems);
    };
    load();
  }, []);

  const cards = [
    { label: "Total Products", value: stats.products, icon: Package, color: "bg-blue-100 text-blue-600", change: "+12%", changeColor: "text-blue-600" },
    { label: "Total Suppliers", value: stats.suppliers, icon: Users, color: "bg-green-100 text-green-600", change: "+5%", changeColor: "text-green-600" },
    { label: "Pending Orders", value: stats.pending, icon: ShoppingCart, color: "bg-orange-100 text-orange-600", change: "-8%", changeColor: "text-orange-600" },
    { label: "Low Stock Items", value: stats.lowStock, icon: AlertTriangle, color: "bg-red-100 text-red-600", change: `+${stats.lowStock}`, changeColor: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/products?action=add")}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
        <Button variant="outline" onClick={() => navigate("/purchase-orders?action=add")}><Plus className="w-4 h-4 mr-2" />Create Purchase Order</Button>
        <Button variant="outline" onClick={() => navigate("/reports")}><FileBarChart className="w-4 h-4 mr-2" />View Reports</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-semibold ${c.changeColor}`}>{c.change}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-semibold">Order Trends</h3>
          <p className="text-sm text-muted-foreground mb-4">Monthly comparison of purchase and sales orders</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
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
            {lowStockItems.length === 0 && <p className="text-sm text-muted-foreground">All products in stock 🎉</p>}
            {lowStockItems.map((p) => {
              const status = stockStatus(p.current_stock, p.min_stock);
              const pct = Math.min((p.current_stock / p.min_stock) * 100, 100);
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
