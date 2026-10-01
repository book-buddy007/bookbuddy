'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Define types
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'LIBRARIAN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  institution?: string;
  tenantId?: string;
  initials?: string;
  createdAt: string;
}

export interface Policies {
  canCreateUsers?: boolean;
  canDeleteUsers?: boolean;
  canEditRoles?: boolean;
  maxUsersPerInstitution?: number;
  limits?: any;
  fines?: any;
  periods?: any;
}

export interface Catalog {
  totalItems: number;
  totalCategories: number;
  lastUpdated: string;
  pendingApprovals?: any[];
  genreHierarchy?: Genre[];
  subjectTaxonomy?: Subject[];
}

// Define a generic interface for pending items
export interface PendingBook {
  id: string | number;
  title: string;
  author: string;
  isbn?: string;
  format?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy?: string;
  requestDate?: string;
  submittedBy?: string;
  submittedDate?: string;
}

// Define genre and subject types for catalog
export interface Genre {
  id: string | number;
  name: string;
  count?: number;
}

export interface Subject {
  id: string | number;
  name: string;
  count?: number;
}

// State interface
export interface AdminState {
  users: User[];
  policies: Policies;
  catalog: Catalog;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, userData: Partial<User>) => void;
  deleteUser: (id: string) => void;
  setPolicies: (policies: Partial<Policies>) => void;
  setCatalog: (catalog: Partial<Catalog>) => void;
}

// Initial state
const initialPolicies: Policies = {
  canCreateUsers: true,
  canDeleteUsers: true,
  canEditRoles: true,
  maxUsersPerInstitution: 100,
};

const initialCatalog: Catalog = {
  totalItems: 0,
  totalCategories: 0,
  lastUpdated: new Date().toISOString(),
  pendingApprovals: []
};

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Admin',
    email: 'admin@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    institution: 'Example University',
    createdAt: '2023-01-01',
  },
  {
    id: '2',
    name: 'Sarah Teacher',
    email: 'teacher@example.com',
    role: 'TEACHER',
    status: 'ACTIVE',
    institution: 'Example College',
    createdAt: '2023-01-15',
  },
  {
    id: '3',
    name: 'Michael Student',
    email: 'student@example.com',
    role: 'STUDENT',
    status: 'ACTIVE',
    institution: 'Example School',
    createdAt: '2023-02-01',
  },
  {
    id: '4',
    name: 'Super Admin',
    email: 'super@example.com',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    institution: 'System',
    createdAt: '2023-01-01',
  },
  {
    id: '5',
    name: 'Lisa Librarian',
    email: 'librarian@example.com',
    role: 'LIBRARIAN',
    status: 'ACTIVE',
    institution: 'Example Library',
    createdAt: '2023-03-01',
  },
];

// Create context with initial state
export const AdminStateContext = createContext<AdminState>({
  users: [],
  policies: initialPolicies,
  catalog: initialCatalog,
  setUsers: () => {},
  addUser: () => {},
  updateUser: () => {},
  deleteUser: () => {},
  setPolicies: () => {},
  setCatalog: () => {},
});

// Provider component
export function AdminStateProvider({ children }: { children: ReactNode }) {
  const [users, setUsersState] = useState<User[]>([...mockUsers]);
  const [policies, setPoliciesState] = useState<Policies>({ ...initialPolicies });
  const [catalog, setCatalogState] = useState<Catalog>({ ...initialCatalog });

  const setUsers = (newUsers: User[]) => {
    setUsersState(newUsers);
  };

  const addUser = (user: User) => {
    setUsersState((prev) => [...prev, user]);
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsersState((prev) => 
      prev.map((user) => (user.id === id ? { ...user, ...userData } : user))
    );
  };

  const deleteUser = (id: string) => {
    setUsersState((prev) => prev.filter((user) => user.id !== id));
  };

  const setPolicies = (newPolicies: Partial<Policies>) => {
    setPoliciesState((prev) => ({ ...prev, ...newPolicies }));
  };

  const setCatalog = (newCatalog: Partial<Catalog>) => {
    setCatalogState((prev) => ({ ...prev, ...newCatalog }));
  };

  const value: AdminState = {
    users,
    policies,
    catalog,
    setUsers,
    addUser,
    updateUser,
    deleteUser,
    setPolicies,
    setCatalog,
  };

  return (
    <AdminStateContext.Provider value={value}>
      {children}
    </AdminStateContext.Provider>
  );
}

// Hook to use the admin state
export const useAdminState = (): AdminState => {
  const context = useContext(AdminStateContext);
  if (!context) {
    throw new Error('useAdminState must be used within an AdminStateProvider');
  }
  return context;
}; 