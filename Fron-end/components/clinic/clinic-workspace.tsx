"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Activity, AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardList,
  Clock3, FileHeart, FilePlus2, Heart, Package, Plus, RefreshCw, Search, ShieldCheck,
  UserRound, Users, X,
} from "lucide-react";

type Area = "patients" | "appointments" | "medical-records" | "prescriptions" | "alerts" | "products" | "audit";
type AuditLog = { id: number; userId: number | null; userName: string | null; action: string; entity: string; entityId: string; oldValues: unknown; newValues: unknown; createdAt: string };
type AuditLogPage = { items: AuditLog[]; page: number; limit: number; total: number };
type Patient = {
  id: number; documentType: string; documentNumber: string; firstName: string; lastName: string;
  birthDate: string; gender: string | null; phone: string | null; email: string | null; address: string | null;
  bloodType: string | null; allergies: string | null; isChronic: boolean; isPriority: boolean;
  isDeceased: boolean; deceasedAt: string | null; notes: string | null;
};
type Appointment = {
  id: number; patient: { id: number; firstName: string; lastName: string; isPriority: boolean };
  doctor: { id: number; fullName: string }; scheduledAt: string; durationMinutes: number; status: string; reason: string | null;
};
type MedicalRecord = {
  id: number; patientId: number; doctor: { fullName: string }; appointmentId: number | null;
  consultationDate: string; reason: string; diagnosis: string | null; treatment: string | null; notes: string | null;
};
type Product = {
  id: number; sku: string; name: string; type: string; stock: number; minStock: number;
  requiresPrescription: boolean; unit: string | null; isActive: boolean; description: string | null;
  category: string | null; laboratory: string | null; expirationDate: string | null; price: string | null;
};
type Prescription = {
  id: number; code: string | null; patientId: number; doctor: { id: number; fullName: string }; medicalRecordId: number;
  issuedAt: string; status: string; notes: string | null;
  items: Array<{ id: number; product: { id: number; sku: string; name: string }; dosage: string; frequency: string; duration: string | null; quantity: number; instructions: string | null }>;
};
type AlertItem = {
  id: number; patientId: number; type: string; severity: string; title: string; message: string;
  isRead: boolean; createdAt: string;
};
type ChronicCondition = {
  id: number; patientId: number; name: string; diagnosedAt: string | null; severity: string | null;
  notes: string | null; createdAt: string;
};
type User = { id: number; fullName: string; email: string; role: { code: string; name: string } };
type Row = Record<string, unknown>;
type PatientFile = { appointments: Appointment[]; records: MedicalRecord[]; prescriptions: Prescription[]; alerts: AlertItem[]; conditions: ChronicCondition[] };
type MedicineLine = { productId: string; dosage: string; frequency: string; duration: string; quantity: string; instructions: string };

const areas: Array<{ id: Area; title: string; description: string }> = [
  { id: "patients", title: "Pacientes", description: "Búsqueda y expedientes clínicos completos." },
  { id: "appointments", title: "Agenda", description: "Citas y seguimiento de atención." },
  { id: "medical-records", title: "Historial médico", description: "Consultas, diagnósticos y tratamientos." },
  { id: "prescriptions", title: "Recetas", description: "Tratamientos emitidos por el médico." },
  { id: "alerts", title: "Alertas", description: "Pacientes crónicos que requieren seguimiento." },
  { id: "products", title: "Farmacia", description: "Medicamentos, muestras y existencias." },
  { id: "audit", title: "Auditoría", description: "Registro de acciones del sistema." },
];

const emptyPatientFile: PatientFile = { appointments: [], records: [], prescriptions: [], alerts: [], conditions: [] };
const emptyLine = (): MedicineLine => ({ productId: "", dosage: "", frequency: "", duration: "", quantity: "1", instructions: "" });
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-md border border-default-300 bg-background px-3 py-2 text-sm font-medium text-default-700 transition hover:bg-default-100 disabled:opacity-50";
const inputClass = "w-full rounded-md border border-default-300 bg-background px-3 py-2 text-sm text-default-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return "Ocurrió un error al comunicarse con el servicio clínico.";
}

function messageFrom(value: unknown, fallback: string): string {
  if (typeof value !== "object" || value === null) return fallback;
  const message = (value as { message?: unknown }).message;
  return Array.isArray(message) ? message.join(". ") : typeof message === "string" ? message : fallback;
}

function dateTime(value: string | null | undefined): string {
  if (!value) return "No registrado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function localDateTimeValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function daysUntil(value: string): number {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function appointmentStatusLabel(status: string): string {
  return ({ scheduled: "Agendada", completed: "Completada", cancelled: "Cancelada" } as Record<string, string>)[status] ?? status;
}

function prescriptionStatusLabel(status: string): string {
  return ({ issued: "Emitida", dispensed: "Despachada", cancelled: "Cancelada" } as Record<string, string>)[status] ?? status;
}

function dateOnly(value: string | null | undefined): string {
  if (!value) return "No registrado";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-GT", { dateStyle: "long" }).format(date);
}

function ageOf(birthDate: string): number | null {
  const birth = new Date(`${birthDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
  return years >= 0 ? years : null;
}

function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-default-100 text-default-700",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-default-900">{title}</h2>{subtitle && <p className="mt-1 text-sm text-default-500">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

function FieldLabel({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium text-default-700 ${className}`}><span>{label}</span>{children}</label>;
}

