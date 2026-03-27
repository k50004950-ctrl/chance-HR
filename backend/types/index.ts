import type { Request, Response, NextFunction } from 'express';

// ===== User & Auth Types =====

export type UserRole = 'worker' | 'owner' | 'admin' | 'super_admin';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  workplace_id?: number;
  phone?: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

// ===== Employee Types =====

export type EmploymentStatus = 'active' | 'resigned';
export type SalaryType = 'hourly' | 'monthly' | 'annual';

export interface Employee {
  id: number;
  name: string;
  username: string;
  hire_date: string;
  employment_status: EmploymentStatus;
  salary_type?: SalaryType;
  hourly_rate?: number;
  monthly_salary?: number;
  annual_salary?: number;
  workplace_id: number;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  visa_type?: string;
  ssn_encrypted?: string;
  is_deleted?: boolean;
}

// ===== API Response Types =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  limit?: number;
}

// ===== Plan Types =====

export type PlanType = 'free' | 'premium';

export interface SubscriptionPlan {
  id: number;
  workplace_id: number;
  plan_type: PlanType;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

export type PremiumFeature =
  | 'excel_import'
  | 'email'
  | 'contracts'
  | 'manual_calc'
  | 'community'
  | 'push';

// ===== Middleware Types =====

export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;
export type AsyncMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;

// ===== Redis / Memory Store Types =====

export interface MemoryStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<string>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  sendCommand(command: string, ...args: any[]): Promise<any>;
  call(...args: any[]): Promise<any>;
  _setTTL(key: string, ms: number): void;
  _isMemoryFallback: boolean;
}

// ===== Database Helper Types =====

export interface DatabaseRow {
  [key: string]: any;
}
