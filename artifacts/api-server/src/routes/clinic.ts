import { Router, type IRouter } from "express";
import {
  CreateAttachmentBody,
  CreatePatientBody,
  CreatePatientChargeBody,
  CreatePatientPaymentBody,
  CreatePatientVisitBody,
  CreateProcedureBody,
  CreateStaffBody,
  CreateTreatmentEntryBody,
  CreateTreatmentPlanBody,
  ListPatientsQueryParams,
  UpdatePatientBody,
  UpdateSettingsBody,
  UpdateTreatmentPlanBody,
  UpdateVisitBody,
  GetReportsQueryParams,
  ListAttachmentsQueryParams,
  ListAuditEventsQueryParams,
  RequestUploadUrlBody,
} from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  auditEvent,
  id,
  loadClinicState,
  saveClinicState,
  type ClinicState,
} from "../lib/clinicState";

const router: IRouter = Router();
const permanentTeeth = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
  "38", "37", "36", "35", "34", "33", "32", "31",
  "41", "42", "43", "44", "45", "46", "47", "48",
];
const deciduousTeeth = [
  "55", "54", "53", "52", "51", "61", "62", "63", "64", "65",
  "75", "74", "73", "72", "71", "81", "82", "83", "84", "85",
];

function dateOnly(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function ageFromBirth(dateOfBirth: string) {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function patientBalance(state: ClinicState, patientId: string) {
  const htgCharges = state.charges.filter((item) => item.patientId === patientId && item.currency === "HTG").reduce((sum, item) => sum + Number(item.amount), 0);
  const usdCharges = state.charges.filter((item) => item.patientId === patientId && item.currency === "USD").reduce((sum, item) => sum + Number(item.amount), 0);
  const htgPayments = state.payments.filter((item) => item.patientId === patientId && item.currency === "HTG").reduce((sum, item) => sum + Number(item.amount), 0);
  const usdPayments = state.payments.filter((item) => item.patientId === patientId && item.currency === "USD").reduce((sum, item) => sum + Number(item.amount), 0);
  return { htg: Math.max(0, htgCharges - htgPayments), usd: Math.max(0, usdCharges - usdPayments) };
}

function patientSummary(state: ClinicState, patient: any) {
  const visits = state.visits.filter((item) => item.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const balance = patientBalance(state, patient.id);
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    phone: patient.phone,
    age: ageFromBirth(patient.dateOfBirth),
    lastVisit: visits[0]?.date ?? null,
    htgBalance: balance.htg,
    usdBalance: balance.usd,
    alert: balance.htg > 0 || balance.usd > 0 ? "Balance due" : null,
  };
}

function addAudit(state: ClinicState, req: any, event: Omit<any, "id" | "occurredAt">) {
  const actorName = req.header("x-staff-name") || "Dr. Louis Juste";
  auditEvent(state, { ...event, actorName });
}

function procedureName(state: ClinicState, procedureId: string) {
  return state.procedures.find((item) => item.id === procedureId)?.nameFr ||
    state.procedures.find((item) => item.id === procedureId)?.name ||
    procedureId;
}

function toothStatus(entries: any[]) {
  const combined = entries.map((entry) => `${entry.procedureName} ${entry.diagnosis}`).join(" ").toLowerCase();
  if (combined.includes("extraction") || combined.includes("extract")) return "extracted";
  if (combined.includes("couronne") || combined.includes("crown")) return "crown";
  if (combined.includes("endodont") || combined.includes("root canal")) return "root-canal";
  if (combined.includes("abcès") || combined.includes("abscess")) return "abscess";
  if (combined.includes("obturation") || combined.includes("filling") || combined.includes("composite")) return "filled";
  if (combined.includes("carie") || combined.includes("caries") || combined.includes("restore")) return "needs-restoration";
  return entries.length ? "filled" : "healthy";
}

function buildOdontogram(state: ClinicState, patient: any) {
  const patientEntries = state.visits.filter((visit) => visit.patientId === patient.id).flatMap((visit) =>
    visit.entries.map((entry: any) => ({ ...entry, date: visit.date })),
  );
  const allNumbers = [...permanentTeeth, ...deciduousTeeth];
  const teeth = allNumbers.map((number) => {
    const history = patientEntries.filter((entry) => entry.toothNumber === number);
    return {
      number,
      dentition: permanentTeeth.includes(number) ? "permanent" : "deciduous",
      status: toothStatus(history),
      history: history.map((entry) => ({
        id: entry.id,
        date: entry.date,
        diagnosis: entry.diagnosis,
        treatment: entry.procedureName,
        status: entry.status,
        notes: entry.notes ?? null,
      })),
    };
  });
  const latestSummary = state.visits
    .filter((visit) => visit.patientId === patient.id && visit.examSummary)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.examSummary;
  return {
    dentition: ageFromBirth(patient.dateOfBirth) < 6 ? "deciduous" : ageFromBirth(patient.dateOfBirth) < 13 ? "mixed" : "permanent",
    teeth,
    examSummary: latestSummary ?? {
      teethToRestore: null,
      abscess: null,
      orthodonticTreatment: null,
      prosthesis: null,
      devitalizations: null,
      prophylaxis: null,
      splinting: null,
      whitening: null,
      xrayNotes: null,
    },
  };
}

function upcomingPlans(state: ClinicState) {
  return state.plans
    .filter((plan) => plan.status === "in-progress" && plan.nextAppointmentDate)
    .map((plan) => {
      const patient = state.patients.find((item) => item.id === plan.patientId);
      return {
        planId: plan.id,
        patientId: plan.patientId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown patient",
        planName: plan.name,
        nextAppointmentDate: plan.nextAppointmentDate,
      };
    })
    .sort((a, b) => a.nextAppointmentDate.localeCompare(b.nextAppointmentDate));
}

function dateInRange(date: string | Date, startDate: string | Date, endDate: string | Date) {
  const value = dateOnly(date);
  return value >= dateOnly(startDate) && value <= dateOnly(endDate);
}

router.get("/dashboard", async (_req, res, next) => {
  try {
    const state = await loadClinicState();
    const now = new Date("2026-09-01T12:00:00.000Z");
    const monthStart = dateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
    const monthVisits = state.visits.filter((visit) => visit.date >= monthStart);
    const htgCollected = state.payments.filter((item) => item.currency === "HTG").reduce((sum, item) => sum + Number(item.amount), 0);
    const usdCollected = state.payments.filter((item) => item.currency === "USD").reduce((sum, item) => sum + Number(item.amount), 0);
    const allBalances = state.patients.map((patient) => patientBalance(state, patient.id));
    res.json({
      patientCount: state.patients.length,
      visitsThisMonth: monthVisits.length,
      newPatientsThisMonth: state.patients.filter((patient) => patient.createdAt.slice(0, 7) === monthStart.slice(0, 7)).length,
      htgCollected,
      usdCollected,
      htgOutstanding: allBalances.reduce((sum, balance) => sum + balance.htg, 0),
      usdOutstanding: allBalances.reduce((sum, balance) => sum + balance.usd, 0),
      upcomingPlans: upcomingPlans(state),
      alerts: state.patients
        .map((patient) => ({ patient, balance: patientBalance(state, patient.id) }))
        .filter(({ balance }) => balance.htg > 0 || balance.usd > 0)
        .map(({ patient, balance }) => ({
          id: `balance-${patient.id}`,
          level: "warning",
          title: `${patient.firstName} ${patient.lastName}`,
          detail: `HTG ${balance.htg.toLocaleString()} · USD ${balance.usd.toLocaleString()}`,
          patientId: patient.id,
        })),
      recentActivity: state.audit.slice(0, 8),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/patients", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const query = ListPatientsQueryParams.parse(req.query);
    const search = query.search?.toLowerCase().trim();
    const summaries = state.patients.map((patient) => patientSummary(state, patient)).filter((patient) => {
      const matchesSearch = !search || `${patient.firstName} ${patient.lastName} ${patient.phone}`.toLowerCase().includes(search);
      const matchesBalance = query.balanceStatus === "all" ||
        (query.balanceStatus === "owing" && (patient.htgBalance > 0 || patient.usdBalance > 0)) ||
        (query.balanceStatus === "clear" && patient.htgBalance === 0 && patient.usdBalance === 0);
      return matchesSearch && matchesBalance;
    });
    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

router.post("/patients", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const body = CreatePatientBody.parse(req.body);
    const patient = { id: id("pat"), ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state.patients.unshift(patient);
    addAudit(state, req, { action: "created", entity: "patient", entityId: patient.id, patientId: patient.id });
    await saveClinicState(state);
    res.status(201).json({ ...patientSummary(state, patient), ...patient });
  } catch (error) {
    next(error);
  }
});

router.get("/patients/:patientId", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const patient = state.patients.find((item) => item.id === req.params.patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    return res.json({ ...patientSummary(state, patient), ...patient });
  } catch (error) {
    return next(error);
  }
});

router.patch("/patients/:patientId", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const patient = state.patients.find((item) => item.id === req.params.patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    const body = UpdatePatientBody.parse(req.body);
    Object.assign(patient, body, { updatedAt: new Date().toISOString() });
    addAudit(state, req, { action: "updated", entity: "patient", entityId: patient.id, patientId: patient.id });
    await saveClinicState(state);
    return res.json({ ...patientSummary(state, patient), ...patient });
  } catch (error) {
    return next(error);
  }
});

router.get("/patients/:patientId/odontogram", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const patient = state.patients.find((item) => item.id === req.params.patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    return res.json(buildOdontogram(state, patient));
  } catch (error) {
    return next(error);
  }
});

router.get("/patients/:patientId/visits", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    res.json(state.visits.filter((visit) => visit.patientId === req.params.patientId).sort((a, b) => b.date.localeCompare(a.date)));
  } catch (error) {
    next(error);
  }
});

router.post("/patients/:patientId/visits", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const body = CreatePatientVisitBody.parse(req.body);
    const staff = state.staff.find((item) => item.id === body.staffId);
    const visit = { id: id("visit"), patientId: req.params.patientId, ...body, staffName: staff?.name ?? "Clinic staff", entries: [], createdAt: new Date().toISOString() };
    state.visits.unshift(visit);
    addAudit(state, req, { action: "created", entity: "visit", entityId: visit.id, patientId: visit.patientId });
    await saveClinicState(state);
    res.status(201).json(visit);
  } catch (error) {
    next(error);
  }
});

