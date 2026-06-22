export type UserRole = 'owner' | 'manager' | 'employee';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  organizationId?: string;
  avatar?: string;
  isEmailVerified: boolean;
  preferences?: {
    darkMode: boolean;
    language: string;
    notificationChannels: { sms: boolean; email: boolean; whatsapp: boolean };
  };
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  timezone: string;
  scheduleStartDay: string;
  overtimeThreshold: number;
  laborCostSettings?: {
    hourlyWageEnabled?: boolean;
    overtimeMultiplier?: number;
    currency?: string;
  };
  notificationPreferences: Record<string, boolean>;
  branding: { primaryColor: string; secondaryColor: string; accentColor: string };
}

export interface Location {
  _id: string;
  name: string;
  address?: { street?: string; city?: string; province?: string; postalCode?: string };
  phone?: string;
  managerIds?: User[];
  isActive: boolean;
  operatingHours?: import('../utils/operating-hours').OperatingHours;
}

export interface EmployeeProfile {
  _id: string;
  userId?: User;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  hourlyWage?: number;
  hoursThisWeek?: number;
  availableLocationIds: Location[];
  preferredLocationIds?: Location[];
  employmentStatus: string;
  emergencyContact?: { name: string; phone: string; relationship: string };
  certifications?: Certification[];
}

export interface Certification {
  type: string;
  name?: string;
  issuedDate?: string;
  expiryDate?: string;
  isExpired?: boolean;
}

export interface Shift {
  _id: string;
  scheduleId?: string;
  locationId: Location | string;
  employeeId?: EmployeeProfile | string;
  userId?: User;
  date: string;
  startTime: string;
  endTime: string;
  breakLength?: number;
  notes?: string;
  status: string;
  isOpenShift?: boolean;
  totalHours?: number;
  laborCost?: number;
}

export function employeeDisplayName(emp?: EmployeeProfile | null, user?: User | null): string {
  if (emp?.firstName) return `${emp.firstName} ${emp.lastName || ''}`.trim();
  if (user?.firstName) return `${user.firstName} ${user.lastName}`.trim();
  if (emp?.userId && typeof emp.userId === 'object') {
    return `${emp.userId.firstName} ${emp.userId.lastName}`.trim();
  }
  return 'Unassigned';
}

export function isHourlyWageEnabled(org?: Organization | null): boolean {
  return org?.laborCostSettings?.hourlyWageEnabled === true;
}

export interface Schedule {
  _id: string;
  locationId: Location;
  weekStartDate: string;
  weekEndDate: string;
  isPublished: boolean;
  totalScheduledHours?: number;
  totalLaborCost?: number;
}

export interface TimeOffRequest {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  userId: User;
  reviewComments?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeLocations: number;
  upcomingShifts: number;
  openShifts: number;
  pendingTimeOffRequests: number;
  laborCostThisWeek: number;
  hoursScheduled: number;
  overtimeHours: number;
  estimatedPayroll: number;
  weekStart: string;
  weekEnd: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: { page: number; limit: number; total: number };
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
}
