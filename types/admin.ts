export interface Institution {
  id: string;
  name: string;
  domain: string;
  description?: string;
  location?: string;
  isActive?: boolean;
  metadata?: any;
  branding?: BrandingConfig;
  createdAt: string;
  updatedAt: string;
  subscription?: Subscription;
  subscriptionId?: string;
}

export interface Subscription {
  id: string;
  name: string;
  tier: 'basic' | 'standard' | 'premium';
  price?: number;
  maxUsers?: number;
  maxBooks?: number;
  features?: SubscriptionFeatures;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionFeatures {
  audiobooks?: boolean;
  ebooks?: boolean;
  annotations?: boolean;
  sharing?: boolean;
  customBranding?: boolean;
  adminDashboard?: boolean;
  analytics?: boolean;
  [key: string]: boolean | undefined;
}

export interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
  customCss?: string;
  [key: string]: string | undefined;
}

export interface UserAdmin {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'librarian' | 'admin' | 'super-admin';
  createdAt: string;
  updatedAt: string;
  institution?: Institution;
  institutionId?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: UserAdmin;
  action: string;
  entityType?: string;
  entityId?: string;
  tenantId?: string;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  metadata?: any;
  createdAt: string;
}

export interface AdminApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
} 