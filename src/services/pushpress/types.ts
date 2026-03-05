// PushPress Platform API types

export interface PPClass {
  id: string;
  coachUuid: string | null;
  assistantCoachUuid: string | null;
  company: string | null;
  title: string | null;
  classTypeName: string | null;
  locationUuid: string | null;
  location: { name: string } | null;
  reservations: PPReservation[];
  start: number; // Unix seconds
  end: number;   // Unix seconds
}

export interface PPClassType {
  id: string;
  companyId: string;
  name: string;
  color: string | null; // hex e.g. "#E63946"
  description: string | null;
  active: boolean;
}

export interface PPReservation {
  id: string;
  reservedId: string;
  customerId: string | null;
  companyId: string | null;
  registrationTimestamp: number;
  status: 'waitlisted' | 'checked-in' | 'reserved' | 'canceled' | 'late-canceled';
}

export interface PPEvent {
  id: string;
  coachUuid: string | null;
  access: 'invite_only' | 'open';
  assistantCoachUuid: string | null;
  company: string | null;
  title: string | null;
  locationUuid: string | null;
  location: { name: string } | null;
  reservations: PPReservation[];
  start: number;
  end: number;
  isAllDay: boolean;
}

// Transformed shape used by our schedule endpoint
export interface ScheduleClass {
  id: string;
  title: string;
  typeName: string | null;
  typeColor: string;
  date: string;       // "2026-03-06"
  dayLabel: string;   // "Thu, Mar 6"
  timeStart: string;  // "6:00 AM"
  timeEnd: string;    // "7:00 AM"
  durationMin: number;
  location: string | null;
}

// Legacy stub type (kept for backwards compat)
export interface GymProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  staff: { name: string; role: string; bio?: string }[];
  classes: { name: string; schedule: string; description?: string }[];
}