router.get("/visits/:visitId", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const visit = state.visits.find((item) => item.id === req.params.visitId);
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    return res.json(visit);
  } catch (error) {
    return next(error);
  }
});

router.patch("/visits/:visitId", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const visit = state.visits.find((item) => item.id === req.params.visitId);
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    Object.assign(visit, UpdateVisitBody.parse(req.body));
    addAudit(state, req, { action: "updated", entity: "visit", entityId: visit.id, patientId: visit.patientId });
    await saveClinicState(state);
    return res.json(visit);
  } catch (error) {
    return next(error);
  }
});

router.post("/visits/:visitId/entries", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const visit = state.visits.find((item) => item.id === req.params.visitId);
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    const body = CreateTreatmentEntryBody.parse(req.body);
    const entry = { id: id("entry"), ...body, procedureName: procedureName(state, body.procedureId) };
    visit.entries.push(entry);
    addAudit(state, req, { action: "created", entity: "treatment-entry", entityId: entry.id, patientId: visit.patientId });
    await saveClinicState(state);
    return res.status(201).json(entry);
  } catch (error) {
    return next(error);
  }
});

router.get("/patients/:patientId/treatment-plans", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    res.json(state.plans.filter((plan) => plan.patientId === req.params.patientId));
  } catch (error) {
    next(error);
  }
});

