"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Users,
  FileText,
  X,
  Phone,
  Mail,
  CalendarClock,
  MessageSquare,
  History,
  ListTodo,
  CheckCircle2,
  Circle,
  Ban,
  Target,
  Percent,
  Paperclip,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateCustomerAction,
  createContactAction,
  updateContactAction,
  deleteContactAction,
} from "@/actions/customer.actions";
import {
  createActivityAction,
  updateActivityAction,
  deleteActivityAction,
} from "@/actions/activity.actions";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/actions/task.actions";
import {
  createOpportunityAction,
  updateOpportunityAction,
  deleteOpportunityAction,
} from "@/actions/opportunity.actions";
import {
  uploadDocumentAction,
  getDocumentDownloadUrlAction,
  deleteDocumentAction,
} from "@/actions/document.actions";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType, Contact, Customer, CustomerDocument, CustomerStatus, Opportunity, OpportunityStage, Task, TaskStatus } from "@/types/product.types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localeFor } from "@/lib/i18n/format";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "CHF", "JPY"];

interface QuoteRow {
  id: string;
  final_price: number;
  currency: string;
  status: string;
  created_at: string;
  products?: { name: string } | { name: string }[] | null;
}

function getProductName(products: QuoteRow["products"]): string {
  if (!products) return "—";
  return Array.isArray(products) ? products[0]?.name || "—" : products.name;
}

function getStatusMap(t: (key: DictionaryKey) => string): Record<CustomerStatus, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> {
  return {
    lead: { label: t("customers.status.lead"), variant: "warning" },
    active: { label: t("customers.status.active"), variant: "success" },
    inactive: { label: t("customers.status.inactive"), variant: "secondary" },
    lost: { label: t("customers.status.lost"), variant: "destructive" },
  };
}

function getQuoteStatusMap(t: (key: DictionaryKey) => string): Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive" | "brand" }> {
  return {
    pending: { label: t("customers.quoteStatus.pending"), variant: "warning" },
    accepted: { label: t("customers.quoteStatus.accepted"), variant: "success" },
    rejected: { label: t("customers.quoteStatus.rejected"), variant: "destructive" },
    pending_admin_approval: { label: t("customers.quoteStatus.pendingAdminApproval"), variant: "brand" },
  };
}

function getActivityTypeMap(t: (key: DictionaryKey) => string): Record<ActivityType, { label: string; icon: typeof Phone }> {
  return {
    call: { label: t("customers.activityType.call"), icon: Phone },
    email: { label: t("customers.activityType.email"), icon: Mail },
    meeting: { label: t("customers.activityType.meeting"), icon: CalendarClock },
    note: { label: t("customers.activityType.note"), icon: FileText },
    other: { label: t("customers.activityType.other"), icon: MessageSquare },
  };
}

function getTaskStatusMap(t: (key: DictionaryKey) => string): Record<TaskStatus, { label: string; variant: "success" | "warning" | "secondary" }> {
  return {
    pending: { label: t("customers.taskStatus.pending"), variant: "warning" },
    completed: { label: t("customers.taskStatus.completed"), variant: "success" },
    cancelled: { label: t("customers.taskStatus.cancelled"), variant: "secondary" },
  };
}

function getOpportunityStageMap(t: (key: DictionaryKey) => string): Record<OpportunityStage, { label: string; variant: "success" | "warning" | "secondary" | "destructive" | "brand" }> {
  return {
    lead: { label: t("customers.opportunityStage.lead"), variant: "secondary" },
    qualified: { label: t("customers.opportunityStage.qualified"), variant: "secondary" },
    proposal: { label: t("customers.opportunityStage.proposal"), variant: "warning" },
    negotiation: { label: t("customers.opportunityStage.negotiation"), variant: "brand" },
    won: { label: t("customers.opportunityStage.won"), variant: "success" },
    lost: { label: t("customers.opportunityStage.lost"), variant: "destructive" },
  };
}

const formatDate = (dateStr: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date(dateStr));

const formatDateTime = (dateStr: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(dateStr));

const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

