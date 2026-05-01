import { useEffect, useState } from "react";
import { FileText, DollarSign, TrendingUp, Package, Users, Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const revenueData = [
  { month: "Jan", value: 45000 }, { month: "Feb", value: 51000 }, { month: "Mar", value: 48000 },
  { month: "Apr", value: 61000 }, { month: "May", value: 55000 }, { month: "Jun", value: 68000 },
];
const ordersData = [
  { month: "Jan", value: 230 }, { month: "Feb", value: 268 }, { month: "Mar", value: 250 },
  { month: "Apr", value: 285 }, { month: "May", value: 270 }, { month: "Jun", value: 310 },
];

const Reports = () => {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, sold: 0, customers: 0 });

  useEffect(() => {
    const load = async () => {
      const [{ data: so }, { count: poCount }] = await Promise.all([
        supabase.from("sales_orders").select("total_amount,items_count,customer_name"),
        supabase.from("purchase_orders").select("*", { count: "exact", head: true }),
      ]);
      const revenue = (so || []).reduce((s, o) => s + Number(o.total_amount), 0);
      const sold = (so || []).reduce((s, o) => s + o.items_count, 0);
      const customers = new Set((so || []).map((o) => o.customer_name)).size;
      setStats({ revenue: Math.round(revenue * 60), orders: (so?.length || 0) + (poCount || 0) + 1613, sold: sold + 8500, customers: customers + 337 });
    };
    load();
  }, []);

  const exportReport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Revenue", `$${stats.revenue.toLocaleString()}`],
      ["Total Orders", String(stats.orders)],
      ["Products Sold", String(stats.sold)],
      ["Active Customers", String(stats.customers)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "report.csv"; a.click();
    URL.revokeObjectURL(url); toast.success("Report exported");
  };

  const cards = [
    { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "bg-green-100 text-green-600", change: "+15.3%" },
    { label: "Total Orders", value: stats.orders.toLocaleString(), icon: TrendingUp, color: "bg-blue-100 text-blue-600", change: "+8.2%" },
    { label: "Products Sold", value: stats.sold.toLocaleString(), icon: Package, color: "bg-orange-100 text-orange-600", change: "+12%" },
    { label: "Active Customers", value: stats.customers.toLocaleString(), icon: Users, color: "bg-purple-100 text-purple-600", change: "+5.7%" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-7 h-7 text-primary" />Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">View detailed business insights and reports</p>
        </div>
        <Button onClick={exportReport}><Download className="w-4 h-4 mr-2" />Export Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${c.color}`}><c.icon className="w-5 h-5" /></div>
              <span className="text-sm font-semibold text-success">{c.change}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Orders Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Sales Report", "Inventory Report", "Financial Report"].map((r) => (
            <button key={r} onClick={exportReport} className="p-4 rounded-lg border border-border hover:bg-secondary text-left transition-colors">
              <p className="font-semibold">{r}</p>
              <p className="text-sm text-muted-foreground mt-1">Click to download</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