router.post("/patients/:patientId/treatment-plans", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const body = CreateTreatmentPlanBody.parse(req.body);
    const plan = { id: id("plan"), patientId: req.params.patientId, ...body, completedCount: 0, totalCount: body.visitIds?.length || 0 };
    state.plans.unshift(plan);
    addAudit(state, req, { action: "created", entity: "treatment-plan", entityId: plan.id, patientId: plan.patientId });
    await saveClinicState(state);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
});

router.patch("/treatment-plans/:planId", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const plan = state.plans.find((item) => item.id === req.params.planId);
    if (!plan) return res.status(404).json({ error: "Treatment plan not found" });
    Object.assign(plan, UpdateTreatmentPlanBody.parse(req.body));
    addAudit(state, req, { action: "updated", entity: "treatment-plan", entityId: plan.id, patientId: plan.patientId });
    await saveClinicState(state);
    return res.json(plan);
  } catch (error) {
    return next(error);
  }
});

router.get("/patients/:patientId/charges", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    res.json(state.charges.filter((item) => item.patientId === req.params.patientId).sort((a, b) => b.date.localeCompare(a.date)));
  } catch (error) {
    next(error);
  }
});

router.post("/patients/:patientId/charges", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const body = CreatePatientChargeBody.parse(req.body);
    const charge = { id: id("charge"), patientId: req.params.patientId, ...body, createdAt: new Date().toISOString() };
    state.charges.unshift(charge);
    addAudit(state, req, { action: "recorded", entity: "charge", entityId: charge.id, patientId: charge.patientId });
    await saveClinicState(state);
    res.status(201).json(charge);
  } catch (error) {
    next(error);
  }
});

