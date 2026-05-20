import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShoppingBag, Plus, Filter, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

interface PO {
  id: string;
  order_number: string;
  supplier_id: string | null;
  supplier_name: string;
  is_open_to_all: boolean;
  order_date: string;
  items_count: number;
  total_amount: number;
  status: string;
  description: string | null;
  created_by: string | null;
  items?: any;
}

interface SupplierOption { id: string; name: string; }
interface ProductOption { id: string; name: string; price: number; supplier_id: string | null; }

const OPEN_TO_ALL = "__open__";

const PurchaseOrders = () => {
  const { isAdmin, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<PO | null>(null);

  const [form, setForm] = useState({
    supplierChoice: "" as string,        // supplier_id or OPEN_TO_ALL
    product_id: "",
    quantity: 1,
    description: "",
    order_date: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    const [poRes, supRes, prodRes] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name").order("name"),
      supabase.from("products").select("id,name,price,supplier_id").order("name"),
    ]);
    setList((poRes.data || []) as PO[]);
    setSuppliers(supRes.data || []);
    setAllProducts(prodRes.data || []);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (params.get("action") === "add") {
      setOpen(true);
      params.delete("action");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const generateOrderNumber = () =>
    `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const visibleProducts = form.supplierChoice && form.supplierChoice !== OPEN_TO_ALL
    ? allProducts.filter((p) => p.supplier_id === form.supplierChoice)
    : allProducts;

  const filtered = list.filter((o) =>
    [o.order_number, o.supplier_name, o.order_date, o.description ?? ""].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const create = async () => {
    if (!user) return toast.error("Not signed in");
    if (!form.supplierChoice) return toast.error("Choose supplier or 'Open to all'");
    if (!form.product_id) return toast.error("Select a product");
    if (form.quantity < 1) return toast.error("Quantity must be at least 1");

    const product = allProducts.find((p) => p.id === form.product_id);
    if (!product) return toast.error("Invalid product");

    const isOpen = form.supplierChoice === OPEN_TO_ALL;
    const supplier = isOpen ? null : suppliers.find((s) => s.id === form.supplierChoice);
    const total = product.price * form.quantity;

    const payload = {
      order_number: generateOrderNumber(),
      supplier_id: supplier?.id ?? null,
      supplier_name: isOpen ? "Open to All Suppliers" : (supplier?.name ?? ""),
      is_open_to_all: isOpen,
      order_date: form.order_date,
      items_count: form.quantity,
      total_amount: total,
      status: "Pending Approval",
      description: form.description || null,
      created_by: user.id,
      items: [{ product_id: product.id, name: product.name, quantity: form.quantity, unit_price: product.price }],
    };

    const { error } = await supabase.from("purchase_orders").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Purchase order submitted for approval");
    setOpen(false);
    setForm({ supplierChoice: "", product_id: "", quantity: 1, description: "", order_date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const setStatus = async (id: string, status: string, supplierOverride?: { id: string; name: string }) => {
    if (!isAdmin) return toast.error("Admin access required");
    const update: any = { status };
    if (supplierOverride) {
      update.supplier_id = supplierOverride.id;
      update.supplier_name = supplierOverride.name;
      update.is_open_to_all = false;
    }
    const { error } = await supabase.from("purchase_orders").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Order ${status.toLowerCase()}`);
    load();
  };

  const approveOnBehalf = async (po: PO) => {
    if (!isAdmin) return;
    const choice = window.prompt(
      `Approve on behalf of which supplier?\n\n${suppliers.map((s, i) => `${i + 1}. ${s.name}`).join("\n")}\n\nEnter number:`
    );
    if (!choice) return;
    const sup = suppliers[parseInt(choice, 10) - 1];
    if (!sup) return toast.error("Invalid choice");
    await setStatus(po.id, "Approved", { id: sup.id, name: sup.name });
  };

  const remove = async (id: string) => {
    if (!isAdmin) return toast.error("Admin access required");
    if (!confirm("Delete order?")) return;
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="w-7 h-7 text-primary" />Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">{isAdmin ? "Review, approve, and manage all purchase orders" : "Create purchase orders and track approvals"}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Purchase Order</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search by order ID, supplier, or date..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card" />
        <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>{["Order ID", "Supplier", "Date", "Items", "Total", "Status", "Actions"].map((h) => <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-5 py-4 font-medium">{o.order_number}</td>
                <td className="px-5 py-4">{o.supplier_name}</td>
                <td className="px-5 py-4">{o.order_date}</td>
                <td className="px-5 py-4">{o.items_count}</td>
                <td className="px-5 py-4 font-semibold">${Number(o.total_amount).toFixed(2)}</td>
                <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex gap-2 items-center flex-wrap">
                    <button onClick={() => setDetails(o)} className="text-primary hover:underline text-xs">View</button>
                    {isAdmin && o.status === "Pending Approval" && (
                      <>
                        <button onClick={() => setStatus(o.id, "Approved")} className="text-success flex items-center gap-1 text-xs hover:underline"><Check className="w-3 h-3" />Approve</button>
                        <button onClick={() => setStatus(o.id, "Rejected")} className="text-destructive flex items-center gap-1 text-xs hover:underline"><X className="w-3 h-3" />Reject</button>
                        {o.is_open_to_all && (
                          <button onClick={() => approveOnBehalf(o)} className="text-primary text-xs hover:underline">Approve on behalf</button>
                        )}
                      </>
                    )}
                    {isAdmin && <button onClick={() => remove(o.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>}
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
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Supplier *</Label>
              <select
                className="w-full h-10 px-3 border border-input rounded-md bg-background"
                value={form.supplierChoice}
                onChange={(e) => setForm({ ...form, supplierChoice: e.target.value, product_id: "" })}
              >
                <option value="">Select supplier...</option>
                <option value={OPEN_TO_ALL}>🌐 Open to All Suppliers</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Product *</Label>
              <select
                className="w-full h-10 px-3 border border-input rounded-md bg-background"
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              >
                <option value="">Select product...</option>
                {visibleProducts.map((p) => <option key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity *</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, +e.target.value) })} /></div>
              <div><Label>Order Date</Label><Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional notes..." />
            </div>
            <p className="text-xs text-muted-foreground">Status on submission: <strong>Pending Approval</strong></p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Submit for Approval</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{details?.order_number}</DialogTitle></DialogHeader>
          {details && (
            <div className="space-y-2 text-sm">
              <p><strong>Supplier:</strong> {details.supplier_name}</p>
              <p><strong>Date:</strong> {details.order_date}</p>
              <p><strong>Items:</strong> {details.items_count}</p>
              <p><strong>Total:</strong> ${Number(details.total_amount).toFixed(2)}</p>
              <p><strong>Status:</strong> <StatusBadge status={details.status} /></p>
              {details.description && <p><strong>Description:</strong> {details.description}</p>}
              {Array.isArray(details.items) && details.items.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary p-3 mt-2">
                  <p className="font-semibold mb-2">Items</p>
                  {details.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{it.name} × {it.quantity}</span>
                      <span>${(it.unit_price * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;
