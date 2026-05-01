import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Plus, Download, RefreshCw, Filter, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, stockStatus } from "@/components/StatusBadge";
import { toast } from "sonner";

interface Product {
  id: string; name: string; sku: string; category: string;
  current_stock: number; min_stock: number; price: number;
  supplier_id: string | null;
}

interface SupplierOption { id: string; name: string; }

const empty = { name: "", sku: "", category: "", current_stock: 0, min_stock: 0, price: 0, supplier_id: null };

const Products = () => {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [{ data: productsData }, { data: suppliersData }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name").order("name"),
    ]);
    setProducts(productsData || []);
    setSuppliers(suppliersData || []);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (params.get("action") === "add") {
      setEditing(null); setForm(empty); setOpen(true);
      params.delete("action"); setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const filtered = products.filter((p) =>
    [p.name, p.sku, p.category, p.supplier_id ? suppliers.find((s) => s.id === p.supplier_id)?.name ?? "" : ""].some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  const requireAdmin = () => { if (!isAdmin) { toast.error("Admin access required"); return false; } return true; };

  const save = async () => {
    if (!requireAdmin()) return;
    if (!form.name || !form.sku || !form.category) { toast.error("Fill all required fields"); return; }
    if (editing) {
      const { error } = await supabase.from("products").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Product added");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!requireAdmin()) return;
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted"); load();
  };

  const updateStock = async () => {
    if (!requireAdmin() || !stockOpen) return;
    const { error } = await supabase.from("products").update({ current_stock: stockValue }).eq("id", stockOpen.id);
    if (error) return toast.error(error.message);
    toast.success("Stock updated"); setStockOpen(null); load();
  };

  const exportCsv = () => {
    const rows = [["Name", "SKU", "Category", "Supplier", "Current Stock", "Min Stock", "Price"]];
    filtered.forEach((p) => {
      const supplierName = p.supplier_id ? suppliers.find((s) => s.id === p.supplier_id)?.name ?? "Unknown" : "Unassigned";
      rows.push([p.name, p.sku, p.category, supplierName, String(p.current_stock), String(p.min_stock), String(p.price)]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-7 h-7 text-primary" />Products Management</h1>
          <p className="text-muted-foreground mt-1">Manage your product inventory and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search by product name, SKU, or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card" />
        <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              {["Product Name", "SKU", "Category", "Supplier", "Current Stock", "Min Stock", "Price", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const status = stockStatus(p.current_stock, p.min_stock);
              const stockColor = status === "Critical" ? "text-destructive" : status === "Low" ? "text-warning" : "text-success";
              return (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Package className="w-4 h-4" /></div>
                    <span className="font-medium">{p.name}</span>
                  </td>
                  <td className="px-5 py-4">{p.sku}</td>
                  <td className="px-5 py-4">{p.category}</td>
                  <td className="px-5 py-4">{p.supplier_id ? suppliers.find((s) => s.id === p.supplier_id)?.name ?? "Unknown" : "Unassigned"}</td>
                  <td className={`px-5 py-4 font-semibold ${stockColor}`}>{p.current_stock}</td>
                  <td className="px-5 py-4">{p.min_stock}</td>
                  <td className="px-5 py-4">${Number(p.price).toFixed(2)}</td>
                  <td className="px-5 py-4"><StatusBadge status={status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => { setStockOpen(p); setStockValue(p.current_stock); }} className="text-primary hover:underline flex items-center gap-1 text-xs">
                        <RefreshCw className="w-3 h-3" />Update Stock
                      </button>
                      <button onClick={() => { setEditing(p); setForm({ name: p.name, sku: p.sku, category: p.category, current_stock: p.current_stock, min_stock: p.min_stock, price: p.price, supplier_id: p.supplier_id }); setOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(p.id)} className="text-destructive hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>SKU *</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>Category *</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Supplier</Label>
              <select
                className="w-full h-10 px-3 border border-input rounded-md bg-background"
                value={form.supplier_id || ""}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Current Stock</Label><Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: +e.target.value })} /></div>
              <div><Label>Min Stock</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value })} /></div>
              <div><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockOpen} onOpenChange={(o) => !o && setStockOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Stock — {stockOpen?.name}</DialogTitle></DialogHeader>
          <div><Label>New Stock Level</Label><Input type="number" value={stockValue} onChange={(e) => setStockValue(+e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setStockOpen(null)}>Cancel</Button><Button onClick={updateStock}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
