import { useEffect, useState } from "react";
import { ShoppingCart, Filter, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

interface SO {
  id: string; order_number: string; customer_name: string; order_date: string;
  items_count: number; total_amount: number; status: string;
  purchase_order_id: string | null; supplier_name: string | null;
}

const STATUSES = ["Pending", "Processing", "Shipped", "Completed"];

const SalesOrders = () => {
  const { isAdmin } = useAuth();
  const [list, setList] = useState<SO[]>([]);
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<SO | null>(null);

  const load = async () => {
    const { data } = await supabase.from("sales_orders").select("*").order("created_at", { ascending: false });
    setList((data || []) as SO[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter((o) =>
    [o.order_number, o.customer_name, o.order_date, o.supplier_name ?? ""].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const updateStatus = async (id: string, status: string) => {
    if (!isAdmin) return toast.error("Admin access required");
    const { error } = await supabase.from("sales_orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated"); load();
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Delete sales order?")) return;
    const { error } = await supabase.from("sales_orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-7 h-7 text-primary" />Sales Orders</h1>
          <p className="text-muted-foreground mt-1">Sales orders are generated automatically when purchase orders are approved</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search by order ID, customer, supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card" />
        <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>{["Sales Order ID", "Customer", "Supplier", "Date", "Items", "Total", "Status", "Actions"].map((h) => <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-5 py-4 font-medium">{o.order_number}</td>
                <td className="px-5 py-4">{o.customer_name}</td>
                <td className="px-5 py-4">{o.supplier_name || "—"}</td>
                <td className="px-5 py-4">{o.order_date}</td>
                <td className="px-5 py-4">{o.items_count}</td>
                <td className="px-5 py-4 font-semibold">${Number(o.total_amount).toFixed(2)}</td>
                <td className="px-5 py-4">
                  {isAdmin ? (
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <StatusBadge status={o.status} />
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-3">
                    <button onClick={() => setDetails(o)} className="text-primary hover:underline text-xs">View</button>
                    {isAdmin && <button onClick={() => remove(o.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No sales orders yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{details?.order_number}</DialogTitle></DialogHeader>
          {details && (
            <div className="space-y-2 text-sm">
              <p><strong>Customer:</strong> {details.customer_name}</p>
              <p><strong>Supplier:</strong> {details.supplier_name || "—"}</p>
              <p><strong>Purchase Order:</strong> {details.purchase_order_id ?? "—"}</p>
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
