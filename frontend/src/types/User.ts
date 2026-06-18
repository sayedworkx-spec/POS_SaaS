export type UserRole = "admin" | "cashier" | "warehouse";

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}