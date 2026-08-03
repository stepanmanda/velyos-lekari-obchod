export type Specialty = "Praktik" | "Gynekologie" | "Stomatologie";

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
  name: string;
  provider: string;
  specialty: Specialty;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  representative: string;
  status: LeadStatus;
  notes: string;
  nextFollowUp: string;
  meetingAt: string;
  meetingChannel?: "Osobně" | "Online";
  lastContact: string;
  attempts: number;
  logs: CallLog[];
};
