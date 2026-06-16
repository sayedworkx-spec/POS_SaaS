export interface AuditLog {
  id: number;
  action: string;
  username: string;
  details: string;
  createdAt: string;
}