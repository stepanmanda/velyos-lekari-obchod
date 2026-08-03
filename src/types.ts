export type Specialty = "Praktik" | "Pediatrie" | "Gynekologie" | "Stomatologie" | "ORL";
export type LeadPriority = "A" | "B" | "C";
export type OpeningHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", string[]>;
export type OfferMode = "auto" | "web" | "medvision" | "web_medvision";
export type CallScript = {
  gatekeeper: string;
  intro: string;
  questions: string[];
  value: string;
  close: string;
  finalNote: string;
};

export type LeadStatus =
  | "Nevoláno"
  | "Nedovoláno"
  | "Zavolat znovu"
  | "Poslat informace"
  | "Schůzka"
  | "Nezájem"
  | "Špatný kontakt"
  | "Nevolat";

export type CallLog = {
  id: string;
  at: string;
  outcome: LeadStatus;
  note: string;
  followUp?: string;
  meetingAt?: string;
  channel?: "Osobně" | "Online";
};

export type Lead = {
  id: string;
  sourceLeadId: string;
  providerIco: string;
  name: string;
  provider: string;
  specialty: Specialty;
  segments: string[];
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  webStatus: string;
  onlineBooking: string;
  bookingSystem: string;
  patientPortal: string;
  representative: string;
  targetType: string;
  digitalScore: number;
  digitalStatus: string;
  webOpportunityScore: number;
  medvisionFitScore: number;
  commercialScore: number;
  priority: LeadPriority;
  recommendedOffer: string;
  priorityReason: string;
  recommendedNextStep: string;
  contactConfidence: string;
  researchStatus: string;
  acceptsNewPatients: string;
  mapProfileUrl: string;
  googleMapsUrl: string;
  auditedAt: string;
  openingHours: OpeningHours;
  openingHoursSource: string;
  openingHoursConfidence: string;
  openingHoursAuditedAt: string;
  offerMode: OfferMode;
  scriptOverrides: Partial<Record<OfferMode, Partial<CallScript>>>;
  status: LeadStatus;
  notes: string;
  nextFollowUp: string;
  meetingAt: string;
  meetingChannel?: "Osobně" | "Online";
  lastContact: string;
  attempts: number;
  logs: CallLog[];
};
