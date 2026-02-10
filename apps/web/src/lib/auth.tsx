import { PublicClientApplication, type AuthenticationResult, type AccountInfo } from '@azure/msal-browser';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { UserProfile } from '../types';

interface AuthContextValue {
  token: string | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const defaultPopupRedirectUri = `${window.location.origin}/auth/popup-callback.html`;
const configuredRedirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI;
const redirectUri = (() => {
  if (!configuredRedirectUri) return defaultPopupRedirectUri;
  try {
    const parsed = new URL(configuredRedirectUri, window.location.origin);
    const isSameOrigin = parsed.origin === window.location.origin;
    const isPopupCallbackPath = parsed.pathname === '/auth/popup-callback.html';
    return isSameOrigin && isPopupCallbackPath ? parsed.toString() : defaultPopupRedirectUri;
  } catch {
    return defaultPopupRedirectUri;
  }
})();
const postLogoutRedirectUri = import.meta.env.VITE_AZURE_POST_LOGOUT_REDIRECT_URI || window.location.origin;

const isAzureConfigured = Boolean(tenantId && clientId);
const msalApp = isAzureConfigured
  ? new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri,
        postLogoutRedirectUri
      },
      cache: {
        cacheLocation: 'localStorage'
      }
    })
  : null;

const loginRequest = {
  scopes: ['openid', 'profile', 'email']
};

function shouldFallbackToRedirect(error: unknown): boolean {
  const errorCode = typeof error === 'object' && error && 'errorCode' in error ? String(error.errorCode).toLowerCase() : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const detail = `${errorCode} ${message}`;
  return (
    detail.includes('popup_window_error') ||
    detail.includes('popup_window_open_error') ||
    detail.includes('empty_window_error') ||
    detail.includes('monitor_window_timeout')
  );
}

function extractToken(result: AuthenticationResult | null): string | null {
  return result?.idToken ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (jwt: string | null) => {
    if (!jwt) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const result = await api.me(jwt);
      setProfile(result.user);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const acquireTokenForAccount = async (account: AccountInfo | null): Promise<string | null> => {
    if (!msalApp || !account) return null;
    try {
      const result = await msalApp.acquireTokenSilent({ ...loginRequest, account });
      return extractToken(result);
    } catch {
      const result = await msalApp.acquireTokenPopup(loginRequest);
      return extractToken(result);
    }
  };

  useEffect(() => {
    if (!msalApp) {
      setLoading(false);
      return;
    }

    void (async () => {
      await msalApp.initialize();
      const redirectResult = await msalApp.handleRedirectPromise();
      const account = redirectResult?.account ?? msalApp.getActiveAccount() ?? msalApp.getAllAccounts()[0] ?? null;
      if (account) {
        msalApp.setActiveAccount(account);
      }
      const nextToken = await acquireTokenForAccount(account);
      setToken(nextToken);
      await loadProfile(nextToken);
    })();
  }, []);

  const value = useMemo(
    () => ({
      token,
      profile,
      loading,
      login: async () => {
        if (!msalApp) {
          throw new Error('Azure auth is not configured');
        }
        setLoading(true);
        try {
          const result = await msalApp.loginPopup({ ...loginRequest, redirectUri });
          if (result.account) msalApp.setActiveAccount(result.account);
          const nextToken = extractToken(result);
          setToken(nextToken);
          await loadProfile(nextToken);
        } catch (error) {
          if (shouldFallbackToRedirect(error)) {
            await msalApp.loginRedirect(loginRequest);
            return;
          }
          setLoading(false);
          throw error;
        }
      },
      logout: async () => {
        if (!msalApp) return;
        setLoading(true);
        setToken(null);
        setProfile(null);
        await msalApp.logoutPopup({
          account: msalApp.getActiveAccount() ?? undefined,
          postLogoutRedirectUri
        });
        setLoading(false);
      },
      refreshProfile: async () => {
        if (!msalApp) return;
        const account = msalApp.getActiveAccount() ?? msalApp.getAllAccounts()[0] ?? null;
        const nextToken = await acquireTokenForAccount(account);
        setToken(nextToken);
        await loadProfile(nextToken);
      }
    }),
    [token, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
