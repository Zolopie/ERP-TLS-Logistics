// Creates the two demo accounts on demand. No auth required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const accounts = [
  { email: "admin@tlslogistics.com", password: "Admin123", full_name: "Admin User", role: "admin" as const },
  { email: "user@tlslogistics.com", password: "User123", full_name: "Demo User", role: "user" as const },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, string> = {};

  for (const a of accounts) {
    // List & find existing
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === a.email);
    let userId = existing?.id;

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: a.email,
        password: a.password,
        email_confirm: true,
        user_metadata: { full_name: a.full_name },
      });
      if (error) {
        results[a.email] = `error: ${error.message}`;
        continue;
      }
      userId = data.user!.id;
      results[a.email] = "created";
    } else {
      // Ensure password is reset to demo value
      await admin.auth.admin.updateUserById(userId, { password: a.password, email_confirm: true });
      results[a.email] = "exists";
    }

    // Ensure role
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role: a.role });

    // Ensure profile
    const { data: prof } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!prof) {
      await admin.from("profiles").insert({ user_id: userId, full_name: a.full_name, email: a.email });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
