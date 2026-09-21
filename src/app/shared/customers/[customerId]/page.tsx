import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CustomerDetailClient } from "./CustomerDetailClient";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();
  const currentUserRole = (myProfile?.role as "admin" | "sales") || "sales";

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error || !customer) {
    return notFound();
  }

  const [{ data: contacts }, { data: quotes }, { data: profiles }, { data: activities }, { data: tasks }, { data: opportunities }, { data: documents }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, final_price, currency, status, created_at, products(name)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name"),
    supabase
      .from("activities")
      .select("*")
      .eq("customer_id", customerId)
      .order("activity_date", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("customer_id", customerId)
      .order("due_date", { ascending: true }),
    supabase
      .from("opportunities")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  const canEdit =
    currentUserRole === "admin" ||
    customer.owner_id === user?.id ||
    customer.created_by === user?.id;

  return (
    <CustomerDetailClient
      customer={customer}
      initialContacts={contacts || []}
      quotes={quotes || []}
      initialActivities={activities || []}
      initialTasks={tasks || []}
      initialOpportunities={opportunities || []}
      initialDocuments={documents || []}
      salesReps={(profiles || []).filter((p) => p.role === "admin" || p.role === "sales")}
      canEdit={canEdit}
    />
  );
}
