/**
 * FindIt API Client Service Layer
 * 
 * Centralized HTTP client, JWT authentication, and diagnostics for FastAPI Backend communication.
 */

import type { Item, FilterOptions, User, ItemStats, Claim, Notification, PotentialMatch } from '../types';

export interface BackendHealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  storage_mode?: string;
  database_status: 'connected' | 'unavailable' | string;
  database_detail?: string;
}

export interface BackendStatusState {
  isOnline: boolean;
  isLoading: boolean;
  data?: BackendHealthResponse;
  error?: string;
  lastChecked?: string;
}

export interface ItemListApiResponse {
  items: Item[];
  total: number;
  skip: number;
  limit: number;
  storage_mode: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  fullName: string;
  password: string;
  confirmPassword?: string;
  campus?: string;
  role?: 'student' | 'staff' | 'admin';
  avatarUrl?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  TIMEOUT_MS: 5000,
  TOKEN_KEY: 'findit_jwt_access_token',
};

/**
 * Access token persistence helpers (stored in browser localStorage).
 * Trade-off note: Storing stateless JWTs in localStorage enables seamless SPA persistence
 * across page refreshes during development mode. Passwords are never stored.
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(API_CONFIG.TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
  } catch {
    // ignore storage quota issues
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
  } catch {
    // ignore
  }
}

function getAuthHeaders(includeJson: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Perform healthcheck against the FastAPI backend service.
 */
export async function checkBackendHealth(): Promise<{
  isOnline: boolean;
  data?: BackendHealthResponse;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const healthUrl = `${API_CONFIG.BASE_URL}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isOnline: false,
        error: `Backend responded with HTTP status ${response.status}`,
      };
    }

    const data: BackendHealthResponse = await response.json();
    return {
      isOnline: true,
      data,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    let message = 'Backend unreachable (Server offline or CORS blocked)';
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        message = 'Connection timed out (Backend not responding)';
      } else {
        message = err.message;
      }
    }
    return {
      isOnline: false,
      error: message,
    };
  }
}

/* ==============================================================================
 * AUTHENTICATION API METHODS (Milestone 3)
 * ============================================================================== */

/**
 * Register a new user account.
 */
export async function registerApi(payload: RegisterPayload): Promise<User> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      let msg = errBody.detail || `Registration failed with status ${response.status}`;
      if (Array.isArray(errBody.detail)) {
        msg = errBody.detail.map((d: { msg?: string }) => d.msg).join(', ');
      }
      throw new Error(msg);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Authenticate with email and password to receive a JWT access token.
 */
export async function loginApi(payload: LoginPayload): Promise<AuthTokenResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      let msg = errBody.detail || 'Invalid email or password.';
      if (Array.isArray(errBody.detail)) {
        msg = errBody.detail.map((d: { msg?: string }) => d.msg).join(', ');
      }
      throw new Error(msg);
    }

    const data: AuthTokenResponse = await response.json();
    if (data.access_token) {
      setStoredToken(data.access_token);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Fetch the currently authenticated user profile using the stored Bearer token.
 */
export async function fetchCurrentUserApi(): Promise<User> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token stored.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        removeStoredToken();
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(`Failed to fetch profile: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Client-side logout: notifies backend and removes local token.
 */
export async function logoutApi(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    await fetch(`${API_CONFIG.BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      signal: controller.signal,
    }).catch(() => {
      // Ignore network errors on logout
    });
    clearTimeout(timeoutId);
  } finally {
    removeStoredToken();
  }
}

/* ==============================================================================
 * ITEMS API METHODS
 * ============================================================================== */

/**
 * Retrieve items from the FastAPI backend with optional search and filters.
 */
export async function fetchItemsApi(filters?: Partial<FilterOptions>): Promise<ItemListApiResponse> {
  const url = new URL(`${API_CONFIG.BASE_URL}/items`);

  if (filters?.type && filters.type !== 'all') {
    url.searchParams.set('type', filters.type);
  }
  if (filters?.category && filters.category !== 'all') {
    url.searchParams.set('category', filters.category);
  }
  if (filters?.campus && filters.campus !== 'all') {
    url.searchParams.set('campus', filters.campus);
  }
  if (filters?.status && filters.status !== 'all') {
    url.searchParams.set('status', filters.status);
  }
  if (filters?.searchQuery && filters.searchQuery.trim()) {
    url.searchParams.set('q', filters.searchQuery.trim());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch items: HTTP ${response.status}`);
    }

    const data: ItemListApiResponse = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Retrieve items submitted by the currently authenticated user.
 */
export async function fetchMyItemsApi(filters?: Partial<FilterOptions>): Promise<ItemListApiResponse> {
  const url = new URL(`${API_CONFIG.BASE_URL}/items/my-listings`);

  if (filters?.type && filters.type !== 'all') {
    url.searchParams.set('type', filters.type);
  }
  if (filters?.status && filters.status !== 'all') {
    url.searchParams.set('status', filters.status);
  }
  if (filters?.searchQuery && filters.searchQuery.trim()) {
    url.searchParams.set('q', filters.searchQuery.trim());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch user listings: HTTP ${response.status}`);
    }

    const data: ItemListApiResponse = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Retrieve platform and user listing aggregate statistics.
 */
export async function fetchItemStatsApi(): Promise<ItemStats> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/items/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}


/**
 * Fetch a single item by its ID.
 */
export async function fetchItemByIdApi(id: string): Promise<Item> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/items/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Item with ID "${id}" was not found.`);
      }
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.detail || `Failed to fetch item: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Submit a new item to the backend.
 */
export async function createItemApi(
  payload: Omit<Item, 'id' | 'createdAt' | 'status' | 'isDemo'>
): Promise<Item> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/items`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        removeStoredToken();
        throw new Error('Your session has expired. Please sign in again.');
      }
      const errBody = await response.json().catch(() => ({}));
      let msg = errBody.detail || `Failed to create item: HTTP ${response.status}`;
      if (Array.isArray(errBody.detail)) {
        msg = errBody.detail.map((d: { msg?: string }) => d.msg).join(', ');
      }
      throw new Error(msg);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Partially update an existing item.
 */