export default function ClinicWorkspace() {
  const { data: session } = useSession();
  const [area, setArea] = useState<Area>("patients");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditPage, setAuditPage] = useState<AuditLogPage>({ items: [], page: 1, limit: 25, total: 0 });
  const [auditPageNumber, setAuditPageNumber] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [patientFile, setPatientFile] = useState<PatientFile>(emptyPatientFile);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [fileTab, setFileTab] = useState<"summary" | "appointments" | "records" | "prescriptions" | "alerts">("summary");
  const [showForm, setShowForm] = useState<"patient" | "editPatient" | "appointment" | "record" | "prescription" | "product" | "editProduct" | "condition" | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [medicineLines, setMedicineLines] = useState<MedicineLine[]>([emptyLine()]);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const isDoctor = session?.user.role === "doctor";
  const canDispense = session?.user.role === "pharmacist";

  const request = useCallback(async <T,>(path: string, method = "GET", payload?: Row): Promise<T> => {
    const response = await fetch(`/api/clinic/${path}`, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(messageFrom(result, `La operación falló (${response.status}).`));
    return result as T;
  }, []);

  const refreshArea = useCallback(async (currentArea: Area = area) => {
    setLoading(true);
    setError("");
    try {
      if (currentArea === "patients") {
        const result = await request<Patient[]>("patients");
        setPatients(result);
      } else if (currentArea === "appointments") {
        setAppointments(await request<Appointment[]>("appointments"));
      } else if (currentArea === "medical-records") {
        setRecords(await request<MedicalRecord[]>("medical-records"));
      } else if (currentArea === "prescriptions") {
        setPrescriptions(await request<Prescription[]>("prescriptions"));
      } else if (currentArea === "alerts") {
        setAlerts(await request<AlertItem[]>("alerts"));
      } else if (currentArea === "audit") {
        setAuditPage(await request<AuditLogPage>(`audit-logs?page=${auditPageNumber}&limit=25`));
      } else {
        setProducts(await request<Product[]>("products"));
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [area, auditPageNumber, request]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      request<Patient[]>("patients"),
      request<Appointment[]>("appointments"),
      request<AlertItem[]>("alerts"),
      request<Product[]>("products"),
    ]);
    const errors: string[] = [];
    if (results[0].status === "fulfilled") setPatients(results[0].value);
    else errors.push(`Pacientes: ${errorMessage(results[0].reason)}`);
    if (results[1].status === "fulfilled") setAppointments(results[1].value);
    else errors.push(`Citas: ${errorMessage(results[1].reason)}`);
    if (results[2].status === "fulfilled") setAlerts(results[2].value);
    else errors.push(`Alertas: ${errorMessage(results[2].reason)}`);
    if (results[3].status === "fulfilled") setProducts(results[3].value);
    else errors.push(`Farmacia: ${errorMessage(results[3].reason)}`);
    if (errors.length) setError(`No se pudo cargar parte del tablero. ${errors.join(" ")}`);
    setLoading(false);
  }, [request]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { void refreshArea(); }, [refreshArea]);

  const loadPatientFile = useCallback(async (patient: Patient) => {
    setSelectedPatient(patient);
    setFileTab("summary");
    setShowForm(null);
    setPatientFile(emptyPatientFile);
    setFileLoading(true);
    setError("");
    try {
      const [patientData, patientAppointments, patientRecords, patientPrescriptions, patientAlerts, conditions] = await Promise.all([
        request<Patient>(`patients/${patient.id}`),
        request<Appointment[]>(`appointments?patientId=${patient.id}`),
        request<MedicalRecord[]>(`medical-records?patientId=${patient.id}`),
        request<Prescription[]>(`prescriptions?patientId=${patient.id}`),
        request<AlertItem[]>(`alerts?patientId=${patient.id}`),
        request<ChronicCondition[]>(`patients/${patient.id}/conditions`),
      ]);
      setSelectedPatient(patientData);
      setPatientFile({ appointments: patientAppointments, records: patientRecords, prescriptions: patientPrescriptions, alerts: patientAlerts, conditions });
    } catch (cause) {
      setError(`No se pudo cargar el expediente completo: ${errorMessage(cause)}`);
    } finally {
      setFileLoading(false);
    }
  }, [request]);

  const loadLookups = useCallback(async () => {
    try {
      const [userList, productList] = await Promise.all([
        request<User[]>("users"),
        request<Product[]>("products"),
      ]);
      setUsers(userList.filter((user) => user.role.code === "doctor"));
      setProducts(productList.filter((product) => product.isActive));
    } catch (cause) {
      setError(`No se pudieron cargar las opciones del formulario: ${errorMessage(cause)}`);
    }
  }, [request]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return patients;
    return patients.filter((patient) => [
      patient.firstName, patient.lastName, patient.documentNumber, patient.phone ?? "", patient.email ?? "",
    ].some((value) => value.toLocaleLowerCase("es").includes(query)));
  }, [patients, search]);

  const stats = useMemo(() => ({
    patientCount: patients.length,
    priorityCount: patients.filter((patient) => patient.isPriority && !patient.isDeceased).length,
    chronicCount: patients.filter((patient) => patient.isChronic && !patient.isDeceased).length,
    unreadAlerts: alerts.filter((alert) => !alert.isRead).length,
    todayAppointments: appointments.filter((item) => new Date(item.scheduledAt).toDateString() === new Date().toDateString()).length,
    lowStock: products.filter((item) => item.stock <= item.minStock).length,
  }), [patients, alerts, appointments, products]);

  async function submitJson(event: FormEvent<HTMLFormElement>, path: string, afterSave?: () => Promise<void>, prepare?: (form: FormData) => Row, method = "POST") {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData(formElement);
      const payload = prepare ? prepare(form) : Object.fromEntries(form.entries()) as Row;
      await request(path, method, payload);
      formElement.reset();
      setShowForm(null);
      setNotice("Cambios guardados correctamente.");
      await (afterSave ?? (() => refreshArea()))();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function refreshFile() {
    if (selectedPatient) await loadPatientFile(selectedPatient);
  }

  async function togglePatient(key: "isPriority" | "isChronic" | "isDeceased") {
    if (!selectedPatient) return;
    const isDeceased = key === "isDeceased";
    if (isDeceased && !selectedPatient.isDeceased && !window.confirm("¿Confirmas registrar al paciente como fallecido? No se permitirán nuevas citas ni cambios al historial.")) return;
    setSaving(true);
    setError("");
    try {
      const updated = await request<Patient>(
        isDeceased ? `patients/${selectedPatient.id}/deceased` : `patients/${selectedPatient.id}`,
        "PATCH",
        { [key]: !selectedPatient[key] },
      );
      setSelectedPatient(updated);
      await refreshArea("patients");
      await loadPatientFile(updated);
      setNotice("Información del paciente actualizada.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function markAlertRead(alertId: number) {
    try {
      await request(`alerts/${alertId}/read`, "PATCH", {});
      await refreshArea("alerts");
      if (selectedPatient) await loadPatientFile(selectedPatient);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function submitAppointment(event: FormEvent<HTMLFormElement>, patientId?: number) {
    const selected = selectedPatient;
    const afterSave = async () => {
      await refreshArea("appointments");
      if (selected) await loadPatientFile(selected);
      await loadOverview();
    };
    await submitJson(event, "appointments", afterSave, (form) => ({
      patientId: patientId ?? Number(form.get("patientId")),
      doctorId: Number(form.get("doctorId")),
      scheduledAt: new Date(String(form.get("scheduledAt"))).toISOString(),
      durationMinutes: Number(form.get("durationMinutes")),
      statusCode: "scheduled",
      reason: String(form.get("reason") ?? "").trim(),
    }));
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>, patientId?: number) {
    const selected = selectedPatient;
    const afterSave = async () => {
      await refreshArea("medical-records");
      if (selected) await loadPatientFile(selected);
      await loadOverview();
    };
    await submitJson(event, "medical-records", afterSave, (form) => {
      const appointmentId = String(form.get("appointmentId") ?? "");
      return {
        patientId: patientId ?? Number(form.get("patientId")),
        ...(appointmentId ? { appointmentId: Number(appointmentId) } : {}),
        consultationDate: new Date(String(form.get("consultationDate"))).toISOString(),
        reason: String(form.get("reason")).trim(),
        diagnosis: String(form.get("diagnosis") ?? "").trim(),
        treatment: String(form.get("treatment") ?? "").trim(),
        notes: String(form.get("notes") ?? "").trim(),
      };
    });
  }

  async function submitPrescription(event: FormEvent<HTMLFormElement>) {
    if (!selectedPatient) return;
    const selected = selectedPatient;
    await submitJson(event, "prescriptions", async () => {
      await refreshArea("prescriptions");
      await loadPatientFile(selected);
      await loadOverview();
    }, (form) => ({
      patientId: selected.id,
      medicalRecordId: Number(form.get("medicalRecordId")),
      notes: String(form.get("prescriptionNotes") ?? "").trim(),
      items: medicineLines.map((line) => ({
        productId: Number(line.productId), dosage: line.dosage.trim(), frequency: line.frequency.trim(),
        ...(line.duration.trim() ? { duration: line.duration.trim() } : {}),
        quantity: Number(line.quantity),
        ...(line.instructions.trim() ? { instructions: line.instructions.trim() } : {}),
      })),
    }));
  }

  async function updatePrescriptionStatus(prescription: Prescription, statusCode: string) {
    setSaving(true);
    setError("");
    try {
      await request(`prescriptions/${prescription.id}/status`, "PATCH", { statusCode });
      setNotice(statusCode === "dispensed"
        ? "Receta despachada y existencias descontadas correctamente."
        : "Receta cancelada.");
      await refreshArea("prescriptions");
      if (selectedPatient) await loadPatientFile(selectedPatient);
      await loadOverview();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function updateAppointmentStatus(appointment: Appointment, statusCode: string) {
    try {
      await request(`appointments/${appointment.id}`, "PATCH", { statusCode });
      setNotice("Estado de la cita actualizado.");
      if (selectedPatient) await loadPatientFile(selectedPatient);
      if (area === "appointments") await refreshArea("appointments");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!movementProduct) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await request(`products/${movementProduct.id}/movements`, "POST", {
        movementCode: String(form.get("movementCode")),
        quantity: Number(form.get("quantity")),
        reason: String(form.get("reason") ?? "").trim(),
      });
      setMovementProduct(null);
      setNotice("Movimiento de inventario registrado.");
      await refreshArea("products");
      await loadOverview();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProduct(product: Product) {
    if (!window.confirm(`¿Desactivar "${product.name}"? Ya no estará disponible para nuevas recetas ni movimientos.`)) return;
    setSaving(true);
    setError("");
    try {
      await request(`products/${product.id}`, "DELETE");
      setNotice("Producto desactivado; se conservó su historial de inventario.");
      await refreshArea("products");
      await loadOverview();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  function showFormAndLookups(form: "appointment" | "record" | "prescription") {
    setError("");
    setShowForm(form);
    setMedicineLines([emptyLine()]);
    void loadLookups();
  }

  const tabs: Array<{ id: typeof fileTab; label: string; count: number }> = selectedPatient ? [
    { id: "summary", label: "Resumen", count: 0 },
    { id: "appointments", label: "Citas", count: patientFile.appointments.length },
    { id: "records", label: "Historial", count: patientFile.records.length },
    { id: "prescriptions", label: "Recetas", count: patientFile.prescriptions.length },
    { id: "alerts", label: "Alertas", count: patientFile.alerts.length },
  ] : [];

  const upcomingAppointments = useMemo(() => appointments
    .filter((appointment) => new Date(appointment.scheduledAt).getTime() >= Date.now() && !["cancelled", "completed"].includes(appointment.status))
    .slice(0, 5), [appointments]);

  function renderPatientForm(patientId?: number) {
    const editing = patientId !== undefined && selectedPatient?.id === patientId;
    const patient = editing ? selectedPatient : null;
    const optional = (form: FormData, name: string) => String(form.get(name) ?? "").trim() || (editing ? null : undefined);
    return (
      <form onSubmit={(event) => void submitJson(event, editing ? `patients/${patientId}` : "patients", async () => {
        await refreshArea("patients");
        if (editing) await refreshFile();
        await loadOverview();
      }, (form) => editing ? ({
        firstName: String(form.get("firstName")).trim(), lastName: String(form.get("lastName")).trim(),
        birthDate: String(form.get("birthDate")), genderCode: optional(form, "genderCode"),
        phone: optional(form, "phone"), email: optional(form, "email"), address: optional(form, "address"),
        bloodTypeCode: optional(form, "bloodTypeCode"), allergies: optional(form, "allergies"), notes: optional(form, "notes"),
      }) : ({
        documentTypeCode: String(form.get("documentTypeCode")), documentNumber: String(form.get("documentNumber")).trim(),
        firstName: String(form.get("firstName")).trim(), lastName: String(form.get("lastName")).trim(),
        birthDate: String(form.get("birthDate")), genderCode: optional(form, "genderCode"), phone: optional(form, "phone"),
        email: optional(form, "email"), address: optional(form, "address"), bloodTypeCode: optional(form, "bloodTypeCode"),
        allergies: optional(form, "allergies"), isChronic: form.get("isChronic") === "on",
        isPriority: form.get("isPriority") === "on", notes: optional(form, "notes"),
      }), editing ? "PATCH" : "POST")} className="grid gap-4 sm:grid-cols-2">
        {!editing && <>
          <FieldLabel label="Tipo de documento"><select name="documentTypeCode" required className={inputClass}><option value="national_id">DPI / documento nacional</option><option value="passport">Pasaporte</option></select></FieldLabel>
          <FieldLabel label="Número de documento"><input name="documentNumber" required maxLength={30} className={inputClass} placeholder="CUI de 13 dígitos o pasaporte" /></FieldLabel>
        </>}
        <FieldLabel label="Nombres"><input name="firstName" required maxLength={100} defaultValue={patient?.firstName} className={inputClass} /></FieldLabel>
        <FieldLabel label="Apellidos"><input name="lastName" required maxLength={100} defaultValue={patient?.lastName} className={inputClass} /></FieldLabel>
        <FieldLabel label="Fecha de nacimiento"><input name="birthDate" type="date" required defaultValue={patient?.birthDate?.slice(0, 10)} className={inputClass} /></FieldLabel>
        <FieldLabel label="Género"><select name="genderCode" defaultValue={patient?.gender ?? ""} className={inputClass}><option value="">Sin especificar</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option></select></FieldLabel>
        <FieldLabel label="Teléfono"><input name="phone" type="tel" maxLength={30} defaultValue={patient?.phone ?? ""} className={inputClass} /></FieldLabel>
        <FieldLabel label="Correo electrónico"><input name="email" type="email" maxLength={150} defaultValue={patient?.email ?? ""} className={inputClass} /></FieldLabel>
        <FieldLabel label="Dirección"><input name="address" maxLength={255} defaultValue={patient?.address ?? ""} className={inputClass} /></FieldLabel>
        <FieldLabel label="Tipo de sangre"><select name="bloodTypeCode" defaultValue={patient?.bloodType ?? ""} className={inputClass}><option value="">Sin registrar</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => <option key={type} value={type}>{type}</option>)}</select></FieldLabel>
        <FieldLabel label="Alergias" className="sm:col-span-2"><textarea name="allergies" rows={2} defaultValue={patient?.allergies ?? ""} className={inputClass} placeholder="Escribe alergias conocidas o deja vacío" /></FieldLabel>
        <FieldLabel label="Notas importantes" className="sm:col-span-2"><textarea name="notes" rows={2} defaultValue={patient?.notes ?? ""} className={inputClass} /></FieldLabel>
        {!editing && <div className="flex flex-wrap gap-5 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><input name="isChronic" type="checkbox" className="h-4 w-4 accent-primary" />Paciente crónico</label>
          <label className="flex items-center gap-2 text-sm"><input name="isPriority" type="checkbox" className="h-4 w-4 accent-primary" />Paciente prioritario</label>
        </div>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className={secondaryButtonClass} onClick={() => setShowForm(null)}>Cancelar</button>
          <button disabled={saving} className={buttonClass}><Plus size={16} />{saving ? "Guardando..." : editing ? "Guardar cambios" : "Guardar paciente"}</button>
        </div>
      </form>
    );
  }

  function renderAppointmentForm(patientId?: number) {
    return (
      <form onSubmit={(event) => void submitAppointment(event, patientId)} className="grid gap-4 sm:grid-cols-2">
        {!patientId && <FieldLabel label="Paciente"><select name="patientId" required className={inputClass}><option value="">Selecciona un paciente</option>{patients.filter((item) => !item.isDeceased).map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName} · {item.documentNumber}</option>)}</select></FieldLabel>}
        <FieldLabel label="Doctor"><select name="doctorId" required className={inputClass}><option value="">Selecciona un doctor</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select></FieldLabel>
        <FieldLabel label="Fecha y hora"><input name="scheduledAt" type="datetime-local" required min={localDateTimeValue()} className={inputClass} /></FieldLabel>
        <FieldLabel label="Duración"><select name="durationMinutes" className={inputClass}><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1 hora 30 minutos</option></select></FieldLabel>
        <FieldLabel label="Motivo" className="sm:col-span-2"><input name="reason" maxLength={255} className={inputClass} placeholder="Motivo de la consulta" /></FieldLabel>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={secondaryButtonClass} onClick={() => setShowForm(null)}>Cancelar</button><button disabled={saving || !users.length} className={buttonClass}><CalendarDays size={16} />Agendar cita</button></div>
      </form>
    );
  }

  function renderRecordForm(patientId?: number) {
    const availableAppointments = patientId ? patientFile.appointments.filter((appointment) => appointment.status !== "cancelled") : appointments.filter((appointment) => appointment.status !== "cancelled");
    return (
      <form onSubmit={(event) => void submitRecord(event, patientId)} className="grid gap-4 sm:grid-cols-2">
        {!patientId && <FieldLabel label="Paciente"><select name="patientId" required className={inputClass}><option value="">Selecciona un paciente</option>{patients.filter((item) => !item.isDeceased).map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName} · {item.documentNumber}</option>)}</select></FieldLabel>}
        <FieldLabel label="Cita vinculada (opcional)"><select name="appointmentId" className={inputClass}><option value="">Sin cita vinculada</option>{availableAppointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{dateTime(appointment.scheduledAt)} · {appointment.reason || "Consulta"}</option>)}</select></FieldLabel>
        <FieldLabel label="Fecha y hora de consulta"><input name="consultationDate" type="datetime-local" required defaultValue={localDateTimeValue()} className={inputClass} /></FieldLabel>
        <FieldLabel label="Motivo de consulta"><input name="reason" required maxLength={255} className={inputClass} /></FieldLabel>
        <FieldLabel label="Diagnóstico"><textarea name="diagnosis" rows={2} className={inputClass} /></FieldLabel>
        <FieldLabel label="Tratamiento"><textarea name="treatment" rows={2} className={inputClass} /></FieldLabel>
        <FieldLabel label="Notas clínicas" className="sm:col-span-2"><textarea name="notes" rows={2} className={inputClass} /></FieldLabel>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={secondaryButtonClass} onClick={() => setShowForm(null)}>Cancelar</button><button disabled={saving} className={buttonClass}><FilePlus2 size={16} />Guardar consulta</button></div>
      </form>
    );
  }

  function renderPrescriptionForm() {
    return (
      <form onSubmit={(event) => void submitPrescription(event)} className="space-y-4">
        <FieldLabel label="Consulta que origina la receta">
          <select name="medicalRecordId" required className={inputClass}>
            <option value="">Selecciona un registro del historial</option>
            {patientFile.records.map((record) => <option key={record.id} value={record.id}>{dateTime(record.consultationDate)} · {record.reason}</option>)}
          </select>
        </FieldLabel>
        {medicineLines.map((line, index) => (
          <div key={index} className="grid gap-3 rounded-md border border-default-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between sm:col-span-2 lg:col-span-3"><h4 className="text-sm font-semibold">Medicamento {index + 1}</h4>{medicineLines.length > 1 && <button type="button" onClick={() => setMedicineLines((items) => items.filter((_, row) => row !== index))} className="text-sm text-destructive">Quitar</button>}</div>
            <FieldLabel label="Producto"><select required value={line.productId} className={inputClass} onChange={(event) => setMedicineLines((items) => items.map((item, row) => row === index ? { ...item, productId: event.target.value } : item))}><option value="">Selecciona un producto</option>{products.filter((product) => product.type !== "sample").map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></FieldLabel>
            <FieldLabel label="Dosis"><input required maxLength={100} value={line.dosage} className={inputClass} onChange={(event) => setMedicineLines((items) => items.map((item, row) => row === index ? { ...item, dosage: event.target.value } : item))} placeholder="Ej. 1 tableta" /></FieldLabel>
            <FieldLabel label="Frecuencia"><input required maxLength={100} value={line.frequency} className={inputClass} onChange={(event) => setMedicineLines((items) => items.map((item, row) => row === index ? { ...item, frequency: event.target.value } : item))} placeholder="Ej. Cada 8 horas" /></FieldLabel>
            <FieldLabel label="Duración"><input maxLength={50} value={line.duration} className={inputClass} onChange={(event) => setMedicineLines((items) => items.map((item, row) => row === index ? { ...item, duration: event.target.value } : item))} placeholder="Ej. 7 días" /></FieldLabel>
            <FieldLabel label="Cantidad"><input required type="number" min={1} value={line.quantity} className={inputClass} onChange={(event) => setMedicineLines((items) => items.map((item, row) => row === index ? { ...item, quantity: event.target.value } : item))} /></FieldLabel>
            <FieldLabel label="Instrucciones"><input value={line.instructions} className={inputClass} onChange={(event) => setMedicineLines((items) => items.map((item, row) => row === index ? { ...item, instructions: event.target.value } : item))} /></FieldLabel>
          </div>
        ))}
        <button type="button" onClick={() => setMedicineLines((items) => [...items, emptyLine()])} className={secondaryButtonClass}><Plus size={16} />Agregar medicamento</button>
        <FieldLabel label="Notas de la receta"><textarea name="prescriptionNotes" rows={2} className={inputClass} /></FieldLabel>
        <div className="flex justify-end gap-2"><button type="button" className={secondaryButtonClass} onClick={() => setShowForm(null)}>Cancelar</button><button disabled={saving || !patientFile.records.length} className={buttonClass}><ClipboardList size={16} />Emitir receta</button></div>
      </form>
    );
  }

  function renderProductForm(product?: Product) {
    const editing = Boolean(product);
    const optional = (form: FormData, name: string) => String(form.get(name) ?? "").trim() || (editing ? null : undefined);
    return (
      <form onSubmit={(event) => void submitJson(event, editing ? `products/${product?.id}` : "products", async () => {
        await refreshArea("products");
        await loadOverview();
      }, (form) => ({
        ...(editing ? {} : { sku: String(form.get("sku")).trim() }),
        name: String(form.get("name")).trim(),
        typeCode: String(form.get("typeCode")),
        description: optional(form, "description"),
        category: optional(form, "category"),
        laboratory: optional(form, "laboratory"),
        unit: optional(form, "unit"),
        minStock: Number(form.get("minStock") || 0),
        requiresPrescription: form.get("requiresPrescription") === "on",
        expirationDate: optional(form, "expirationDate"),
        price: String(form.get("price") ?? "").trim() ? Number(form.get("price")) : editing ? null : undefined,
      }), editing ? "PATCH" : "POST")} className="grid gap-4 sm:grid-cols-2">
        {!editing && <FieldLabel label="Código SKU"><input name="sku" required maxLength={50} className={inputClass} /></FieldLabel>}
        <FieldLabel label="Nombre del producto"><input name="name" required maxLength={200} defaultValue={product?.name} className={inputClass} /></FieldLabel>
        <FieldLabel label="Tipo"><select name="typeCode" defaultValue={product?.type ?? "medicine"} className={inputClass}><option value="medicine">Medicamento</option><option value="sample">Muestra médica</option><option value="supply">Insumo</option></select></FieldLabel>
        <FieldLabel label="Descripción"><input name="description" defaultValue={product?.description ?? ""} className={inputClass} /></FieldLabel>
        <FieldLabel label="Categoría"><input name="category" maxLength={100} defaultValue={product?.category ?? ""} className={inputClass} /></FieldLabel>
        <FieldLabel label="Laboratorio"><input name="laboratory" maxLength={150} defaultValue={product?.laboratory ?? ""} className={inputClass} /></FieldLabel>
        <FieldLabel label="Unidad"><input name="unit" maxLength={30} defaultValue={product?.unit ?? ""} className={inputClass} placeholder="caja, tableta, frasco..." /></FieldLabel>
        <FieldLabel label="Existencia mínima"><input name="minStock" type="number" min={0} defaultValue={product?.minStock ?? 0} className={inputClass} /></FieldLabel>
        <FieldLabel label="Precio"><input name="price" type="number" min={0} step="0.01" defaultValue={product?.price ?? ""} className={inputClass} /></FieldLabel>
        <FieldLabel label="Fecha de vencimiento"><input name="expirationDate" type="date" defaultValue={product?.expirationDate?.slice(0, 10) ?? ""} className={inputClass} /></FieldLabel>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input name="requiresPrescription" type="checkbox" defaultChecked={product?.requiresPrescription ?? false} className="h-4 w-4 accent-primary" />Requiere receta</label>
        <p className="text-xs text-default-500 sm:col-span-2">{editing ? `Existencias actuales: ${product?.stock}. Para ajustar inventario registra un movimiento.` : "La existencia inicia en cero; regístrala con un movimiento de inventario para conservar trazabilidad."}</p>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={secondaryButtonClass} onClick={() => { setShowForm(null); setProductToEdit(null); }}>Cancelar</button><button disabled={saving} className={buttonClass}><Package size={16} />{saving ? "Guardando..." : editing ? "Guardar cambios" : "Guardar producto"}</button></div>
      </form>
    );
  }

  function renderConditionForm(patient: Patient) {
    return (
      <form onSubmit={(event) => void submitJson(event, `patients/${patient.id}/conditions`, async () => {
        await refreshFile();
        await refreshArea("patients");
        await loadOverview();
      }, (form) => ({
        name: String(form.get("name")).trim(),
        diagnosedAt: String(form.get("diagnosedAt") ?? "") || undefined,
        severityCode: String(form.get("severityCode") ?? "") || undefined,
        notes: String(form.get("notes") ?? "").trim() || undefined,
      }))} className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Diagnóstico"><input name="name" required maxLength={150} className={inputClass} placeholder="Nombre de la condición" /></FieldLabel>
        <FieldLabel label="Fecha del diagnóstico"><input name="diagnosedAt" type="date" className={inputClass} /></FieldLabel>
        <FieldLabel label="Severidad"><select name="severityCode" className={inputClass}><option value="">Sin especificar</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></FieldLabel>
        <FieldLabel label="Notas"><textarea name="notes" rows={2} className={inputClass} /></FieldLabel>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={secondaryButtonClass} onClick={() => setShowForm(null)}>Cancelar</button><button disabled={saving} className={buttonClass}><Heart size={16} />Guardar diagnóstico</button></div>
      </form>
    );
  }

  function renderModal() {
    if (!showForm) return null;
    const titles = { patient: "Registrar paciente", editPatient: "Editar paciente", appointment: "Agendar cita", record: "Nueva consulta", prescription: "Emitir receta", product: "Registrar producto", editProduct: "Editar producto", condition: "Registrar diagnóstico crónico" };
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="clinic-form-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-background p-5 shadow-2xl md:p-7">
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 id="clinic-form-title" className="text-xl font-semibold">{titles[showForm]}</h2>{selectedPatient && <p className="mt-1 text-sm text-default-500">{selectedPatient.firstName} {selectedPatient.lastName} · expediente #{selectedPatient.id}</p>}</div><button type="button" aria-label="Cerrar" onClick={() => { setShowForm(null); setProductToEdit(null); }} className={secondaryButtonClass}><X size={18} /></button></div>
          {(error || notice) && <div className="mb-4"><Feedback error={error} notice={notice} onClose={() => { setError(""); setNotice(""); }} /></div>}
          {showForm === "patient" && renderPatientForm()}
          {showForm === "editPatient" && selectedPatient && renderPatientForm(selectedPatient.id)}
          {showForm === "appointment" && renderAppointmentForm(selectedPatient?.id)}
          {showForm === "record" && renderRecordForm(selectedPatient?.id)}
          {showForm === "prescription" && renderPrescriptionForm()}
          {showForm === "product" && renderProductForm()}
          {showForm === "editProduct" && productToEdit && renderProductForm(productToEdit)}
          {showForm === "condition" && selectedPatient && renderConditionForm(selectedPatient)}
        </section>
      </div>
    );
  }

  function renderPatientList() {
    return (
      <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-md"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400" /><input aria-label="Buscar paciente" value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Buscar por nombre, documento, teléfono..." /></div>
          <button type="button" onClick={() => setShowForm("patient")} className={buttonClass}><Plus size={17} />Nuevo paciente</button>
        </div>
        {loading ? <Loading /> : filteredPatients.length === 0 ? <EmptyState title={search ? "No encontramos coincidencias" : "Todavía no hay pacientes"} message={search ? "Prueba con otro nombre, número de documento o teléfono." : "Registra un paciente para abrir su expediente y empezar el seguimiento clínico."} action={!search && <button onClick={() => setShowForm("patient")} className={buttonClass}><Plus size={16} />Registrar paciente</button>} /> : (
          <div className="overflow-x-auto rounded-lg border border-default-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-default-50 text-default-600"><tr>{["Paciente", "Documento", "Contacto", "Seguimiento", "Estado", ""].map((column) => <th key={column} className="px-4 py-3 font-medium">{column}</th>)}</tr></thead>
              <tbody className="divide-y divide-default-200">
                {filteredPatients.map((patient) => <tr key={patient.id} className="transition hover:bg-default-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{patient.firstName[0]}{patient.lastName[0]}</div><div><button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => void loadPatientFile(patient)}>{patient.firstName} {patient.lastName}</button><p className="text-xs text-default-500">Expediente #{patient.id} · {ageOf(patient.birthDate) ?? "—"} años</p></div></div></td>
                  <td className="px-4 py-3"><p>{patient.documentNumber}</p><p className="text-xs text-default-500">{patient.documentType === "passport" ? "Pasaporte" : "DPI"}</p></td>
                  <td className="px-4 py-3"><p>{patient.phone || "Sin teléfono"}</p><p className="text-xs text-default-500">{patient.email || "Sin correo"}</p></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{patient.isPriority && <StatusBadge tone="amber">Prioritario</StatusBadge>}{patient.isChronic && <StatusBadge tone="blue">Crónico</StatusBadge>}{!patient.isPriority && !patient.isChronic && <span className="text-default-400">—</span>}</div></td>
                  <td className="px-4 py-3">{patient.isDeceased ? <StatusBadge tone="neutral">Fallecido</StatusBadge> : <StatusBadge tone="green">Activo</StatusBadge>}</td>
                  <td className="px-4 py-3"><button type="button" aria-label={`Abrir expediente de ${patient.firstName} ${patient.lastName}`} onClick={() => void loadPatientFile(patient)} className="rounded-md p-2 text-primary hover:bg-primary/10"><ChevronRight size={18} /></button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  function renderPatientSummary(patient: Patient) {
    const nextAppointment = patientFile.appointments.find((appointment) => new Date(appointment.scheduledAt) >= new Date() && !["cancelled", "completed"].includes(appointment.status));
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<CalendarDays size={18} />} label="Próxima cita" value={nextAppointment ? dateTime(nextAppointment.scheduledAt) : "Sin cita agendada"} />
          <MetricCard icon={<FileHeart size={18} />} label="Consultas" value={String(patientFile.records.length)} />
          <MetricCard icon={<ClipboardList size={18} />} label="Recetas emitidas" value={String(patientFile.prescriptions.length)} />
          <MetricCard icon={<AlertTriangle size={18} />} label="Alertas pendientes" value={String(patientFile.alerts.filter((alert) => !alert.isRead).length)} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-default-200 p-4">
            <SectionTitle title="Datos del paciente" />
            <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
              <Detail label="Documento" value={`${patient.documentType === "passport" ? "Pasaporte" : "DPI"} · ${patient.documentNumber}`} />
              <Detail label="Nacimiento" value={`${dateOnly(patient.birthDate)}${ageOf(patient.birthDate) !== null ? ` (${ageOf(patient.birthDate)} años)` : ""}`} />
              <Detail label="Teléfono" value={patient.phone || "Sin registrar"} />
              <Detail label="Correo" value={patient.email || "Sin registrar"} />
              <Detail label="Tipo de sangre" value={patient.bloodType || "Sin registrar"} />
              <Detail label="Dirección" value={patient.address || "Sin registrar"} />
              <Detail label="Alergias" value={patient.allergies || "No registradas"} />
              <Detail label="Notas" value={patient.notes || "Sin notas"} />
            </dl>
          </section>
          <section className="rounded-lg border border-default-200 p-4">
            <SectionTitle title="Estado y acciones" subtitle="La API aplica las reglas de protección clínica." />
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={patient.isDeceased ? "neutral" : "green"}>{patient.isDeceased ? "Fallecido" : "Paciente activo"}</StatusBadge>
              <StatusBadge tone={patient.isPriority ? "amber" : "neutral"}>{patient.isPriority ? "Atención prioritaria" : "Atención regular"}</StatusBadge>
              <StatusBadge tone={patient.isChronic ? "blue" : "neutral"}>{patient.isChronic ? "Seguimiento crónico" : "Sin condición crónica marcada"}</StatusBadge>
            </div>
            {!patient.isDeceased && <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => showFormAndLookups("appointment")} className={buttonClass}><CalendarDays size={16} />Agendar cita</button>
              {isDoctor && <button type="button" onClick={() => showFormAndLookups("record")} className={secondaryButtonClass}><FilePlus2 size={16} />Registrar consulta</button>}
              <button type="button" onClick={() => void togglePatient("isPriority")} disabled={saving} className={secondaryButtonClass}>{patient.isPriority ? "Quitar prioridad" : "Marcar prioritario"}</button>
              {isDoctor && <button type="button" onClick={() => setShowForm("condition")} className={secondaryButtonClass}><Heart size={15} />Agregar diagnóstico crónico</button>}
              <button type="button" onClick={() => setShowForm("editPatient")} className={secondaryButtonClass}>Editar datos</button>
              <button type="button" onClick={() => void togglePatient("isChronic")} disabled={saving || (patient.isChronic && patientFile.conditions.length > 0)} title={patientFile.conditions.length ? "No se puede quitar el seguimiento mientras existan diagnósticos" : ""} className={secondaryButtonClass}>{patient.isChronic ? "Quitar seguimiento crónico" : "Marcar crónico"}</button>
              <button type="button" onClick={() => void togglePatient("isDeceased")} disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"><ShieldCheck size={16} />Registrar fallecimiento</button>
            </div>}
            <div className="mt-5 border-t border-default-200 pt-4">
              <SectionTitle title="Diagnósticos crónicos" subtitle="Los diagnósticos quedan asociados al expediente y activan el seguimiento crónico." action={!patient.isDeceased && isDoctor && <button type="button" onClick={() => setShowForm("condition")} className={secondaryButtonClass}><Plus size={15} />Agregar diagnóstico</button>} />
              {patientFile.conditions.length === 0
                ? <p className="text-sm text-default-500">No hay diagnósticos crónicos registrados.</p>
                : <div className="space-y-3">{patientFile.conditions.map((condition) => <div key={condition.id} className="rounded-md bg-default-50 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{condition.name}</p><div className="flex gap-2">{condition.severity && <StatusBadge tone={condition.severity === "high" ? "red" : condition.severity === "medium" ? "amber" : "blue"}>{condition.severity === "high" ? "Alta" : condition.severity === "medium" ? "Media" : "Baja"}</StatusBadge>}<span className="text-default-500">{condition.diagnosedAt ? dateOnly(condition.diagnosedAt) : "Fecha no registrada"}</span></div></div>{condition.notes && <p className="mt-1 text-default-600">{condition.notes}</p>}</div>)}</div>}
            </div>
            <div className="mt-5 border-t border-default-200 pt-4">
              <SectionTitle title="Actividad reciente" />
              {patientFile.records.length === 0 && patientFile.appointments.length === 0 && patientFile.alerts.length === 0
                ? <p className="text-sm text-default-500">Sin actividad registrada en el expediente.</p>
                : <div className="space-y-3">{[
                  ...patientFile.records.map((record) => ({ id: `r${record.id}`, date: record.consultationDate, label: `Consulta: ${record.reason}`, detail: record.diagnosis || "Sin diagnóstico registrado" })),
                  ...patientFile.appointments.map((appointment) => ({ id: `a${appointment.id}`, date: appointment.scheduledAt, label: `Cita ${appointment.status}`, detail: appointment.reason || "Sin motivo indicado" })),
                  ...patientFile.alerts.map((alert) => ({ id: `l${alert.id}`, date: alert.createdAt, label: alert.title, detail: alert.message })),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((item) => <div key={item.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><p className="font-medium">{item.label}</p><p className="text-default-500">{item.detail}</p><p className="mt-0.5 text-xs text-default-400">{dateTime(item.date)}</p></div></div>)}</div>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderFileTab(patient: Patient) {
    if (fileLoading) return <Loading />;
    if (fileTab === "summary") return renderPatientSummary(patient);
    if (fileTab === "appointments") return <AppointmentList appointments={patientFile.appointments} onStatus={updateAppointmentStatus} />;
    if (fileTab === "records") return <RecordList records={patientFile.records} />;
    if (fileTab === "prescriptions") return <PrescriptionList prescriptions={patientFile.prescriptions} actorId={Number(session?.user.id)} canDispense={Boolean(canDispense)} canManage={isDoctor} onStatus={updatePrescriptionStatus} saving={saving} />;
    return <AlertList alerts={patientFile.alerts} onRead={markAlertRead} />;
  }

  function renderPatientFile(patient: Patient) {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setSelectedPatient(null); setShowForm(null); setError(""); }} className={secondaryButtonClass}><ArrowLeft size={16} />Volver a pacientes</button>
        <section className="overflow-hidden rounded-xl border border-default-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary">{patient.firstName[0]}{patient.lastName[0]}</div>
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold">{patient.firstName} {patient.lastName}</h2>{patient.isPriority && <StatusBadge tone="amber">Prioritario</StatusBadge>}{patient.isChronic && <StatusBadge tone="blue">Crónico</StatusBadge>}{patient.isDeceased && <StatusBadge>Fallecido</StatusBadge>}</div><p className="mt-1 text-sm text-default-600">{patient.documentType === "passport" ? "Pasaporte" : "DPI"} {patient.documentNumber} · Expediente #{patient.id}</p><p className="mt-1 text-sm text-default-500">{patient.phone || "Sin teléfono"}{patient.email ? ` · ${patient.email}` : ""}</p></div>
              </div>
              {!patient.isDeceased && <div className="flex flex-wrap gap-2">{isDoctor && <button type="button" onClick={() => showFormAndLookups("prescription")} disabled={!patientFile.records.length} title={!patientFile.records.length ? "Registra primero una consulta" : ""} className={buttonClass}><ClipboardList size={16} />Nueva receta</button>}<button type="button" onClick={() => showFormAndLookups("appointment")} className={secondaryButtonClass}><CalendarDays size={16} />Agendar cita</button></div>}
            </div>
          </div>
          <div className="border-b border-default-200 px-4 md:px-6"><nav className="-mb-px flex gap-5 overflow-x-auto" aria-label="Secciones del expediente">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setFileTab(tab.id)} className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition ${fileTab === tab.id ? "border-primary text-primary" : "border-transparent text-default-500 hover:text-default-800"}`}>{tab.label}{tab.count > 0 && <span className="ml-2 rounded-full bg-default-100 px-2 py-0.5 text-xs">{tab.count}</span>}</button>)}</nav></div>
          <div className="p-4 md:p-6">{renderFileTab(patient)}</div>
        </section>
      </div>
    );
  }

  function renderAppointments() {
    const today = new Date().toDateString();
    const todayItems = appointments.filter((appointment) => new Date(appointment.scheduledAt).toDateString() === today);
    const nextItems = appointments.filter((appointment) => new Date(appointment.scheduledAt).getTime() > Date.now() && new Date(appointment.scheduledAt).toDateString() !== today && !["cancelled", "completed"].includes(appointment.status)).slice(0, 8);
    const pastItems = appointments.filter((appointment) => new Date(appointment.scheduledAt).getTime() < Date.now() && new Date(appointment.scheduledAt).toDateString() !== today)
      .sort((first, second) => new Date(second.scheduledAt).getTime() - new Date(first.scheduledAt).getTime()).slice(0, 8);
    return <div className="space-y-5"><SectionTitle title="Agenda de citas" subtitle="Las citas están ordenadas por prioridad del paciente y fecha." action={<button type="button" onClick={() => { setSelectedPatient(null); setShowForm("appointment"); void loadLookups(); }} className={buttonClass}><Plus size={16} />Agendar cita</button>} />
      {loading ? <Loading /> : appointments.length === 0 ? <EmptyState title="Agenda vacía" message="Registra una cita para comenzar a organizar la atención." action={<button type="button" onClick={() => { setShowForm("appointment"); void loadLookups(); }} className={buttonClass}><CalendarDays size={16} />Agendar cita</button>} /> : <div className="grid gap-4 xl:grid-cols-2"><AppointmentList appointments={todayItems} title="Hoy" onStatus={updateAppointmentStatus} /><AppointmentList appointments={nextItems} title="Próximas citas" onStatus={updateAppointmentStatus} /><div className="xl:col-span-2"><AppointmentList appointments={pastItems} title="Historial reciente de citas" onStatus={updateAppointmentStatus} /></div></div>}
    </div>;
  }

  function renderGlobalRecords() {
    return <div className="space-y-4"><SectionTitle title="Historial médico" subtitle="Información clínica real registrada por los médicos." action={isDoctor && <button type="button" onClick={() => { setSelectedPatient(null); setShowForm("record"); void loadLookups(); }} className={buttonClass}><FilePlus2 size={16} />Nueva consulta</button>} />{loading ? <Loading /> : <RecordList records={records} patients={patients} />}</div>;
  }

  function renderGlobalPrescriptions() {
    return <div className="space-y-4"><SectionTitle title="Recetas emitidas" subtitle="El despacho descuenta el inventario de manera transaccional." />{loading ? <Loading /> : <PrescriptionList prescriptions={prescriptions} patients={patients} actorId={Number(session?.user.id)} canDispense={Boolean(canDispense)} canManage={isDoctor} onStatus={updatePrescriptionStatus} saving={saving} />}</div>;
  }

  function renderGlobalAlerts() {
    return <div className="space-y-4"><SectionTitle title="Centro de alertas" subtitle="Alertas automáticas de seguimiento; el paciente se abre desde cada alerta." />{loading ? <Loading /> : <AlertList alerts={alerts} onRead={markAlertRead} onPatient={(id) => { const patient = patients.find((entry) => entry.id === id); if (patient) { setArea("patients"); void loadPatientFile(patient); } }} />}</div>;
  }

  function renderProducts() {
    const lowStockItems = products.filter((product) => product.stock <= product.minStock);
    const expiringItems = products.filter((product) => product.expirationDate && daysUntil(product.expirationDate) <= 30);
    return <div className="space-y-4"><SectionTitle title="Farmacia y muestras médicas" subtitle="Controla productos y movimientos trazables del inventario." action={<button type="button" onClick={() => setShowForm("product")} className={buttonClass}><Plus size={16} />Nuevo producto</button>} />
      {lowStockItems.length > 0 && <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{lowStockItems.length} producto(s) en nivel mínimo o sin existencias</p><p>Registra entradas para actualizar el inventario.</p></div></div>}
      {expiringItems.length > 0 && <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"><Clock3 size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{expiringItems.length} producto(s) vencido(s) o próximos a vencer</p><p>{expiringItems.map((product) => { const remainingDays = product.expirationDate ? daysUntil(product.expirationDate) : 0; return `${product.name} (${remainingDays < 0 ? "vencido" : `${remainingDays} días`})`; }).join(" · ")}</p></div></div>}
      {loading ? <Loading /> : products.length === 0 ? <EmptyState title="Catálogo vacío" message="Agrega tus productos reales de farmacia, muestras e insumos para comenzar." action={<button type="button" onClick={() => setShowForm("product")} className={buttonClass}><Package size={16} />Registrar producto</button>} /> : <div className="overflow-x-auto rounded-lg border border-default-200"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-default-50"><tr>{["Producto", "Tipo", "Existencias", "Vencimiento", "Precio", "Receta", "Acciones"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-default-200">{products.map((product) => <tr key={product.id}><td className="px-4 py-3"><p className="font-medium">{product.name}</p><p className="text-xs text-default-500">{product.sku}{product.laboratory ? ` · ${product.laboratory}` : ""}</p></td><td className="px-4 py-3"><StatusBadge tone={product.type === "sample" ? "blue" : "neutral"}>{product.type === "sample" ? "Muestra médica" : product.type === "medicine" ? "Medicamento" : "Insumo"}</StatusBadge></td><td className="px-4 py-3"><span className={product.stock <= product.minStock ? "font-semibold text-amber-700" : ""}>{product.stock} {product.unit ?? ""}</span><p className="text-xs text-default-500">Mínimo: {product.minStock}</p></td><td className="px-4 py-3">{product.expirationDate ? dateOnly(product.expirationDate) : "Sin registrar"}</td><td className="px-4 py-3">{product.price === null ? "—" : `Q ${Number(product.price).toFixed(2)}`}</td><td className="px-4 py-3">{product.requiresPrescription ? "Sí" : "No"}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => setMovementProduct(product)} className={secondaryButtonClass}><Activity size={15} />Movimiento</button><button type="button" onClick={() => { setProductToEdit(product); setShowForm("editProduct"); setError(""); setNotice(""); }} className={secondaryButtonClass}>Editar</button><button type="button" disabled={saving} onClick={() => void deactivateProduct(product)} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">Desactivar</button></div></td></tr>)}</tbody></table></div>}
    </div>;
  }

  function renderAudit() {
    return <div className="space-y-4">
      <SectionTitle title="Registro de auditoría" subtitle="Consulta inmutable de acciones; visible únicamente para administración." />
      {loading ? <Loading /> : auditPage.items.length === 0 ? <EmptyState title="Sin acciones registradas" message="Cuando se realicen acciones auditadas aparecerán aquí." /> : <>
        <div className="overflow-x-auto rounded-lg border border-default-200">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-default-50"><tr>{["Fecha", "Usuario", "Acción", "Registro", "ID", "Antes", "Después"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-default-200">{auditPage.items.map((item) => <tr key={item.id}>
              <td className="px-4 py-3">{dateTime(item.createdAt)}</td>
              <td className="px-4 py-3">{item.userName ?? `Usuario #${item.userId ?? "sistema"}`}</td>
              <td className="px-4 py-3">{item.action}</td>
              <td className="px-4 py-3">{item.entity}</td>
              <td className="px-4 py-3">{item.entityId}</td>
              <td className="max-w-sm px-4 py-3"><pre className="whitespace-pre-wrap break-words text-xs">{item.oldValues ? JSON.stringify(item.oldValues) : "—"}</pre></td>
              <td className="max-w-sm px-4 py-3"><pre className="whitespace-pre-wrap break-words text-xs">{item.newValues ? JSON.stringify(item.newValues) : "—"}</pre></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm text-default-600">
          <span>{auditPage.total} acción(es) registradas · Página {auditPage.page} de {Math.max(1, Math.ceil(auditPage.total / auditPage.limit))}</span>
          <div className="flex gap-2">
            <button type="button" className={secondaryButtonClass} disabled={auditPageNumber <= 1 || loading} onClick={() => setAuditPageNumber((page) => page - 1)}>Anterior</button>
            <button type="button" className={secondaryButtonClass} disabled={auditPageNumber * auditPage.limit >= auditPage.total || loading} onClick={() => setAuditPageNumber((page) => page + 1)}>Siguiente</button>
          </div>
        </div>
      </>}
    </div>;
  }

  const activeArea = areas.find((item) => item.id === area);

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-7">
      {!selectedPatient && <>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-1 text-sm font-medium text-primary">Gestión clínica integral</p><h1 className="text-2xl font-bold tracking-tight text-default-900 md:text-3xl">Panel clínico</h1><p className="mt-1 text-sm text-default-500">Datos reales de pacientes, atención, seguimiento y farmacia.</p></div>
          <div className="flex items-center gap-2 text-xs text-default-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />Servicios clínicos conectados</div>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard icon={<Users size={18} />} label="Pacientes" value={String(stats.patientCount)} />
          <MetricCard icon={<Heart size={18} />} label="Prioritarios" value={String(stats.priorityCount)} tone="amber" />
          <MetricCard icon={<Activity size={18} />} label="Seguimiento crónico" value={String(stats.chronicCount)} tone="blue" />
          <MetricCard icon={<CalendarDays size={18} />} label="Citas hoy" value={String(stats.todayAppointments)} />
          <MetricCard icon={<AlertTriangle size={18} />} label="Alertas pendientes" value={String(stats.unreadAlerts)} tone={stats.unreadAlerts ? "amber" : "neutral"} />
          <MetricCard icon={<Package size={18} />} label="Stock por revisar" value={String(stats.lowStock)} tone={stats.lowStock ? "red" : "neutral"} />
        </section>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Módulos clínicos">
          {areas.filter((item) => item.id !== "audit" || session?.user.role === "admin").map((item) => <button key={item.id} type="button" onClick={() => { setSelectedPatient(null); setArea(item.id); setError(""); setNotice(""); }} className={`whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition ${area === item.id ? "bg-primary text-primary-foreground shadow-sm" : "border border-default-200 bg-card text-default-600 hover:bg-default-100"}`}>{item.title}</button>)}
        </nav>
        {(error || notice) && <Feedback error={error} notice={notice} onClose={() => { setError(""); setNotice(""); }} />}
        <section className="rounded-xl border border-default-200 bg-card p-4 shadow-sm md:p-6">
          {area === "patients" && <><SectionTitle title="Pacientes y expedientes" subtitle="Selecciona un paciente para consultar y dar seguimiento a todo su expediente." />{renderPatientList()}</>}
          {area === "appointments" && renderAppointments()}
          {area === "medical-records" && renderGlobalRecords()}
          {area === "prescriptions" && renderGlobalPrescriptions()}
          {area === "alerts" && renderGlobalAlerts()}
          {area === "products" && renderProducts()}
          {area === "audit" && session?.user.role === "admin" && renderAudit()}
        </section>
        {area === "appointments" && upcomingAppointments.length > 0 && <section className="rounded-xl border border-default-200 bg-card p-4 shadow-sm md:p-6"><SectionTitle title="Siguiente atención" subtitle="Citas próximas confirmadas desde la agenda." /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{upcomingAppointments.slice(0, 3).map((appointment) => <div key={appointment.id} className="rounded-lg border border-default-200 p-4"><div className="flex items-start justify-between gap-2"><p className="font-semibold">{appointment.patient.firstName} {appointment.patient.lastName}</p>{appointment.patient.isPriority && <StatusBadge tone="amber">Prioritario</StatusBadge>}</div><p className="mt-2 flex items-center gap-2 text-sm text-default-600"><Clock3 size={15} />{dateTime(appointment.scheduledAt)}</p><p className="mt-1 text-xs text-default-500">{appointment.doctor.fullName} · {appointment.reason || "Consulta"}</p></div>)}</div></section>}
      </>}
      {selectedPatient && <>
        {(error || notice) && <Feedback error={error} notice={notice} onClose={() => { setError(""); setNotice(""); }} />}
        {renderPatientFile(selectedPatient)}
      </>}
      {movementProduct && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-xl bg-background p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-semibold">Movimiento de inventario</h2><p className="mt-1 text-sm text-default-500">{movementProduct.name} · Existencia actual: {movementProduct.stock}</p></div><button type="button" disabled={saving} onClick={() => setMovementProduct(null)} className={secondaryButtonClass}><X size={18} /></button></div>{(error || notice) && <div className="mb-4"><Feedback error={error} notice={notice} onClose={() => { setError(""); setNotice(""); }} /></div>}<form onSubmit={(event) => void submitMovement(event)} className="space-y-4"><FieldLabel label="Tipo de movimiento"><select name="movementCode" disabled={saving} className={inputClass}><option value="in">Entrada</option><option value="out">Salida</option></select></FieldLabel><FieldLabel label="Cantidad"><input name="quantity" type="number" min={1} required disabled={saving} className={inputClass} /></FieldLabel><FieldLabel label="Motivo"><input name="reason" maxLength={255} disabled={saving} className={inputClass} placeholder="Compra, entrega, ajuste documentado..." /></FieldLabel><div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setMovementProduct(null)} className={secondaryButtonClass}>Cancelar</button><button disabled={saving} className={buttonClass}><Check size={16} />{saving ? "Registrando..." : "Registrar movimiento"}</button></div></form></section></div>}
      {renderModal()}
    </main>
  );
}

function MetricCard({ icon, label, value, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; tone?: "neutral" | "amber" | "blue" | "red" }) {
  const classes = { neutral: "bg-primary/10 text-primary", amber: "bg-amber-100 text-amber-700", blue: "bg-blue-100 text-blue-700", red: "bg-red-100 text-red-700" };
  return <div className="rounded-xl border border-default-200 bg-card p-4 shadow-sm"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${classes[tone]}`}>{icon}</div><p className="text-2xl font-bold text-default-900">{value}</p><p className="mt-1 text-xs font-medium text-default-500">{label}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-default-400">{label}</dt><dd className="mt-1 break-words text-sm text-default-800">{value}</dd></div>;
}

function Loading() {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-default-500"><RefreshCw size={16} className="animate-spin" />Cargando datos...</div>;
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 px-5 py-12 text-center"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound size={22} /></div><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm text-default-500">{message}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function Feedback({ error, notice, onClose }: { error: string; notice: string; onClose: () => void }) {
  if (!error && !notice) return null;
  return <div role={error ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${error ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}><span>{error || notice}</span><button type="button" aria-label="Cerrar aviso" onClick={onClose}><X size={16} /></button></div>;
}

function AppointmentList({ appointments, title = "Citas", onStatus }: { appointments: Appointment[]; title?: string; onStatus: (appointment: Appointment, status: string) => void }) {
  return <section className="rounded-lg border border-default-200 p-4"><SectionTitle title={title} /><div className="space-y-3">{appointments.length === 0 ? <p className="py-4 text-sm text-default-500">No hay citas en esta sección.</p> : appointments.map((appointment) => <article key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-default-50 p-3"><div className="flex min-w-[220px] flex-1 items-start gap-3"><div className="rounded-md bg-primary/10 p-2 text-primary"><CalendarDays size={18} /></div><div><p className="font-semibold">{appointment.patient.firstName} {appointment.patient.lastName} {appointment.patient.isPriority && <span className="ml-1 text-xs text-amber-700">· Prioritario</span>}</p><p className="mt-1 text-sm text-default-600">{dateTime(appointment.scheduledAt)} · {appointment.durationMinutes} min</p><p className="text-xs text-default-500">{appointment.doctor.fullName} · {appointment.reason || "Consulta"}</p></div></div><div className="flex items-center gap-2"><StatusBadge tone={appointment.status === "completed" ? "green" : appointment.status === "cancelled" ? "neutral" : "blue"}>{appointmentStatusLabel(appointment.status)}</StatusBadge>{!["completed", "cancelled"].includes(appointment.status) && <select aria-label="Actualizar estado de cita" defaultValue="" className="rounded-md border bg-background p-2 text-xs" onChange={(event) => { if (event.target.value) onStatus(appointment, event.target.value); }}><option value="" disabled>Actualizar</option><option value="completed">Completar</option><option value="cancelled">Cancelar</option></select>}</div></article>)}</div></section>;
}

function RecordList({ records, patients = [] }: { records: MedicalRecord[]; patients?: Patient[] }) {
  return <div className="space-y-3">{records.length === 0 ? <EmptyState title="Sin consultas registradas" message="Cuando un médico registre una consulta, aparecerá aquí con el diagnóstico y tratamiento." /> : records.map((record) => { const patient = patients.find((item) => item.id === record.patientId); return <article key={record.id} className="rounded-lg border border-default-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{record.reason}</p><p className="mt-1 text-xs text-default-500">{patient ? `${patient.firstName} ${patient.lastName} · ` : ""}{dateTime(record.consultationDate)} · {record.doctor.fullName}</p></div><StatusBadge tone="blue">Consulta #{record.id}</StatusBadge></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Detail label="Diagnóstico" value={record.diagnosis || "Sin diagnóstico"} /><Detail label="Tratamiento" value={record.treatment || "Sin tratamiento registrado"} /></div>{record.notes && <p className="mt-3 border-t border-default-100 pt-3 text-sm text-default-600">{record.notes}</p>}</article>; })}</div>;
}

function PrescriptionList({ prescriptions, patients = [], actorId = 0, canDispense = false, canManage = false, onStatus, saving = false }: { prescriptions: Prescription[]; patients?: Patient[]; actorId?: number; canDispense?: boolean; canManage?: boolean; onStatus?: (prescription: Prescription, status: string) => void; saving?: boolean }) {
  return <div className="space-y-3">{prescriptions.length === 0 ? <EmptyState title="Sin recetas" message="Las recetas aparecerán vinculadas a la consulta que las originó." /> : prescriptions.map((prescription) => { const patient = patients.find((item) => item.id === prescription.patientId); const isPrescriber = canManage && prescription.doctor.id === actorId; return <article key={prescription.id} className="rounded-lg border border-default-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{prescription.code || `Receta #${prescription.id}`}</p><p className="mt-1 text-xs text-default-500">{patient ? `${patient.firstName} ${patient.lastName} · ` : ""}{dateTime(prescription.issuedAt)} · {prescription.doctor.fullName}</p></div><div className="flex items-center gap-2"><StatusBadge tone={prescription.status === "issued" ? "blue" : prescription.status === "cancelled" ? "red" : "green"}>{prescriptionStatusLabel(prescription.status)}</StatusBadge>{onStatus && prescription.status === "issued" && (canDispense || isPrescriber) && <select aria-label="Actualizar estado de receta" defaultValue="" disabled={saving} className="rounded-md border bg-background p-2 text-xs disabled:opacity-50" onChange={(event) => { if (event.target.value) onStatus(prescription, event.target.value); }}><option value="" disabled>Acciones</option>{(canDispense || isPrescriber) && <option value="dispensed">Despachar y descontar stock</option>}{isPrescriber && <option value="cancelled">Cancelar receta</option>}</select>}</div></div><div className="mt-3 space-y-2">{prescription.items.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-default-50 px-3 py-2 text-sm"><div><p className="font-medium">{item.product.name}</p><p className="text-xs text-default-500">{item.dosage} · {item.frequency}{item.duration ? ` · ${item.duration}` : ""}</p>{item.instructions && <p className="text-xs text-default-500">{item.instructions}</p>}</div><span className="text-default-600">Cantidad: {item.quantity}</span></div>)}</div><p className="mt-2 text-xs text-default-500">Consulta vinculada #{prescription.medicalRecordId}</p></article>; })}</div>;
}

function AlertList({ alerts, onRead, onPatient }: { alerts: AlertItem[]; onRead: (id: number) => void; onPatient?: (id: number) => void }) {
  return <div className="space-y-3">{alerts.length === 0 ? <EmptyState title="Sin alertas" message="Las alertas de seguimiento aparecerán automáticamente cuando haya actividad clínica de pacientes crónicos." /> : alerts.map((alert) => <article key={alert.id} className={`rounded-lg border p-4 ${alert.isRead ? "border-default-200" : "border-amber-300 bg-amber-50/50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><div className="rounded-lg bg-amber-100 p-2 text-amber-700"><AlertTriangle size={18} /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{alert.title}</h3><StatusBadge tone={alert.severity === "high" ? "red" : "amber"}>{alert.severity}</StatusBadge>{!alert.isRead && <StatusBadge tone="amber">Pendiente</StatusBadge>}</div><p className="mt-1 text-sm text-default-600">{alert.message}</p><p className="mt-1 text-xs text-default-500">{dateTime(alert.createdAt)} · Paciente #{alert.patientId}</p><button type="button" onClick={() => onPatient?.(alert.patientId)} className="mt-2 text-xs font-medium text-primary underline">Abrir expediente</button></div></div>{!alert.isRead && <button type="button" onClick={() => onRead(alert.id)} className={secondaryButtonClass}><Check size={15} />Marcar leída</button>}</div></article>)}</div>;
}
