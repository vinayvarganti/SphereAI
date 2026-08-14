import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoaded: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AUTH_KEY = 'agentsphere_auth';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1';

interface StoredSession {
  user: AuthUser;
  token: string;
}

/**
 * Validates that a token is a proper HS256 JWT (3-part base64url structure)
 * and has not expired. This catches old btoa() fake tokens.
 */
function isValidJwt(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // Decode base64url payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.sub) return false;
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore session from localStorage — clear if token is stale/invalid
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const session: StoredSession = JSON.parse(raw);
        if (session.token && isValidJwt(session.token)) {
          // Valid JWT — restore session
          setUser(session.user);
          setToken(session.token);
        } else {
          // Stale/malformed token (e.g., old btoa() format) — clear it
          console.warn('Stored auth token is invalid or expired. Clearing session.');
          localStorage.removeItem(AUTH_KEY);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const persistSession = (user: AuthUser, token: string) => {
    const session: StoredSession = { user, token };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    setUser(user);
    setToken(token);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid email or password. Please try again.');
    }

    const data = await res.json();
    const authUser: AuthUser = { id: data.user_id, name: data.name, email: data.email };
    persistSession(authUser, data.token);
  };

  const signup = async (name: string, email: string, password: string) => {
    if (!name.trim()) throw new Error('Full name is required.');
    if (!email.trim()) throw new Error('Email address is required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Sign up failed. Please try again.');
    }

    const data = await res.json();
    const authUser: AuthUser = { id: data.user_id, name: data.name, email: data.email };
    persistSession(authUser, data.token);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoaded, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