router.get("/patients/:patientId/payments", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    res.json(state.payments.filter((item) => item.patientId === req.params.patientId).sort((a, b) => b.date.localeCompare(a.date)));
  } catch (error) {
    next(error);
  }
});

router.post("/patients/:patientId/payments", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const body = CreatePatientPaymentBody.parse(req.body);
    const payment = { id: id("payment"), patientId: req.params.patientId, ...body, createdAt: new Date().toISOString() };
    state.payments.unshift(payment);
    addAudit(state, req, { action: "recorded", entity: "payment", entityId: payment.id, patientId: payment.patientId });
    await saveClinicState(state);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const query = GetReportsQueryParams.parse(req.query);
    const payments = state.payments.filter((item) => dateInRange(item.date, query.startDate, query.endDate));
    const charges = state.charges.filter((item) => dateInRange(item.date, query.startDate, query.endDate));
    const visits = state.visits.filter((item) => dateInRange(item.date, query.startDate, query.endDate));
    const htg = payments.filter((item) => item.currency === "HTG").reduce((sum, item) => sum + Number(item.amount), 0);
    const usd = payments.filter((item) => item.currency === "USD").reduce((sum, item) => sum + Number(item.amount), 0);
    const revenueMap = new Map<string, { procedureName: string; HTG: number; USD: number }>();
    charges.forEach((charge) => {
      const matchingVisit = state.visits.find((visit) => visit.id === charge.visitId);
      const procedure = matchingVisit?.entries?.find((entry: any) => entry.fee === charge.amount && entry.currency === charge.currency)?.procedureName ?? charge.description;
      const current = revenueMap.get(procedure) ?? { procedureName: procedure, HTG: 0, USD: 0 };
      const currency = charge.currency === "USD" ? "USD" : "HTG";
      current[currency] += Number(charge.amount);
      revenueMap.set(procedure, current);
    });
    const balanceRows = state.patients.map((patient) => {
      const balance = patientBalance(state, patient.id);
      return { patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}`, htg: balance.htg, usd: balance.usd, oldestDueDate: state.charges.filter((charge) => charge.patientId === patient.id).sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? null };
    }).sort((a, b) => (b.htg + b.usd) - (a.htg + a.usd));
    const cutoff = new Date("2026-09-01T12:00:00.000Z");
    cutoff.setUTCDate(cutoff.getUTCDate() - query.overdueDays);
    const overduePatients = balanceRows.filter((row) => (row.htg > 0 || row.usd > 0) && row.oldestDueDate && new Date(row.oldestDueDate) <= cutoff);
    res.json({
      startDate: query.startDate,
      endDate: query.endDate,
      payments: { HTG: htg, USD: usd, series: [] },
      balances: balanceRows,
      revenueByProcedure: [...revenueMap.values()],
      visits: { totalVisits: visits.length, newPatients: state.patients.filter((patient) => patient.createdAt.slice(0, 10) >= query.startDate && patient.createdAt.slice(0, 10) <= query.endDate).length, series: [] },
      treatmentStatuses: {
        planned: state.visits.flatMap((visit) => visit.entries).filter((entry: any) => entry.status === "planned").length,
        "in-progress": state.visits.flatMap((visit) => visit.entries).filter((entry: any) => entry.status === "in-progress").length,
        completed: state.visits.flatMap((visit) => visit.entries).filter((entry: any) => entry.status === "completed").length,
      },
      upcomingPlans: upcomingPlans(state),
      overduePatients,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/attachments", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const query = ListAttachmentsQueryParams.parse(req.query);
    const results = state.attachments.filter((item) =>
      (!query.patientId || item.patientId === query.patientId) &&
      (!query.visitId || item.visitId === query.visitId) &&
      (!query.toothNumber || item.toothNumber === query.toothNumber),
    );
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.post("/attachments", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const body = CreateAttachmentBody.parse(req.body);
    const attachment = { id: id("attachment"), ...body, uploadedAt: new Date().toISOString(), uploadedBy: req.header("x-staff-name") || "Dr. Louis Juste", url: `/api/storage${body.objectPath}` };
    state.attachments.unshift(attachment);
    addAudit(state, req, { action: "uploaded", entity: "attachment", entityId: attachment.id, patientId: attachment.patientId });
    await saveClinicState(state);
    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
});

router.get("/staff", async (_req, res, next) => {
  try {
    const state = await loadClinicState();
    res.json(state.staff);
  } catch (error) {
    next(error);
  }
});

router.post("/staff", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const staff = { id: id("staff"), ...CreateStaffBody.parse(req.body), lastActive: null };
    state.staff.unshift(staff);
    addAudit(state, req, { action: "created", entity: "staff", entityId: staff.id });
    await saveClinicState(state);
    res.status(201).json(staff);
  } catch (error) {
    next(error);
  }
});

router.get("/settings", async (_req, res, next) => {
  try {
    const state = await loadClinicState();
    res.json(state.settings);
  } catch (error) {
    next(error);
  }
});

router.patch("/settings", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    Object.assign(state.settings, UpdateSettingsBody.parse(req.body));
    addAudit(state, req, { action: "updated", entity: "settings", entityId: "default" });
    await saveClinicState(state);
    res.json(state.settings);
  } catch (error) {
    next(error);
  }
});

router.get("/procedures", async (_req, res, next) => {
  try {
    const state = await loadClinicState();
    res.json(state.procedures);
  } catch (error) {
    next(error);
  }
});

router.post("/procedures", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const procedure = { id: id("proc"), ...CreateProcedureBody.parse(req.body) };
    state.procedures.push(procedure);
    addAudit(state, req, { action: "created", entity: "procedure", entityId: procedure.id });
    await saveClinicState(state);
    res.status(201).json(procedure);
  } catch (error) {
    next(error);
  }
});

router.get("/audit", async (req, res, next) => {
  try {
    const state = await loadClinicState();
    const query = ListAuditEventsQueryParams.parse(req.query);
    res.json(state.audit.filter((item) => !query.patientId || item.patientId === query.patientId).slice(0, query.limit));
  } catch (error) {
    next(error);
  }
});

router.post("/storage/uploads/request-url", async (req, res, next) => {
  try {
    const body = RequestUploadUrlBody.parse(req.body);
    const storage = new ObjectStorageService();
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (error) {
    next(error);
  }
});

export default router;