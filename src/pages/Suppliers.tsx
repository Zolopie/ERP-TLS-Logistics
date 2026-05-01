import { useEffect, useState } from "react";
import { Truck, Plus, Mail, Phone, Star, Filter, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

interface Supplier {
  id: string; name: string; contact_person: string; email: string; phone: string;
  products_count: number; rating: number; status: string;
}

const empty = { name: "", contact_person: "", email: "", phone: "", products_count: 0, rating: 0, status: "Active" };

const Suppliers = () => {
  const { isAdmin } = useAuth();
  const [list, setList] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("created_at");
    setList(data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter((s) =>
    [s.name, s.contact_person, s.email].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const save = async () => {
    if (!isAdmin) return toast.error("Admin access required");
    if (!form.name) return toast.error("Name required");
    if (editing) {
      const { error } = await supabase.from("suppliers").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Supplier updated");
    } else {
      const { error } = await supabase.from("suppliers").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Supplier added");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!isAdmin) return toast.error("Admin access required");
    if (!confirm("Delete this supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-7 h-7 text-primary" />Suppliers Management</h1>
          <p className="text-muted-foreground mt-1">Manage your supplier relationships and contacts</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search suppliers by name, contact, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card" />
        <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((s) => (
          <div key={s.id} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.contact_person}</p>
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{s.email}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{s.phone}</p>
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-border">
              <div><p className="text-xs text-muted-foreground">Products</p><p className="font-semibold">{s.products_count}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Rating</p><p className="font-semibold flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{s.rating}</p></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setDetails(s)}>View Details</Button>
              <Button variant="outline" size="icon" onClick={() => { setEditing(s); setForm(s); setOpen(true); }}>✎</Button>
              <Button variant="outline" size="icon" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Products</Label><Input type="number" value={form.products_count} onChange={(e) => setForm({ ...form, products_count: +e.target.value })} /></div>
              <div><Label>Rating</Label><Input type="number" step="0.1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: +e.target.value })} /></div>
              <div><Label>Status</Label>
                <select className="w-full h-10 px-3 border border-input rounded-md bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{details?.name}</DialogTitle></DialogHeader>
          {details && (
            <div className="space-y-2 text-sm">
              <p><strong>Contact:</strong> {details.contact_person}</p>
              <p><strong>Email:</strong> {details.email}</p>
              <p><strong>Phone:</strong> {details.phone}</p>
              <p><strong>Products:</strong> {details.products_count}</p>
              <p><strong>Rating:</strong> {details.rating} / 5</p>
              <p><strong>Status:</strong> <StatusBadge status={details.status} /></p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