function toDatetimeLocalValue(dateStr: string) {
  const d = new Date(dateStr);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateInputValue(dateStr: string) {
  return toDatetimeLocalValue(dateStr).slice(0, 10);
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isOverdue(task: Pick<Task, "due_date" | "status">) {
  if (task.status !== "pending") return false;
  // Saat farkını yok say: bugün vadesi gelen bir görev henüz "gecikmiş" sayılmaz,
  // sadece vade tarihinin takvim günü bugünden önceyse gecikmiş sayılır.
  const due = new Date(task.due_date);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dueDay.getTime() < todayDay.getTime();
}

export function CustomerDetailClient({
  customer: initialCustomer,
  initialContacts,
  quotes,
  initialActivities,
  initialTasks,
  initialOpportunities,
  initialDocuments,
  salesReps,
  canEdit,
}: {
  customer: Customer;
  initialContacts: Contact[];
  quotes: QuoteRow[];
  initialActivities: Activity[];
  initialTasks: Task[];
  initialOpportunities: Opportunity[];
  initialDocuments: CustomerDocument[];
  salesReps: { id: string; full_name: string | null; role: string }[];
  canEdit: boolean;
}) {
  const { t, lang } = useLanguage();
  const locale = localeFor(lang);
  const STATUS_MAP = getStatusMap(t);
  const QUOTE_STATUS_MAP = getQuoteStatusMap(t);
  const ACTIVITY_TYPE_MAP = getActivityTypeMap(t);
  const TASK_STATUS_MAP = getTaskStatusMap(t);
  const OPPORTUNITY_STAGE_MAP = getOpportunityStageMap(t);
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [contacts, setContacts] = useState(initialContacts);
  const [activities, setActivities] = useState(initialActivities);
  const [tasks, setTasks] = useState(initialTasks);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [documents, setDocuments] = useState(initialDocuments);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    company_name: customer.company_name,
    contact_name: customer.contact_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    address: customer.address || "",
    status: customer.status,
    owner_id: customer.owner_id || "",
    industry: customer.industry || "",
    source: customer.source || "",
    tagsInput: (customer.tags || []).join(", "),
    notes: customer.notes || "",
  });

  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({
    full_name: "",
    title: "",
    email: "",
    phone: "",
    is_primary: false,
    notes: "",
  });
  const [isContactSaving, setIsContactSaving] = useState(false);

  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityForm, setActivityForm] = useState<{
    type: ActivityType;
    subject: string;
    notes: string;
    activity_date: string;
  }>({ type: "note", subject: "", notes: "", activity_date: toDatetimeLocalValue(new Date().toISOString()) });
  const [isActivitySaving, setIsActivitySaving] = useState(false);

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: toDateInputValue(new Date().toISOString()),
    assigned_to: "",
  });
  const [isTaskSaving, setIsTaskSaving] = useState(false);

  const [isOpportunityDialogOpen, setIsOpportunityDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [opportunityForm, setOpportunityForm] = useState({
    title: "",
    stage: "lead" as OpportunityStage,
    estimated_value: "",
    currency: "USD",
    probability: "",
    expected_close_date: "",
    owner_id: "",
    lost_reason: "",
    competitor: "",
  });
  const [isOpportunitySaving, setIsOpportunitySaving] = useState(false);

  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDocumentUploading, setIsDocumentUploading] = useState(false);

  const stat = STATUS_MAP[customer.status] || STATUS_MAP.lead;
  const ownerName = salesReps.find((p) => p.id === customer.owner_id)?.full_name;

  function startEdit() {
    setForm({
      company_name: customer.company_name,
      contact_name: customer.contact_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      status: customer.status,
      owner_id: customer.owner_id || "",
      industry: customer.industry || "",
      source: customer.source || "",
      tagsInput: (customer.tags || []).join(", "),
      notes: customer.notes || "",
    });
    setIsEditing(true);
  }

  async function handleSaveCustomer() {
    if (!form.company_name.trim()) {
      toast.error(t("customers.errors.companyNameRequired"));
      return;
    }
    setIsSaving(true);
    const res = await updateCustomerAction(customer.id, {
      company_name: form.company_name,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      status: form.status,
      owner_id: form.owner_id || null,
      industry: form.industry || null,
      source: form.source || null,
      tags: form.tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
      notes: form.notes || null,
    });
    setIsSaving(false);

    if (res.success && res.customer) {
      setCustomer(res.customer);
      setIsEditing(false);
      toast.success(t("customers.toast.updateSuccess"));
    } else {
      toast.error(t("customers.toast.updateError"), { description: res.error });
    }
  }

  function openNewContactDialog() {
    setEditingContact(null);
    setContactForm({ full_name: "", title: "", email: "", phone: "", is_primary: contacts.length === 0, notes: "" });
    setIsContactDialogOpen(true);
  }

  function openEditContactDialog(contact: Contact) {
    setEditingContact(contact);
    setContactForm({
      full_name: contact.full_name,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      is_primary: contact.is_primary,
      notes: contact.notes || "",
    });
    setIsContactDialogOpen(true);
  }

  async function handleSaveContact() {
    if (!contactForm.full_name.trim()) {
      toast.error(t("customers.errors.contactNameRequired"));
      return;
    }
    setIsContactSaving(true);

    if (editingContact) {
      const res = await updateContactAction(editingContact.id, {
        full_name: contactForm.full_name,
        title: contactForm.title || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        is_primary: contactForm.is_primary,
        notes: contactForm.notes || null,
      });
      setIsContactSaving(false);
      if (res.success && res.contact) {
        setContacts((prev) => {
          const updated = prev.map((c) => (c.id === editingContact.id ? res.contact! : c));
          return contactForm.is_primary
            ? updated.map((c) => (c.id === editingContact.id ? c : { ...c, is_primary: false }))
            : updated;
        });
        toast.success(t("customers.toast.contactUpdateSuccess"));
        setIsContactDialogOpen(false);
      } else {
        toast.error(t("customers.toast.contactUpdateError"), { description: res.error });
      }
    } else {
      const res = await createContactAction({
        customer_id: customer.id,
        full_name: contactForm.full_name,
        title: contactForm.title || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        is_primary: contactForm.is_primary,
        notes: contactForm.notes || undefined,
      });
      setIsContactSaving(false);
      if (res.success && res.contact) {
        setContacts((prev) => {
          const next = contactForm.is_primary ? prev.map((c) => ({ ...c, is_primary: false })) : prev;
          return [res.contact!, ...next];
        });
        toast.success(t("customers.toast.contactAddSuccess"));
        setIsContactDialogOpen(false);
      } else {
        toast.error(t("customers.toast.contactAddError"), { description: res.error });
      }
    }
  }

  async function handleDeleteContact(contact: Contact) {
    if (!window.confirm(`"${contact.full_name}${t("customers.confirm.deleteItemSuffix")}`)) return;
    const res = await deleteContactAction(contact.id);
    if (res.success) {
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      toast.success(t("customers.toast.contactDeleteSuccess"));
    } else {
      toast.error(t("customers.toast.contactDeleteError"), { description: res.error });
    }
  }

  function openNewActivityDialog() {
    setEditingActivity(null);
    setActivityForm({
      type: "note",
      subject: "",
      notes: "",
      activity_date: toDatetimeLocalValue(new Date().toISOString()),
    });
    setIsActivityDialogOpen(true);
  }

  function openEditActivityDialog(activity: Activity) {
    setEditingActivity(activity);
    setActivityForm({
      type: activity.type,
      subject: activity.subject,
      notes: activity.notes || "",
      activity_date: toDatetimeLocalValue(activity.activity_date),
    });
    setIsActivityDialogOpen(true);
  }

  async function handleSaveActivity() {
    if (!activityForm.subject.trim()) {
      toast.error(t("customers.errors.subjectRequired"));
      return;
    }
    setIsActivitySaving(true);
    const activityDateIso = new Date(activityForm.activity_date).toISOString();

    if (editingActivity) {
      const res = await updateActivityAction(editingActivity.id, {
        type: activityForm.type,
        subject: activityForm.subject,
        notes: activityForm.notes || null,
        activity_date: activityDateIso,
      });
      setIsActivitySaving(false);
      if (res.success && res.activity) {
        setActivities((prev) =>
          prev
            .map((a) => (a.id === editingActivity.id ? res.activity! : a))
            .sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())
        );
        toast.success(t("customers.toast.activityUpdateSuccess"));
        setIsActivityDialogOpen(false);
      } else {
        toast.error(t("customers.toast.activityUpdateError"), { description: res.error });
      }
    } else {
      const res = await createActivityAction({
        customer_id: customer.id,
        type: activityForm.type,
        subject: activityForm.subject,
        notes: activityForm.notes || undefined,
        activity_date: activityDateIso,
      });
      setIsActivitySaving(false);
      if (res.success && res.activity) {
        setActivities((prev) =>
          [res.activity!, ...prev].sort(
            (a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
          )
        );
        toast.success(t("customers.toast.activityAddSuccess"));
        setIsActivityDialogOpen(false);
      } else {
        toast.error(t("customers.toast.activityAddError"), { description: res.error });
      }
    }
  }

  async function handleDeleteActivity(activity: Activity) {
    if (!window.confirm(`"${activity.subject}${t("customers.confirm.deleteItemSuffix")}`)) return;
    const res = await deleteActivityAction(activity.id);
    if (res.success) {
      setActivities((prev) => prev.filter((a) => a.id !== activity.id));
      toast.success(t("customers.toast.activityDeleteSuccess"));
    } else {
      toast.error(t("customers.toast.activityDeleteError"), { description: res.error });
    }
  }

  function openNewTaskDialog() {
    setEditingTask(null);
    setTaskForm({
      title: "",
      description: "",
      due_date: toDateInputValue(new Date().toISOString()),
      assigned_to: "",
    });
    setIsTaskDialogOpen(true);
  }

  function openEditTaskDialog(task: Task) {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      due_date: toDateInputValue(task.due_date),
      assigned_to: task.assigned_to || "",
    });
    setIsTaskDialogOpen(true);
  }

  async function handleSaveTask() {
    if (!taskForm.title.trim()) {
      toast.error(t("customers.errors.taskTitleRequired"));
      return;
    }
    setIsTaskSaving(true);
    const dueDateIso = new Date(`${taskForm.due_date}T00:00:00`).toISOString();

    if (editingTask) {
      const res = await updateTaskAction(editingTask.id, {
        title: taskForm.title,
        description: taskForm.description || null,
        due_date: dueDateIso,
        assigned_to: taskForm.assigned_to || null,
      });
      setIsTaskSaving(false);
      if (res.success && res.task) {
        setTasks((prev) =>
          prev
            .map((tk) => (tk.id === editingTask.id ? res.task! : tk))
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        );
        toast.success(t("customers.toast.taskUpdateSuccess"));
        setIsTaskDialogOpen(false);
      } else {
        toast.error(t("customers.toast.taskUpdateError"), { description: res.error });
      }
    } else {
      const res = await createTaskAction({
        customer_id: customer.id,
        title: taskForm.title,
        description: taskForm.description || undefined,
        due_date: dueDateIso,
        assigned_to: taskForm.assigned_to || undefined,
      });
      setIsTaskSaving(false);
      if (res.success && res.task) {
        setTasks((prev) =>
          [res.task!, ...prev].sort(
            (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          )
        );
        toast.success(t("customers.toast.taskAddSuccess"));
        setIsTaskDialogOpen(false);
      } else {
        toast.error(t("customers.toast.taskAddError"), { description: res.error });
      }
    }
  }

  async function handleToggleTaskStatus(task: Task) {
    const nextStatus: TaskStatus = task.status === "completed" ? "pending" : "completed";
    const res = await updateTaskAction(task.id, { status: nextStatus });
    if (res.success && res.task) {
      setTasks((prev) => prev.map((tk) => (tk.id === task.id ? res.task! : tk)));
    } else {
      toast.error(t("customers.toast.taskStatusUpdateError"), { description: res.error });
    }
  }

  async function handleDeleteTask(task: Task) {
    if (!window.confirm(`"${task.title}${t("customers.confirm.deleteItemSuffix")}`)) return;
    const res = await deleteTaskAction(task.id);
    if (res.success) {
      setTasks((prev) => prev.filter((tk) => tk.id !== task.id));
      toast.success(t("customers.toast.taskDeleteSuccess"));
    } else {
      toast.error(t("customers.toast.taskDeleteError"), { description: res.error });
    }
  }

  function openNewOpportunityDialog() {
    setEditingOpportunity(null);
    setOpportunityForm({
      title: "",
      stage: "lead",
      estimated_value: "",
      currency: "USD",
      probability: "",
      expected_close_date: "",
      owner_id: "",
      lost_reason: "",
      competitor: "",
    });
    setIsOpportunityDialogOpen(true);
  }

  function openEditOpportunityDialog(opportunity: Opportunity) {
    setEditingOpportunity(opportunity);
    setOpportunityForm({
      title: opportunity.title,
      stage: opportunity.stage,
      estimated_value: opportunity.estimated_value != null ? String(opportunity.estimated_value) : "",
      currency: opportunity.currency,
      probability: opportunity.probability != null ? String(opportunity.probability) : "",
      expected_close_date: opportunity.expected_close_date ? opportunity.expected_close_date.slice(0, 10) : "",
      owner_id: opportunity.owner_id || "",
      lost_reason: opportunity.lost_reason || "",
      competitor: opportunity.competitor || "",
    });
    setIsOpportunityDialogOpen(true);
  }

  async function handleSaveOpportunity() {
    if (!opportunityForm.title.trim()) {
      toast.error(t("customers.errors.opportunityTitleRequired"));
      return;
    }
    setIsOpportunitySaving(true);

    const estimatedValue = opportunityForm.estimated_value.trim() ? Number(opportunityForm.estimated_value) : undefined;
    const probability = opportunityForm.probability.trim() ? Number(opportunityForm.probability) : undefined;

    if (editingOpportunity) {
      const res = await updateOpportunityAction(editingOpportunity.id, {
        title: opportunityForm.title,
        stage: opportunityForm.stage,
        estimated_value: estimatedValue ?? null,
        currency: opportunityForm.currency,
        probability: probability ?? null,
        expected_close_date: opportunityForm.expected_close_date || null,
        owner_id: opportunityForm.owner_id || null,
        lost_reason: opportunityForm.stage === "lost" ? (opportunityForm.lost_reason || null) : null,
        competitor: opportunityForm.stage === "lost" ? (opportunityForm.competitor || null) : null,
      });
      setIsOpportunitySaving(false);
      if (res.success && res.opportunity) {
        setOpportunities((prev) => prev.map((o) => (o.id === editingOpportunity.id ? res.opportunity! : o)));
        toast.success(t("customers.toast.opportunityUpdateSuccess"));
        setIsOpportunityDialogOpen(false);
      } else {
        toast.error(t("customers.toast.opportunityUpdateError"), { description: res.error });
      }
    } else {
      const res = await createOpportunityAction({
        customer_id: customer.id,
        title: opportunityForm.title,
        stage: opportunityForm.stage,
        estimated_value: estimatedValue,
        currency: opportunityForm.currency,
        probability: probability,
        expected_close_date: opportunityForm.expected_close_date || undefined,
        owner_id: opportunityForm.owner_id || undefined,
        lost_reason: opportunityForm.stage === "lost" ? (opportunityForm.lost_reason || undefined) : undefined,
        competitor: opportunityForm.stage === "lost" ? (opportunityForm.competitor || undefined) : undefined,
      });
      setIsOpportunitySaving(false);
      if (res.success && res.opportunity) {
        setOpportunities((prev) => [res.opportunity!, ...prev]);
        toast.success(t("customers.toast.opportunityAddSuccess"));
        setIsOpportunityDialogOpen(false);
      } else {
        toast.error(t("customers.toast.opportunityAddError"), { description: res.error });
      }
    }
  }

  async function handleDeleteOpportunity(opportunity: Opportunity) {
    if (!window.confirm(`"${opportunity.title}${t("customers.confirm.deleteItemSuffix")}`)) return;
    const res = await deleteOpportunityAction(opportunity.id);
    if (res.success) {
      setOpportunities((prev) => prev.filter((o) => o.id !== opportunity.id));
      toast.success(t("customers.toast.opportunityDeleteSuccess"));
    } else {
      toast.error(t("customers.toast.opportunityDeleteError"), { description: res.error });
    }
  }

  function openUploadDialog() {
    setPendingFile(null);
    setIsDocumentDialogOpen(true);
  }

  async function handleUploadDocument() {
    if (!pendingFile) {
      toast.error(t("customers.errors.fileRequired"));
      return;
    }
    setIsDocumentUploading(true);
    const formData = new FormData();
    formData.set("customer_id", customer.id);
    formData.set("file", pendingFile);

    const res = await uploadDocumentAction(formData);
    setIsDocumentUploading(false);
    if (res.success && res.document) {
      setDocuments((prev) => [res.document!, ...prev]);
      toast.success(t("customers.toast.documentUploadSuccess"));
      setIsDocumentDialogOpen(false);
      setPendingFile(null);
    } else {
      toast.error(t("customers.toast.documentUploadError"), { description: res.error });
    }
  }

  async function handleDownloadDocument(doc: CustomerDocument) {
    const res = await getDocumentDownloadUrlAction(doc.id);
    if (res.success && res.url) {
      window.open(res.url, "_blank");
    } else {
      toast.error(t("customers.toast.downloadLinkError"), { description: res.error });
    }
  }

  async function handleDeleteDocument(doc: CustomerDocument) {
    if (!window.confirm(`"${doc.file_name}${t("customers.confirm.deleteItemSuffix")}`)) return;
    const res = await deleteDocumentAction(doc.id);
    if (res.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success(t("customers.toast.documentDeleteSuccess"));
    } else {
      toast.error(t("customers.toast.documentDeleteError"), { description: res.error });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/shared/customers"
            className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("customers.backToDatabase")}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-50 p-3 rounded-lg">
                <Building2 className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.company_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={stat.variant}>{stat.label}</Badge>
                  {ownerName && <span className="text-sm text-slate-500">{t("customers.responsiblePrefix")}{ownerName}</span>}
                </div>
              </div>
            </div>
            {canEdit && !isEditing && (
              <Button variant="outline" onClick={startEdit}>
                <Pencil className="mr-2 h-4 w-4" /> {t("customers.edit")}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("customers.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="contacts">{t("customers.tabs.contacts")} ({contacts.length})</TabsTrigger>
            <TabsTrigger value="activities">{t("customers.tabs.activities")} ({activities.length})</TabsTrigger>
            <TabsTrigger value="tasks">{t("customers.tabs.tasks")} ({tasks.filter((tk) => tk.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="opportunities">{t("customers.tabs.opportunities")} ({opportunities.length})</TabsTrigger>
            <TabsTrigger value="documents">{t("customers.tabs.documents")} ({documents.length})</TabsTrigger>
            <TabsTrigger value="quotes">{t("customers.tabs.quotes")} ({quotes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-6">
              {!isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <InfoField label={t("customers.fields.primaryContact")} value={customer.contact_name} />
                  <InfoField label={t("customers.fields.email")} value={customer.email} />
                  <InfoField label={t("customers.form.phone")} value={customer.phone} />
                  <InfoField label={t("customers.fields.industry")} value={customer.industry} />
                  <InfoField label={t("customers.fields.source")} value={customer.source} />
                  <InfoField label={t("customers.fields.owner")} value={ownerName || t("customers.unassigned")} />
                  <InfoField label={t("customers.form.address")} value={customer.address} className="sm:col-span-2" />
                  <InfoField label={t("customers.table.registrationDate")} value={customer.created_at ? formatDate(customer.created_at, locale) : "—"} />
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t("customers.fields.tags")}</div>
                    {customer.tags && customer.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {customer.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                  <InfoField label={t("customers.fields.notes")} value={customer.notes} className="sm:col-span-2 whitespace-pre-wrap" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("customers.form.companyNameRequired")}</Label>
                      <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("customers.fields.primaryContact")}</Label>
                      <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("customers.fields.email")}</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("customers.form.phone")}</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t("customers.form.address")}</Label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("customers.fields.status")}</Label>
                      <SelectNative value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}>
                        {Object.entries(STATUS_MAP).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </SelectNative>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("customers.fields.owner")}</Label>
                      <SelectNative value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
                        <option value="">{t("customers.unassigned")}</option>
                        {salesReps.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name || p.id}</option>
                        ))}
                      </SelectNative>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("customers.fields.industry")}</Label>
                      <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder={t("customers.form.industryPlaceholder")} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("customers.fields.source")}</Label>
                      <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder={t("customers.form.sourcePlaceholder")} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t("customers.form.tagsLabel")}</Label>
                      <Input value={form.tagsInput} onChange={(e) => setForm({ ...form, tagsInput: e.target.value })} placeholder={t("customers.form.tagsPlaceholder")} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t("customers.fields.notes")}</Label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={4}
                        className={cn(
                          "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
                          "placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500"
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      <X className="mr-2 h-4 w-4" /> {t("customers.cancelEdit")}
                    </Button>
                    <Button variant="primary" onClick={handleSaveCustomer} disabled={isSaving}>
                      {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("customers.saving")}</> : t("customers.save")}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{t("customers.contactsTab.heading")}</h3>
                  <p className="text-sm text-slate-500">{t("customers.contactsTab.description")}</p>
                </div>
                <Button variant="primary" onClick={openNewContactDialog}>
                  <Plus className="mr-2 h-4 w-4" /> {t("customers.contactsTab.addContact")}
                </Button>
              </div>

              {contacts.length === 0 ? (
                <div className="p-8 bg-slate-50/30">
                  <EmptyState
                    icon={Users}
                    title={t("customers.contactsTab.emptyTitle")}
                    description={t("customers.contactsTab.emptyDescription")}
                    action={
                      <Button variant="primary" onClick={openNewContactDialog}>
                        <Plus className="mr-2 h-4 w-4" /> {t("customers.contactsTab.addContact")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customers.contactsTab.fullName")}</TableHead>
                      <TableHead>{t("customers.contactsTab.title")}</TableHead>
                      <TableHead>{t("customers.table.contact")}</TableHead>
                      <TableHead className="text-right">{t("customers.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            {contact.is_primary && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                            {contact.full_name}
                          </div>
                        </TableCell>
                        <TableCell>{contact.title || "—"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {contact.email && <div>{contact.email}</div>}
                            {contact.phone && <div className="text-slate-500">{contact.phone}</div>}
                            {!contact.email && !contact.phone && "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditContactDialog(contact)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{t("customers.activitiesTab.heading")}</h3>
                  <p className="text-sm text-slate-500">{t("customers.activitiesTab.description")}</p>
                </div>
                <Button variant="primary" onClick={openNewActivityDialog}>
                  <Plus className="mr-2 h-4 w-4" /> {t("customers.activitiesTab.addActivity")}
                </Button>
              </div>

              {activities.length === 0 ? (
                <div className="p-8 bg-slate-50/30">
                  <EmptyState
                    icon={History}
                    title={t("customers.activitiesTab.emptyTitle")}
                    description={t("customers.activitiesTab.emptyDescription")}
                    action={
                      <Button variant="primary" onClick={openNewActivityDialog}>
                        <Plus className="mr-2 h-4 w-4" /> {t("customers.activitiesTab.addActivity")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activities.map((activity) => {
                    const typeInfo = ACTIVITY_TYPE_MAP[activity.type] || ACTIVITY_TYPE_MAP.other;
                    const ActivityIcon = typeInfo.icon;
                    const creatorName = salesReps.find((p) => p.id === activity.created_by)?.full_name;
                    return (
                      <div key={activity.id} className="p-6 flex gap-4">
                        <div className="bg-brand-50 p-2.5 rounded-full h-fit shrink-0">
                          <ActivityIcon className="h-4 w-4 text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{activity.subject}</span>
                              <Badge variant="secondary">{typeInfo.label}</Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => openEditActivityDialog(activity)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteActivity(activity)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          {activity.notes && (
                            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{activity.notes}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            {formatDateTime(activity.activity_date, locale)}
                            {creatorName && <> · {creatorName}</>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{t("customers.tasksTab.heading")}</h3>
                  <p className="text-sm text-slate-500">{t("customers.tasksTab.description")}</p>
                </div>
                <Button variant="primary" onClick={openNewTaskDialog}>
                  <Plus className="mr-2 h-4 w-4" /> {t("customers.tasksTab.addTask")}
                </Button>
              </div>

              {tasks.length === 0 ? (
                <div className="p-8 bg-slate-50/30">
                  <EmptyState
                    icon={ListTodo}
                    title={t("customers.tasksTab.emptyTitle")}
                    description={t("customers.tasksTab.emptyDescription")}
                    action={
                      <Button variant="primary" onClick={openNewTaskDialog}>
                        <Plus className="mr-2 h-4 w-4" /> {t("customers.tasksTab.addTask")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const statInfo = TASK_STATUS_MAP[task.status] || TASK_STATUS_MAP.pending;
                    const assigneeName = salesReps.find((p) => p.id === task.assigned_to)?.full_name;
                    const overdue = isOverdue(task);
                    return (
                      <div key={task.id} className="p-6 flex gap-4">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className="h-fit shrink-0 text-slate-300 hover:text-brand-600 transition-colors"
                          title={task.status === "completed" ? t("customers.taskToggle.markPending") : t("customers.taskToggle.markCompleted")}
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "font-semibold text-slate-900",
                                task.status === "completed" && "line-through text-slate-400"
                              )}>
                                {task.title}
                              </span>
                              <Badge variant={statInfo.variant}>{statInfo.label}</Badge>
                              {overdue && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <Ban className="h-3 w-3" /> {t("customers.taskOverdueBadge")}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => openEditTaskDialog(task)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{task.description}</p>
                          )}
                          <p className={cn("text-xs mt-2", overdue ? "text-red-500 font-medium" : "text-slate-400")}>
                            {t("customers.taskDuePrefix")}{formatDate(task.due_date, locale)}
                            {assigneeName && <>{t("customers.taskAssignedPrefix")}{assigneeName}</>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="opportunities">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{t("customers.opportunitiesTab.heading")}</h3>
                  <p className="text-sm text-slate-500">{t("customers.opportunitiesTab.description")}</p>
                </div>
                <Button variant="primary" onClick={openNewOpportunityDialog}>
                  <Plus className="mr-2 h-4 w-4" /> {t("customers.opportunitiesTab.addOpportunity")}
                </Button>
              </div>

              {opportunities.length === 0 ? (
                <div className="p-8 bg-slate-50/30">
                  <EmptyState
                    icon={Target}
                    title={t("customers.opportunitiesTab.emptyTitle")}
                    description={t("customers.opportunitiesTab.emptyDescription")}
                    action={
                      <Button variant="primary" onClick={openNewOpportunityDialog}>
                        <Plus className="mr-2 h-4 w-4" /> {t("customers.opportunitiesTab.addOpportunity")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {opportunities.map((opportunity) => {
                    const stageInfo = OPPORTUNITY_STAGE_MAP[opportunity.stage] || OPPORTUNITY_STAGE_MAP.lead;
                    const ownerNameForOpp = salesReps.find((p) => p.id === opportunity.owner_id)?.full_name;
                    return (
                      <div key={opportunity.id} className="p-6 flex gap-4">
                        <div className="bg-brand-50 p-2.5 rounded-full h-fit shrink-0">
                          <Target className="h-4 w-4 text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{opportunity.title}</span>
                              <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => openEditOpportunityDialog(opportunity)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteOpportunity(opportunity)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-600">
                            {opportunity.estimated_value != null && (
                              <span className="font-medium">{formatPrice(opportunity.estimated_value, opportunity.currency)}</span>
                            )}
                            {opportunity.probability != null && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <Percent className="h-3.5 w-3.5" />{opportunity.probability}{t("customers.probabilitySuffix")}
                              </span>
                            )}
                            {opportunity.expected_close_date && (
                              <span className="text-slate-500">{t("customers.estimatedCloseDatePrefix")}{formatDate(opportunity.expected_close_date, locale)}</span>
                            )}
                          </div>
                          {opportunity.stage === "lost" && (opportunity.lost_reason || opportunity.competitor) && (
                            <p className="text-sm text-red-600 mt-1">
                              {opportunity.lost_reason && <>{t("customers.lostReasonPrefix")}{opportunity.lost_reason}</>}
                              {opportunity.competitor && <>{t("customers.competitorPrefix")}{opportunity.competitor}</>}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            {ownerNameForOpp ? <>{t("customers.responsiblePrefix")}{ownerNameForOpp}</> : t("customers.noOwnerAssigned")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{t("customers.documentsTab.heading")}</h3>
                  <p className="text-sm text-slate-500">{t("customers.documentsTab.description")}</p>
                </div>
                <Button variant="primary" onClick={openUploadDialog}>
                  <Upload className="mr-2 h-4 w-4" /> {t("customers.documentDialog.title")}
                </Button>
              </div>

              {documents.length === 0 ? (
                <div className="p-8 bg-slate-50/30">
                  <EmptyState
                    icon={Paperclip}
                    title={t("customers.documentsTab.emptyTitle")}
                    description={t("customers.documentsTab.emptyDescription")}
                    action={
                      <Button variant="primary" onClick={openUploadDialog}>
                        <Upload className="mr-2 h-4 w-4" /> {t("customers.documentDialog.title")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customers.documentsTab.fileName")}</TableHead>
                      <TableHead>{t("customers.documentsTab.fileSize")}</TableHead>
                      <TableHead>{t("customers.documentsTab.uploadedBy")}</TableHead>
                      <TableHead>{t("customers.documentsTab.date")}</TableHead>
                      <TableHead className="text-right">{t("customers.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const uploaderName = salesReps.find((p) => p.id === doc.uploaded_by)?.full_name;
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                              {doc.file_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">{formatFileSize(doc.file_size)}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{uploaderName || "—"}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{formatDate(doc.created_at, locale)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc)} title={t("customers.documentsTab.downloadTooltip")}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc)} title={t("customers.documentsTab.deleteTooltip")}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="quotes">
            <Card className="overflow-hidden">
              {quotes.length === 0 ? (
                <div className="p-8 bg-slate-50/30">
                  <EmptyState
                    icon={FileText}
                    title={t("customers.quotesTab.emptyTitle")}
                    description={t("customers.quotesTab.emptyDescription")}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customers.quotesTab.product")}</TableHead>
                      <TableHead>{t("customers.quotesTab.amount")}</TableHead>
                      <TableHead>{t("customers.fields.status")}</TableHead>
                      <TableHead className="text-right">{t("customers.documentsTab.date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => {
                      const qStat = QUOTE_STATUS_MAP[quote.status] || { label: quote.status, variant: "secondary" as const };
                      return (
                        <TableRow
                          key={quote.id}
                          onClick={() => router.push(`/sales/quotes/${quote.id}`)}
                          className="cursor-pointer"
                        >
                          <TableCell className="font-medium text-slate-800">
                            {getProductName(quote.products)}
                          </TableCell>
                          <TableCell className="font-mono">{formatPrice(quote.final_price, quote.currency)}</TableCell>
                          <TableCell><Badge variant={qStat.variant}>{qStat.label}</Badge></TableCell>
                          <TableCell className="text-right text-slate-500 text-sm">{formatDate(quote.created_at, locale)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? t("customers.contactDialog.editTitle") : t("customers.contactsTab.addContact")}</DialogTitle>
            <DialogDescription>
              {customer.company_name}{t("customers.contactDialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>{t("customers.contactDialog.fullNameLabel")} <span className="text-red-500">*</span></Label>
              <Input value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} placeholder={t("customers.form.contactNamePlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("customers.contactsTab.title")}</Label>
                <Input value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} placeholder={t("customers.contactDialog.titlePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("customers.form.phone")}</Label>
                <Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("customers.fields.email")}</Label>
              <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.fields.notes")}</Label>
              <Input value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={contactForm.is_primary}
                onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                className="rounded border-slate-300"
              />
              {t("customers.contactDialog.isPrimaryLabel")}
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsContactDialogOpen(false)} disabled={isContactSaving}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleSaveContact} disabled={isContactSaving || !contactForm.full_name.trim()}>
              {isContactSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("customers.saving")}</> : t("customers.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivity ? t("customers.activityDialog.editTitle") : t("customers.activitiesTab.addActivity")}</DialogTitle>
            <DialogDescription>
              {customer.company_name}{t("customers.activityDialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("customers.activityDialog.typeLabel")}</Label>
                <SelectNative
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as ActivityType })}
                >
                  {Object.entries(ACTIVITY_TYPE_MAP).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label>{t("customers.activityDialog.dateTimeLabel")}</Label>
                <Input
                  type="datetime-local"
                  value={activityForm.activity_date}
                  onChange={(e) => setActivityForm({ ...activityForm, activity_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("customers.activityDialog.subjectLabel")} <span className="text-red-500">*</span></Label>
              <Input
                value={activityForm.subject}
                onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                placeholder={t("customers.activityDialog.subjectPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.fields.notes")}</Label>
              <textarea
                value={activityForm.notes}
                onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                rows={4}
                className={cn(
                  "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
                  "placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500"
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsActivityDialogOpen(false)} disabled={isActivitySaving}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleSaveActivity} disabled={isActivitySaving || !activityForm.subject.trim()}>
              {isActivitySaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("customers.saving")}</> : t("customers.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? t("customers.taskDialog.editTitle") : t("customers.tasksTab.addTask")}</DialogTitle>
            <DialogDescription>
              {customer.company_name}{t("customers.taskDialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>{t("customers.taskDialog.titleLabel")} <span className="text-red-500">*</span></Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder={t("customers.taskDialog.titlePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("customers.taskDialog.dueDateLabel")}</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("customers.taskDialog.assignedToLabel")}</Label>
                <SelectNative
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                >
                  <option value="">{t("customers.unassigned")}</option>
                  {salesReps.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name || p.id}</option>
                  ))}
                </SelectNative>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("customers.fields.description")}</Label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={4}
                className={cn(
                  "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
                  "placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500"
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTaskDialogOpen(false)} disabled={isTaskSaving}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleSaveTask} disabled={isTaskSaving || !taskForm.title.trim()}>
              {isTaskSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("customers.saving")}</> : t("customers.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpportunityDialogOpen} onOpenChange={setIsOpportunityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOpportunity ? t("customers.opportunityDialog.editTitle") : t("customers.opportunitiesTab.addOpportunity")}</DialogTitle>
            <DialogDescription>
              {customer.company_name}{t("customers.opportunityDialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>{t("customers.opportunityDialog.titleLabel")}</Label>
              <Input
                value={opportunityForm.title}
                onChange={(e) => setOpportunityForm({ ...opportunityForm, title: e.target.value })}
                placeholder={t("customers.opportunityDialog.titlePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("customers.opportunityDialog.stageLabel")}</Label>
                <SelectNative
                  value={opportunityForm.stage}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, stage: e.target.value as OpportunityStage })}
                >
                  {Object.entries(OPPORTUNITY_STAGE_MAP).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label>{t("customers.fields.owner")}</Label>
                <SelectNative
                  value={opportunityForm.owner_id}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, owner_id: e.target.value })}
                >
                  <option value="">{t("customers.unassigned")}</option>
                  {salesReps.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name || p.id}</option>
                  ))}
                </SelectNative>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("customers.opportunityDialog.estimatedValueLabel")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={opportunityForm.estimated_value}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, estimated_value: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("customers.opportunityDialog.currencyLabel")}</Label>
                <SelectNative
                  value={opportunityForm.currency}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, currency: e.target.value })}
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label>{t("customers.opportunityDialog.probabilityLabel")}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={opportunityForm.probability}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, probability: e.target.value })}
                  placeholder="50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("customers.opportunityDialog.expectedCloseDateLabel")}</Label>
              <Input
                type="date"
                value={opportunityForm.expected_close_date}
                onChange={(e) => setOpportunityForm({ ...opportunityForm, expected_close_date: e.target.value })}
              />
            </div>
            {opportunityForm.stage === "lost" && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="space-y-2">
                  <Label>{t("customers.opportunityDialog.lostReasonLabel")}</Label>
                  <Input
                    value={opportunityForm.lost_reason}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, lost_reason: e.target.value })}
                    placeholder={t("customers.opportunityDialog.lostReasonPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("customers.opportunityDialog.competitorLabel")}</Label>
                  <Input
                    value={opportunityForm.competitor}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, competitor: e.target.value })}
                    placeholder={t("customers.opportunityDialog.competitorPlaceholder")}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpportunityDialogOpen(false)} disabled={isOpportunitySaving}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleSaveOpportunity} disabled={isOpportunitySaving || !opportunityForm.title.trim()}>
              {isOpportunitySaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("customers.saving")}</> : t("customers.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customers.documentDialog.title")}</DialogTitle>
            <DialogDescription>
              {customer.company_name}{t("customers.documentDialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>{t("customers.documentDialog.fileLabel")} <span className="text-red-500">*</span></Label>
              <input
                type="file"
                onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
              />
              {pendingFile && (
                <p className="text-xs text-slate-500">{pendingFile.name} · {formatFileSize(pendingFile.size)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDocumentDialogOpen(false)} disabled={isDocumentUploading}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleUploadDocument} disabled={isDocumentUploading || !pendingFile}>
              {isDocumentUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("customers.documentDialog.uploading")}</> : t("customers.documentDialog.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoField({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-slate-800">{value || "—"}</div>
    </div>
  );
}
