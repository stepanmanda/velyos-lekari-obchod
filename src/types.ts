export type Specialty = "Praktik" | "Pediatrie" | "Gynekologie" | "Stomatologie";
export type LeadPriority = "A" | "B" | "C";

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
  status: LeadStatus;
  notes: string;
  nextFollowUp: string;
  meetingAt: string;
  meetingChannel?: "Osobně" | "Online";
  lastContact: string;
  attempts: number;
  logs: CallLog[];
};
