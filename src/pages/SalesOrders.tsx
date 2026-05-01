import { useEffect, useState } from "react";
import { ShoppingCart, Plus, Filter, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

interface SO {
  id: string; order_number: string; customer_name: string; order_date: string;
  items_count: number; total_amount: number; status: string;
}

const SalesOrders = () => {
  const { isAdmin } = useAuth();
  const [list, setList] = useState<SO[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<SO | null>(null);
  const [form, setForm] = useState({ order_number: "", customer_name: "", order_date: new Date().toISOString().slice(0, 10), items_count: 1, total_amount: 0, status: "Pending" });
  const statuses = ["Pending", "Processing", "Shipped", "Completed"];

  const updateStatus = async (id: string, status: string) => {
    if (!isAdmin) return toast.error("Admin access required");
    const { error } = await supabase.from("sales_orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order status updated");
    load();
  };

  const load = async () => {
    const { data } = await supabase.from("sales_orders").select("*").order("created_at", { ascending: false });
    setList(data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter((o) =>
    [o.order_number, o.customer_name, o.order_date].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const create = async () => {
    if (!isAdmin) return toast.error("Admin access required");
    if (!form.order_number || !form.customer_name) return toast.error("Order number and customer required");
    const { error } = await supabase.from("sales_orders").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Sales order created"); setOpen(false); load();
    setForm({ order_number: "", customer_name: "", order_date: new Date().toISOString().slice(0, 10), items_count: 1, total_amount: 0, status: "Pending" });
  };

  const remove = async (id: string) => {
    if (!isAdmin) return toast.error("Admin access required");
    if (!confirm("Delete order?")) return;
    const { error } = await supabase.from("sales_orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-7 h-7 text-primary" />Sales Orders</h1>
          <p className="text-muted-foreground mt-1">Manage customer orders and sales</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Sales Order</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search by order ID, customer, or date..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card" />
        <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>{["Order ID", "Customer", "Date", "Items", "Total Amount", "Status", "Actions"].map((h) => <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-5 py-4 font-medium">{o.order_number}</td>
                <td className="px-5 py-4">{o.customer_name}</td>
                <td className="px-5 py-4">{o.order_date}</td>
                <td className="px-5 py-4">{o.items_count}</td>
                <td className="px-5 py-4 font-semibold">${Number(o.total_amount).toFixed(2)}</td>
                <td className="px-5 py-4">
                  {isAdmin ? (
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={o.status} />
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-3">
                    <button onClick={() => setDetails(o)} className="text-primary hover:underline text-xs">View Details</button>
                    <button onClick={() => remove(o.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No orders</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Sales Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Order Number *</Label><Input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} placeholder="SO-2024-106" /></div>
            <div><Label>Customer *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></div>
              <div><Label>Status</Label>
                <select className="w-full h-10 px-3 border border-input rounded-md bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Pending</option><option>Processing</option><option>Shipped</option><option>Completed</option>
                </select>
              </div>
              <div><Label>Items</Label><Input type="number" value={form.items_count} onChange={(e) => setForm({ ...form, items_count: +e.target.value })} /></div>
              <div><Label>Total Amount</Label><Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: +e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{details?.order_number}</DialogTitle></DialogHeader>
          {details && (
            <div className="space-y-2 text-sm">
              <p><strong>Customer:</strong> {details.customer_name}</p>
              <p><strong>Date:</strong> {details.order_date}</p>
              <p><strong>Items:</strong> {details.items_count}</p>
              <p><strong>Total:</strong> ${Number(details.total_amount).toFixed(2)}</p>
              <p><strong>Status:</strong> <StatusBadge status={details.status} /></p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrders;