export async function updateItemApi(id: string, updates: Partial<Item>): Promise<Item> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/items/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updates),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        removeStoredToken();
        throw new Error('Session expired. Please log in again.');
      }
      const errBody = await response.json().catch(() => ({}));
      let msg = errBody.detail || `Failed to update item: HTTP ${response.status}`;
      if (Array.isArray(errBody.detail)) {
        msg = errBody.detail.map((d: { msg?: string }) => d.msg).join(', ');
      }
      throw new Error(msg);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Delete an item from the backend.
 */
export async function deleteItemApi(id: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        removeStoredToken();
        throw new Error('Session expired. Please log in again.');
      }
      const errBody = await response.json().catch(() => ({}));
      let msg = errBody.detail || `Failed to delete item: HTTP ${response.status}`;
      if (Array.isArray(errBody.detail)) {
        msg = errBody.detail.map((d: { msg?: string }) => d.msg).join(', ');
      }
      throw new Error(msg);
    }

    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// =============================================================================
// Claim Management & Return Coordination APIs (Milestone 7)
// =============================================================================

export interface SubmitClaimPayload {
  itemId: string;
  description: string;
  proofDetails?: string;
  proofDescription?: string;
}

export interface ReviewClaimPayload {
  status: 'under_review' | 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface HandoverClaimPayload {
  handoverStatus: 'awaiting_handover' | 'handover_arranged' | 'returned_successfully';
  handoverDetails?: string;
}

export interface CompleteClaimPayload {
  completionNotes?: string;
}

export async function fetchMyClaimsApi(statusFilter?: string): Promise<Claim[]> {
  const url = new URL(`${API_CONFIG.BASE_URL}/claims/my-claims`);
  if (statusFilter && statusFilter !== 'all') {
    url.searchParams.set('status', statusFilter);
  }

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch submitted claims.');
  }

  const data = await response.json();
  return data.claims || [];
}

export async function fetchReceivedClaimsApi(statusFilter?: string): Promise<Claim[]> {
  const url = new URL(`${API_CONFIG.BASE_URL}/claims/received`);
  if (statusFilter && statusFilter !== 'all') {
    url.searchParams.set('status', statusFilter);
  }

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch received claims.');
  }

  const data = await response.json();
  return data.claims || [];
}

export async function getClaimByIdApi(claimId: string): Promise<Claim> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/claims/${claimId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to retrieve claim details.');
  }

  return await response.json();
}

export async function submitClaimApi(payload: SubmitClaimPayload): Promise<Claim> {
  const body = {
    itemId: payload.itemId,
    description: payload.description,
    proofDetails: payload.proofDetails || payload.proofDescription,
  };

  const response = await fetch(`${API_CONFIG.BASE_URL}/claims`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again to claim items.');
    }
    const err = await response.json().catch(() => ({}));
    let msg = err.detail || 'Failed to submit claim request.';
    if (Array.isArray(err.detail)) {
      msg = err.detail.map((d: { msg?: string }) => d.msg).join(', ');
    }
    throw new Error(msg);
  }

  return await response.json();
}

export async function reviewClaimApi(claimId: string, payload: ReviewClaimPayload): Promise<Claim> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/claims/${claimId}/review`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit claim review.');
  }

  return await response.json();
}

export async function updateHandoverApi(claimId: string, payload: HandoverClaimPayload): Promise<Claim> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/claims/${claimId}/handover`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update handover coordination.');
  }

  return await response.json();
}

