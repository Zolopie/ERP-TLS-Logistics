import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShoppingBag, Plus, Filter, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

interface POItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface PO {
  id: string;
  order_number: string;
  supplier_id: string | null;
  supplier_name: string;
  order_date: string;
  items_count: number;
  total_amount: number;
  status: string;
  items?: POItem[];
}

interface SupplierOption { id: string; name: string; }
interface ProductOption { id: string; name: string; price: number; }

const PurchaseOrders = () => {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<PO | null>(null);
  const [form, setForm] = useState({
    order_number: "",
    supplier_id: null as string | null,
    supplier_name: "",
    order_date: new Date().toISOString().slice(0, 10),
    items_count: 0,
    total_amount: 0,
    status: "Pending",
    items: [] as POItem[],
  });

  const load = async () => {
    const [purchaseRes, supplierRes] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name").order("name"),
    ]);
    setList(purchaseRes.data || []);
    setSuppliers(supplierRes.data || []);
  };
  useEffect(() => { load(); }, []);

  const generateOrderNumber = () => {
    const now = new Date();
    return `PO-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  useEffect(() => {
    if (params.get("action") === "add") {
      setOpen(true); params.delete("action"); setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    if (open && !form.order_number) {
      setForm((prev) => ({ ...prev, order_number: generateOrderNumber() }));
    }
  }, [open]);

  const filtered = list.filter((o) =>
    [
      o.order_number,
      o.supplier_name,
      o.order_date,
      ...(o.items || []).map((item) => item.name),
    ].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const loadProductsForSupplier = async (supplierId: string | null) => {
    if (!supplierId) {
      setSupplierProducts([]);
      return;
    }

    const { data } = await supabase.from("products").select("id,name,price").eq("supplier_id", supplierId).order("name");
    setSupplierProducts(data || []);
  };

  const create = async () => {
    const items = form.items || [];
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    if (!isAdmin) return toast.error("Admin access required");
    if (!form.order_number || !form.supplier_id || !form.supplier_name) return toast.error("Order number and supplier required");
    if (!items.length) return toast.error("Select at least one item to purchase");

    const payload = {
      ...form,
      items_count: itemsCount,
      total_amount: totalAmount,
      items,
    };

    let error = null;
    ({ error } = await supabase.from("purchase_orders").insert(payload));

    if (error && error.message?.includes("items")) {
      const { error: fallbackError } = await supabase.from("purchase_orders").insert({
        ...form,
        items_count: itemsCount,
        total_amount: totalAmount,
      });
      error = fallbackError;
    }

    if (error) return toast.error(error.message);

    toast.success("Purchase order created"); setOpen(false); load();
    setForm({
      order_number: "",
      supplier_id: null,
      supplier_name: "",
      order_date: new Date().toISOString().slice(0, 10),
      items_count: 0,
      total_amount: 0,
      status: "Pending",
      items: [],
    });
    setSupplierProducts([]);
  };

  const remove = async (id: string) => {
    if (!isAdmin) return toast.error("Admin access required");
    if (!confirm("Delete order?")) return;
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.product_id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    }));
  };

  const removeItem = (productId: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.product_id !== productId),
    }));
  };

  const addItem = (product: ProductOption) => {
    setForm((current) => {
      const existing = current.items.find((item) => item.product_id === product.id);
      if (existing) {
        return {
          ...current,
          items: current.items.map((item) =>
            item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return {
        ...current,
        items: [...current.items, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.price }],
      };
    });
  };

  const pdfOrder = (order: PO) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Purchase Order", 14, 20);
    doc.setFontSize(11);
    doc.text(`Order #: ${order.order_number}`, 14, 32);
    doc.text(`Supplier: ${order.supplier_name}`, 14, 38);
    doc.text(`Date: ${order.order_date}`, 14, 44);
    doc.text(`Status: ${order.status}`, 14, 50);
    doc.text(`Total Items: ${order.items_count}`, 14, 58);
    doc.text(`Total Amount: $${order.total_amount.toFixed(2)}`, 14, 64);

    const startY = 76;
    doc.text("Items:", 14, startY);
    let y = startY + 6;
    order.items.forEach((item, index) => {
      const line = `${index + 1}. ${item.name} x${item.quantity} @ $${item.unit_price.toFixed(2)} = $${(
        item.quantity * item.unit_price
      ).toFixed(2)}`;
      doc.text(line, 14, y);
      y += 8;
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`${order.order_number}.pdf`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="w-7 h-7 text-primary" />Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Track and manage all purchase orders</p>
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
            <tr>{["Order ID", "Supplier", "Date", "Items", "Total Amount", "Status", "Actions"].map((h) => <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-5 py-4 font-medium">{o.order_number}</td>
                <td className="px-5 py-4">{o.supplier_name}</td>
                <td className="px-5 py-4">{o.order_date}</td>
                <td className="px-5 py-4">{o.items?.length ? o.items.map((item) => item.name).join(", ") : "No items"}</td>
                <td className="px-5 py-4 font-semibold">${Number(o.total_amount).toFixed(2)}</td>
                <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
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
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Order Number *</Label><Input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} placeholder="PO-2024-006" /></div>
            <div><Label>Supplier *</Label>
              <select
                className="w-full h-10 px-3 border border-input rounded-md bg-background"
                value={form.supplier_id || ""}
                onChange={(e) => {
                  const supplier = suppliers.find((s) => s.id === e.target.value);
                  setForm({
                    ...form,
                    supplier_id: supplier?.id ?? null,
                    supplier_name: supplier?.name ?? "",
                    items: [],
                    items_count: 0,
                    total_amount: 0,
                  });
                  loadProductsForSupplier(supplier?.id ?? null);
                }}
              >
                <option value="">Select supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
            {supplierProducts.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Products from selected supplier</p>
                    <p className="text-xs text-muted-foreground">Pick items and quantities to include in the order</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {supplierProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">Unit price: ${product.price.toFixed(2)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addItem(product)}>Add</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></div>
              <div><Label>Status</Label>
                <select className="w-full h-10 px-3 border border-input rounded-md bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Pending</option><option>Approved</option><option>Delivered</option>
                </select>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold">Selected items</p>
                  <p className="text-xs text-muted-foreground">The order will include these items from the supplier.</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">Total quantity: {form.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  <p className="font-semibold">Total amount: ${form.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0).toFixed(2)}</p>
                </div>
              </div>
              {form.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items added yet.</p>
              ) : (
                <div className="space-y-2">
                  {form.items.map((item) => (
                    <div key={item.product_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Unit price: ${item.unit_price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.product_id, +e.target.value)}
                          className="w-20"
                        />
                        <Button variant="outline" size="icon" onClick={() => removeItem(item.product_id)}>×</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{details?.order_number}</DialogTitle></DialogHeader>
          {details && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2">
                <p><strong>Supplier:</strong> {details.supplier_name}</p>
                <p><strong>Date:</strong> {details.order_date}</p>
                <p><strong>Total items:</strong> {details.items_count}</p>
                <p><strong>Total amount:</strong> ${Number(details.total_amount).toFixed(2)}</p>
                <p><strong>Status:</strong> <StatusBadge status={details.status} /></p>
              </div>
              <div className="rounded-xl border border-border bg-secondary p-3">
                <p className="font-semibold">Order items</p>
                {details.items?.length ? (
                  <div className="mt-2 space-y-2 text-sm">
                    {details.items.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × ${item.unit_price.toFixed(2)}</p>
                        </div>
                        <p className="font-semibold">${(item.quantity * item.unit_price).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No items attached to this order.</p>
                )}
              </div>
              <Button variant="outline" onClick={() => pdfOrder(details)}>Download PDF</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;
