export interface GymProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  staff: { name: string; role: string; bio?: string }[];
  classes: { name: string; schedule: string; description?: string }[];
}
