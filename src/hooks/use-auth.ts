"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: {
    id: string;
    name: string;
    uei?: string;
    cageCode?: string;
    samRegistered: boolean;
    naicsCodes: string[];
    pscCodes: string[];
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ needsConfirmation: boolean }>;
  confirmEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refreshUser);
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }

    await refreshUser();
  };

  const register = async (data: RegisterData) => {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const responseData = await res.json();
      throw new Error(responseData.error || "Registration failed");
    }

    return { needsConfirmation: true };
  };

  const confirmEmail = async (email: string, code: string) => {
    const res = await fetch("/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Verification failed");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to send reset code");
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Password reset failed");
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    confirmEmail,
    logout,
    forgotPassword,
    resetPassword,
    refreshUser,
  };
}

export { AuthContext };
export type { User, AuthContextType };