export async function completeReturnApi(claimId: string, payload?: CompleteClaimPayload): Promise<Claim> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/claims/${claimId}/complete`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to confirm item return.');
  }

  return await response.json();
}

export async function cancelClaimApi(claimId: string): Promise<Claim> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/claims/${claimId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to cancel claim.');
  }

  return await response.json();
}

// =============================================================================
// In-App Notification System APIs (Milestone 7)
// =============================================================================

export interface NotificationListResult {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export async function fetchNotificationsApi(skip: number = 0, limit: number = 50): Promise<NotificationListResult> {
  const url = new URL(`${API_CONFIG.BASE_URL}/notifications`);
  url.searchParams.set('skip', String(skip));
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Session expired.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch notifications.');
  }

  const data = await response.json();
  const notifs = (data.notifications || []).map((n: Record<string, unknown>) => ({
    ...n,
    read: n.isRead ?? n.read ?? false,
    timestamp: n.createdAt ?? n.timestamp ?? '',
    type: n.notificationType ?? n.type ?? 'system',
  }));

  return {
    notifications: notifs,
    total: data.total ?? notifs.length,
    unreadCount: data.unreadCount ?? 0,
  };
}

export async function fetchUnreadNotifCountApi(): Promise<number> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/unread-count`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) return 0;
    const data = await response.json();
    return data.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationReadApi(id: string): Promise<Notification> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to mark notification as read.');
  }

  const n = await response.json();
  return {
    ...n,
    read: n.isRead ?? n.read ?? true,
    timestamp: n.createdAt ?? n.timestamp ?? '',
    type: n.notificationType ?? n.type ?? 'system',
  };
}

export async function markAllNotificationsReadApi(): Promise<number> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/mark-all-read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to mark notifications as read.');
  }

  const data = await response.json();
  return data.count ?? 0;
}

export async function deleteNotificationApi(id: string): Promise<boolean> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return response.ok;
}

// ============================================================================
// 6. AI MATCHES API
// ============================================================================

export interface FetchMatchesParams {
  tier?: string;
  minScore?: number;
  category?: string;
  feedback?: string;
  itemId?: string;
  lostItemId?: string;
  foundItemId?: string;
  skip?: number;
  limit?: number;
}

export interface MatchesResponse {
  matches: PotentialMatch[];
  total: number;
  strongCount: number;
  possibleCount: number;
  weakCount: number;
}

export async function fetchMatchesApi(params?: FetchMatchesParams): Promise<MatchesResponse> {
  const url = new URL(`${API_CONFIG.BASE_URL}/matches`);
  if (params?.tier && params.tier !== 'all') url.searchParams.set('tier', params.tier);
  if (params?.minScore) url.searchParams.set('min_score', params.minScore.toString());
  if (params?.category && params.category !== 'all') url.searchParams.set('category', params.category);
  if (params?.feedback && params.feedback !== 'all') url.searchParams.set('feedback', params.feedback);
  if (params?.itemId) url.searchParams.set('item_id', params.itemId);
  if (params?.lostItemId) url.searchParams.set('lost_item_id', params.lostItemId);
  if (params?.foundItemId) url.searchParams.set('found_item_id', params.foundItemId);
  if (params?.skip) url.searchParams.set('skip', params.skip.toString());
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch AI matches.');
  }

  const data = await response.json();
  const transformedMatches: PotentialMatch[] = (data.matches || []).map((m: any) => ({
    ...m,
    similarityScore: m.overallScore ?? m.similarityScore ?? 0,
    matchReasons: m.reasons || (m.explanation ? [m.explanation] : []),
    generatedAt: m.createdAt || '',
  }));

  return {
    matches: transformedMatches,
    total: data.total ?? transformedMatches.length,
    strongCount: data.strongCount ?? 0,
    possibleCount: data.possibleCount ?? 0,
    weakCount: data.weakCount ?? 0,
  };
}

export async function submitMatchFeedbackApi(
  matchId: string,
  feedback: 'relevant' | 'not_relevant' | 'already_recovered' | 'duplicate',
  notes?: string
): Promise<PotentialMatch> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/matches/${matchId}/feedback`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ feedback, notes }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit match feedback.');
  }

  const m = await response.json();
  return {
    ...m,
    similarityScore: m.overallScore ?? m.similarityScore ?? 0,
    matchReasons: m.reasons || (m.explanation ? [m.explanation] : []),
    generatedAt: m.createdAt || '',
  };
}

export async function updateMatchStatusApi(
  matchId: string,
  status: 'suggested' | 'viewed' | 'dismissed' | 'claimed'
): Promise<PotentialMatch> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/matches/${matchId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update match status.');
  }

  const m = await response.json();
  return {
    ...m,
    similarityScore: m.overallScore ?? m.similarityScore ?? 0,
    matchReasons: m.reasons || (m.explanation ? [m.explanation] : []),
    generatedAt: m.createdAt || '',
  };
}

export async function generateMatchesApi(): Promise<{ generatedCount: number; updatedCount: number; message: string }> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/matches/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to run match generator.');
  }

  return response.json();
}


