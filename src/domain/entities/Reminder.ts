export interface Reminder {
  id: string;
  title: string;
  triggerTime: string; // ISO string
  isCompleted: boolean;
}
