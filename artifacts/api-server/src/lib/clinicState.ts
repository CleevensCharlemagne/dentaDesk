import { eq } from "drizzle-orm";
import { db, clinicStateTable } from "@workspace/db";

export type ClinicState = {
  patients: any[];
  visits: any[];
  plans: any[];
  charges: any[];
  payments: any[];
  attachments: any[];
  staff: any[];
  procedures: any[];
  audit: any[];
  settings: any;
};

const seedState: ClinicState = {
  patients: [
    {
      id: "pat-marie-louise",
      firstName: "Marie-Louise",
      lastName: "Joseph",
      dateOfBirth: "1987-04-12",
      sex: "female",
      phone: "+509 37 22 18 40",
      email: "marie.louise@example.com",
      address: "Delmas 33, Port-au-Prince",
      occupation: "Enseignante",
      maritalStatus: "Mariée",
      nationalId: null,
      bloodType: "O+",
      allergies: "Pénicilline",
      medicalConditions: "Aucune connue",
      medications: null,
      emergencyContact: { name: "Jean Joseph", phone: "+509 36 11 09 88", relationship: "Époux" },
      guardian: null,
      createdAt: "2026-06-11T09:15:00.000Z",
      updatedAt: "2026-08-28T15:20:00.000Z",
    },
    {
      id: "pat-jean-baptiste",
      firstName: "Jean-Baptiste",
      lastName: "Pierre",
      dateOfBirth: "1974-11-22",
      sex: "male",
      phone: "+509 38 77 40 21",
      email: null,
      address: "Pétion-Ville, Route de Frères",
      occupation: "Commerçant",
      maritalStatus: "Célibataire",
      nationalId: "HT-7482-1134",
      bloodType: "A+",
      allergies: null,
      medicalConditions: "Hypertension",
      medications: "Amlodipine",
      emergencyContact: { name: "Nadia Pierre", phone: "+509 34 80 10 22", relationship: "Sœur" },
      guardian: null,
      createdAt: "2026-07-18T11:40:00.000Z",
      updatedAt: "2026-08-21T13:12:00.000Z",
    },
    {
      id: "pat-lucas-noel",
      firstName: "Lucas",
      lastName: "Noël",
      dateOfBirth: "2014-02-03",
      sex: "male",
      phone: "+509 46 20 15 02",
      email: null,
      address: "Bourdon, Port-au-Prince",
      occupation: "Écolier",
      maritalStatus: "Mineur",
      nationalId: null,
      bloodType: null,
      allergies: null,
      medicalConditions: null,
      medications: null,
      emergencyContact: { name: "Sophie Noël", phone: "+509 37 90 11 52", relationship: "Mère" },
      guardian: { name: "Sophie Noël", phone: "+509 37 90 11 52", relationship: "Mère" },
      createdAt: "2026-08-02T08:20:00.000Z",
      updatedAt: "2026-08-29T10:05:00.000Z",
    },
  ],
  visits: [
    {
      id: "visit-marie-aug28",
      patientId: "pat-marie-louise",
      date: "2026-08-28",
      purpose: "Douleur molaire",
      complaintHistory: "Douleur intermittente depuis une semaine, sensible au froid.",
      pregnancyStatus: "not-pregnant",
      staffId: "staff-dentist",
      staffName: "Dr. Louis Juste",
      examSummary: {
        teethToRestore: "26",
        abscess: "Non",
        orthodonticTreatment: "Non",
        prosthesis: "Non",
        devitalizations: "26 à évaluer",
        prophylaxis: "À planifier",
        splinting: "Non",
        whitening: "Non",
        xrayNotes: "Lésion carieuse profonde sur 26.",
      },
      entries: [
        {
          id: "entry-26-exam",
          toothNumber: "26",
          procedureId: "proc-exam",
          procedureName: "Examen dentaire",
          diagnosis: "Caries profonde",
          medication: null,
          notes: "Radiographie recommandée.",
          fee: 35,
          currency: "USD",
          status: "completed",
        },
        {
          id: "entry-cleaning-marie",
          toothNumber: null,
          procedureId: "proc-cleaning",
          procedureName: "Détartrage et prophylaxie",
          diagnosis: "Plaque modérée",
          medication: null,
          notes: "Conseils d'hygiène donnés.",
          fee: 2500,
          currency: "HTG",
          status: "planned",
        },
      ],
      createdAt: "2026-08-28T15:20:00.000Z",
    },
    {
      id: "visit-jean-aug21",
      patientId: "pat-jean-baptiste",
      date: "2026-08-21",
      purpose: "Contrôle annuel",
      complaintHistory: "Aucune plainte particulière.",
      pregnancyStatus: "not-applicable",
      staffId: "staff-dentist",
      staffName: "Dr. Louis Juste",
      examSummary: {
        teethToRestore: "14",
        abscess: "Non",
        orthodonticTreatment: "Non",
        prosthesis: "Couronne 14",
        devitalizations: "14 complétée",
        prophylaxis: "Complétée",
        splinting: "Non",
        whitening: "Intérêt exprimé",
        xrayNotes: null,
      },
      entries: [
        {
          id: "entry-14-crown",
          toothNumber: "14",
          procedureId: "proc-crown",
          procedureName: "Couronne dentaire",
          diagnosis: "Dent fragilisée après traitement endodontique",
          medication: null,
          notes: "Couronne provisoire posée.",
          fee: 180,
          currency: "USD",
          status: "in-progress",
        },
        {
          id: "entry-cleaning-jean",
          toothNumber: null,
          procedureId: "proc-cleaning",
          procedureName: "Détartrage et prophylaxie",
          diagnosis: "Gingivite légère",
          medication: null,
          notes: null,
          fee: 3000,
          currency: "HTG",
          status: "completed",
        },
      ],
      createdAt: "2026-08-21T13:12:00.000Z",
    },
    {
      id: "visit-lucas-aug29",
      patientId: "pat-lucas-noel",
      date: "2026-08-29",
      purpose: "Visite de contrôle",
      complaintHistory: "Sensibilité sur une dent de lait.",
      pregnancyStatus: "not-applicable",
      staffId: "staff-dentist",
      staffName: "Dr. Louis Juste",
      examSummary: {
        teethToRestore: "85",
        abscess: "Non",
        orthodonticTreatment: "Évaluation future",
        prosthesis: "Non",
        devitalizations: "Non",
        prophylaxis: "Complétée",
        splinting: "Non",
        whitening: "Non",
        xrayNotes: null,
      },
      entries: [
        {
          id: "entry-85-sealant",
          toothNumber: "85",
          procedureId: "proc-sealant",
          procedureName: "Scellement des sillons",
          diagnosis: "Risque carieux",
          medication: null,
          notes: "Dentition mixte observée.",
          fee: 1500,
          currency: "HTG",
          status: "completed",
        },
      ],
      createdAt: "2026-08-29T10:05:00.000Z",
    },
  ],
  plans: [
    {
      id: "plan-marie-rct",
      patientId: "pat-marie-louise",
      name: "Traitement de la molaire 26",
      description: "Évaluer puis traiter la lésion profonde de la 26.",
      status: "in-progress",
      nextAppointmentDate: "2026-09-04",
      visitIds: ["visit-marie-aug28"],
      completedCount: 1,
      totalCount: 3,
    },
    {
      id: "plan-jean-crown",
      patientId: "pat-jean-baptiste",
      name: "Couronne sur 14",
      description: "Finalisation de la couronne après dévitalisation.",
      status: "in-progress",
      nextAppointmentDate: "2026-09-08",
      visitIds: ["visit-jean-aug21"],
      completedCount: 1,
      totalCount: 2,
    },
  ],
  charges: [
    { id: "charge-marie-exam", patientId: "pat-marie-louise", description: "Examen dentaire", amount: 35, currency: "USD", date: "2026-08-28", exchangeRateReference: 132.5, visitId: "visit-marie-aug28", createdAt: "2026-08-28T15:20:00.000Z" },
    { id: "charge-marie-clean", patientId: "pat-marie-louise", description: "Détartrage et prophylaxie", amount: 2500, currency: "HTG", date: "2026-08-28", exchangeRateReference: 132.5, visitId: "visit-marie-aug28", createdAt: "2026-08-28T15:20:00.000Z" },
    { id: "charge-jean-crown", patientId: "pat-jean-baptiste", description: "Couronne dentaire", amount: 180, currency: "USD", date: "2026-08-21", exchangeRateReference: 131.8, visitId: "visit-jean-aug21", createdAt: "2026-08-21T13:12:00.000Z" },
    { id: "charge-jean-clean", patientId: "pat-jean-baptiste", description: "Détartrage et prophylaxie", amount: 3000, currency: "HTG", date: "2026-08-21", exchangeRateReference: 131.8, visitId: "visit-jean-aug21", createdAt: "2026-08-21T13:12:00.000Z" },
    { id: "charge-lucas-sealant", patientId: "pat-lucas-noel", description: "Scellement des sillons", amount: 1500, currency: "HTG", date: "2026-08-29", exchangeRateReference: 132.5, visitId: "visit-lucas-aug29", createdAt: "2026-08-29T10:05:00.000Z" },
  ],
  payments: [
    { id: "payment-marie", patientId: "pat-marie-louise", amount: 20, currency: "USD", date: "2026-08-28", exchangeRateReference: 132.5, note: "Acompte", createdAt: "2026-08-28T15:25:00.000Z" },
    { id: "payment-jean", patientId: "pat-jean-baptiste", amount: 5000, currency: "HTG", date: "2026-08-21", exchangeRateReference: 131.8, note: "Paiement comptant", createdAt: "2026-08-21T13:20:00.000Z" },
    { id: "payment-lucas", patientId: "pat-lucas-noel", amount: 1500, currency: "HTG", date: "2026-08-29", exchangeRateReference: 132.5, note: "Réglé", createdAt: "2026-08-29T10:10:00.000Z" },
  ],
  attachments: [],
  staff: [
    { id: "staff-dentist", name: "Dr. Louis Juste", email: "dentist@clinique.ht", roles: ["dentist", "clinic-administrator"], active: true, lastActive: "2026-09-01T12:20:00.000Z" },
    { id: "staff-reception", name: "Nadia Charles", email: "reception@clinique.ht", roles: ["receptionist-billing"], active: true, lastActive: "2026-09-01T11:45:00.000Z" },
  ],
  procedures: [
    { id: "proc-exam", name: "Examen dentaire", nameFr: "Examen dentaire", category: "Diagnostic", active: true, defaultFeeHTG: 4500, defaultFeeUSD: 35 },
    { id: "proc-cleaning", name: "Cleaning & prophylaxis", nameFr: "Détartrage et prophylaxie", category: "Prévention", active: true, defaultFeeHTG: 3000, defaultFeeUSD: 25 },
    { id: "proc-crown", name: "Dental crown", nameFr: "Couronne dentaire", category: "Restauratif", active: true, defaultFeeHTG: 24000, defaultFeeUSD: 180 },
    { id: "proc-root-canal", name: "Root canal treatment", nameFr: "Traitement endodontique", category: "Endodontie", active: true, defaultFeeHTG: 30000, defaultFeeUSD: 225 },
    { id: "proc-filling", name: "Composite filling", nameFr: "Obturation composite", category: "Restauratif", active: true, defaultFeeHTG: 6500, defaultFeeUSD: 50 },
    { id: "proc-sealant", name: "Fissure sealant", nameFr: "Scellement des sillons", category: "Prévention", active: true, defaultFeeHTG: 1500, defaultFeeUSD: 12 },
  ],
  audit: [
    { id: "audit-1", action: "created", entity: "patient", entityId: "pat-lucas-noel", actorName: "Nadia Charles", occurredAt: "2026-08-02T08:20:00.000Z", patientId: "pat-lucas-noel" },
    { id: "audit-2", action: "created", entity: "visit", entityId: "visit-marie-aug28", actorName: "Dr. Louis Juste", occurredAt: "2026-08-28T15:20:00.000Z", patientId: "pat-marie-louise" },
    { id: "audit-3", action: "recorded", entity: "payment", entityId: "payment-lucas", actorName: "Nadia Charles", occurredAt: "2026-08-29T10:10:00.000Z", patientId: "pat-lucas-noel" },
  ],
  settings: { overdueDays: 60, clinicName: "Clinique Dentaire Lakay", defaultCurrency: "HTG" },
};

let cached: ClinicState | null = null;

export async function loadClinicState() {
  if (cached) return cached;
  const rows = await db
    .select()
    .from(clinicStateTable)
    .where(eq(clinicStateTable.id, "default"));
  if (rows[0]?.data) {
    cached = rows[0].data as ClinicState;
  } else {
    cached = structuredClone(seedState);
    await db.insert(clinicStateTable).values({ id: "default", data: cached }).onConflictDoNothing();
  }
  return cached;
}

export async function saveClinicState(state: ClinicState) {
  cached = state;
  await db
    .insert(clinicStateTable)
    .values({ id: "default", data: state, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: clinicStateTable.id,
      set: { data: state, updatedAt: new Date() },
    });
  return state;
}

export function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function auditEvent(state: ClinicState, event: Omit<any, "id" | "occurredAt">) {
  state.audit.unshift({ id: id("audit"), occurredAt: new Date().toISOString(), ...event });
}