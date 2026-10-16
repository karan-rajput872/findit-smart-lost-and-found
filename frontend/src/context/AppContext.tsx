import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Item, User, Claim, Notification, PotentialMatch, ItemStatus, ClaimStatus, ItemStats, HandoverStatus, ConversationSummary } from '../types';
import { INITIAL_ITEMS, DEMO_USER, DEMO_NOTIFICATIONS, DEMO_CLAIMS, DEMO_POTENTIAL_MATCHES } from '../data/mockData';
import {
  checkBackendHealth,
  fetchItemsApi,
  fetchMyItemsApi,
  fetchItemStatsApi,
  createItemApi,
  updateItemApi,
  deleteItemApi,
  registerApi,
  loginApi,
  fetchCurrentUserApi,
  logoutApi,
  getStoredToken,
  removeStoredToken,
  fetchMyClaimsApi,
  fetchReceivedClaimsApi,
  submitClaimApi,
  reviewClaimApi,
  updateHandoverApi,
  completeReturnApi,
  cancelClaimApi,
  updateContactProfileApi,
  setContactConsentApi,
  fetchActiveConversationsApi,
  type UpdateContactPayload,
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  fetchMatchesApi,
  submitMatchFeedbackApi,
  updateMatchStatusApi,
  generateMatchesApi,
  type FetchMatchesParams,
  type BackendStatusState,
  type LoginPayload,
  type RegisterPayload,
  type SubmitClaimPayload,
} from '../services/api';

interface AppContextType {
  items: Item[];
  myItems: Item[];
  stats: ItemStats | null;
  user: User;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  claims: Claim[];
  myClaims: Claim[];
  receivedClaims: Claim[];
  isLoadingClaims: boolean;
  notifications: Notification[];
  unreadNotifCount: number;
  potentialMatches: PotentialMatch[];
  isLoadingMatches: boolean;
  matchCounts: { total: number; strongCount: number; possibleCount: number; weakCount: number };
  fetchPotentialMatches: (params?: FetchMatchesParams) => Promise<void>;
  submitMatchFeedback: (matchId: string, feedback: 'relevant' | 'not_relevant' | 'already_recovered' | 'duplicate', notes?: string) => Promise<void>;
  updateMatchStatus: (matchId: string, status: 'suggested' | 'viewed' | 'dismissed' | 'claimed') => Promise<void>;
  triggerMatchGeneration: () => Promise<{ generatedCount: number; updatedCount: number; message: string }>;
  isBackendOnline: boolean;
  isLoadingItems: boolean;
  isLoadingMyItems: boolean;
  backendError: string | null;
  storageMode: string;
  backendStatus: BackendStatusState;
  refreshBackendData: () => Promise<void>;
  fetchMyItems: () => Promise<void>;
  fetchMyClaims: (status?: string) => Promise<void>;
  fetchReceivedClaims: (status?: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  addItem: (newItem: Omit<Item, 'id' | 'createdAt' | 'status' | 'isDemo'>) => Promise<string>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  updateItemStatus: (id: string, status: ItemStatus) => Promise<void>;
  submitClaim: (claimData: SubmitClaimPayload) => Promise<Claim>;
  reviewClaim: (id: string, payload: { status: 'under_review' | 'approved' | 'rejected'; reviewNotes?: string }) => Promise<Claim>;
  updateHandover: (id: string, payload: { handoverStatus: HandoverStatus; handoverDetails?: string }) => Promise<Claim>;
  completeReturn: (id: string, payload?: { completionNotes?: string }) => Promise<Claim>;
  cancelClaim: (id: string) => Promise<Claim>;
  updateClaimStatus: (id: string, status: ClaimStatus) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  activeConversations: ConversationSummary[];
  unreadMessagesCount: number;
  refreshActiveConversations: () => Promise<void>;
  updateContactProfile: (payload: UpdateContactPayload) => Promise<User>;
  setContactConsent: (claimId: string, consent: boolean) => Promise<Claim>;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ITEMS: 'findit_items_v1',
  CLAIMS: 'findit_claims_v1',
  NOTIFS: 'findit_notifs_v1',
  USER: 'findit_active_user_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_ITEMS;
  });

  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEMO_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getStoredToken());
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const [myClaims, setMyClaims] = useState<Claim[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLAIMS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEMO_CLAIMS;
  });

  const [receivedClaims, setReceivedClaims] = useState<Claim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState<boolean>(false);

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEMO_NOTIFICATIONS;
  });

  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>(DEMO_POTENTIAL_MATCHES);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [matchCounts, setMatchCounts] = useState<{ total: number; strongCount: number; possibleCount: number; weakCount: number }>({
    total: 0,
    strongCount: 0,
    possibleCount: 0,
    weakCount: 0,
  });

  const [activeConversations, setActiveConversations] = useState<ConversationSummary[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<ItemStats | null>(null);

  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(false);
  const [isLoadingMyItems, setIsLoadingMyItems] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<string>('sqlite');

  const [backendStatus, setBackendStatus] = useState<BackendStatusState>({
    isOnline: false,
    isLoading: true,
  });

  const fetchMyItems = useCallback(async () => {
    if (!getStoredToken()) return;
    setIsLoadingMyItems(true);
    try {
      const myData = await fetchMyItemsApi();
      setMyItems(myData.items);
    } catch (err) {
      console.warn('Could not fetch user listings via API:', err);
    } finally {
      setIsLoadingMyItems(false);
    }
  }, []);

  const fetchMyClaims = useCallback(async (statusFilter?: string) => {
    if (!getStoredToken()) return;
    setIsLoadingClaims(true);
    try {
      const claimsData = await fetchMyClaimsApi(statusFilter);
      setMyClaims(claimsData);
    } catch (err) {
      console.warn('Could not fetch submitted claims:', err);
    } finally {
      setIsLoadingClaims(false);
    }
  }, []);

  const fetchReceivedClaims = useCallback(async (statusFilter?: string) => {
    if (!getStoredToken()) return;
    setIsLoadingClaims(true);
    try {
      const claimsData = await fetchReceivedClaimsApi(statusFilter);
      setReceivedClaims(claimsData);
    } catch (err) {
      console.warn('Could not fetch received claims:', err);
    } finally {
      setIsLoadingClaims(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const data = await fetchNotificationsApi(0, 50);
      setNotifications(data.notifications);
      setUnreadNotifCount(data.unreadCount);
    } catch (err) {
      console.warn('Could not fetch notifications:', err);
    }
  }, []);

  const fetchPotentialMatches = useCallback(async (params?: FetchMatchesParams) => {
    if (!getStoredToken()) return;
    setIsLoadingMatches(true);
    try {
      const res = await fetchMatchesApi(params);
      setPotentialMatches(res.matches);
      setMatchCounts({
        total: res.total,
        strongCount: res.strongCount,
        possibleCount: res.possibleCount,
        weakCount: res.weakCount,
      });
    } catch (err) {
      console.warn('Could not fetch AI matches from backend:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  const submitMatchFeedback = useCallback(async (
    matchId: string,
    feedback: 'relevant' | 'not_relevant' | 'already_recovered' | 'duplicate',
    notes?: string
  ) => {
    const updated = await submitMatchFeedbackApi(matchId, feedback, notes);
    setPotentialMatches(prev => prev.map(m => m.id === matchId ? { ...m, feedback: updated.feedback, feedbackNotes: updated.feedbackNotes } : m));
  }, []);

  const updateMatchStatus = useCallback(async (
    matchId: string,
    status: 'suggested' | 'viewed' | 'dismissed' | 'claimed'
  ) => {
    const updated = await updateMatchStatusApi(matchId, status);
    setPotentialMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: updated.status } : m));
  }, []);

  const triggerMatchGeneration = useCallback(async () => {
    setIsLoadingMatches(true);
    try {
      const res = await generateMatchesApi();
      await fetchPotentialMatches();
      return res;
    } finally {
      setIsLoadingMatches(false);
    }
  }, [fetchPotentialMatches]);

  const refreshActiveConversations = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const convs = await fetchActiveConversationsApi();
      setActiveConversations(convs);
    } catch {
      // ignore
    }
  }, []);

  const refreshBackendData = useCallback(async () => {
    setIsLoadingItems(true);
    setBackendError(null);

    const health = await checkBackendHealth();
    setBackendStatus({
      isOnline: health.isOnline,
      isLoading: false,
      data: health.data,
      error: health.error,
      lastChecked: new Date().toLocaleTimeString(),
    });

    if (health.isOnline) {
      if (health.data?.storage_mode) {
        setStorageMode(health.data.storage_mode);
      }
      try {
        const itemData = await fetchItemsApi();
        if (Array.isArray(itemData.items)) {
          setItems(itemData.items);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error fetching backend items';
        setBackendError(msg);
      }
      try {
        const statsData = await fetchItemStatsApi();
        setStats(statsData);
      } catch {
        // ignore
      }
      if (getStoredToken()) {
        fetchMyItems();
        fetchMyClaims();
        fetchReceivedClaims();
        fetchNotifications();
        fetchPotentialMatches();
        refreshActiveConversations();
      }
    }

    setIsLoadingItems(false);
  }, [fetchMyItems, fetchMyClaims, fetchReceivedClaims, fetchNotifications, fetchPotentialMatches, refreshActiveConversations]);

  // Rehydrate authenticated user session on mount
  useEffect(() => {
    async function rehydrateSession() {
      setIsLoadingAuth(true);
      const token = getStoredToken();
      if (!token) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUserApi();
        setUser(currentUser);
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      } catch (err) {
        console.warn('Session rehydration failed or token expired:', err);
        removeStoredToken();
        localStorage.removeItem(STORAGE_KEYS.USER);
        setUser(DEMO_USER);
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    rehydrateSession();
    refreshBackendData();
  }, [refreshBackendData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(myClaims));
    } catch {
      // ignore
    }
  }, [myClaims]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const login = async (payload: LoginPayload): Promise<void> => {
    const authData = await loginApi(payload);
    setUser(authData.user);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authData.user));
    await refreshBackendData();
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    await registerApi(payload);
    await login({
      email: payload.email,
      password: payload.password,
    });
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Backend logout warning:', err);
    }
    removeStoredToken();
    setUser(DEMO_USER);
    setIsAuthenticated(false);
    setMyItems([]);
    setMyClaims([]);
    setReceivedClaims([]);
    setNotifications([]);
    setUnreadNotifCount(0);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const addItem = async (newItem: Omit<Item, 'id' | 'createdAt' | 'status' | 'isDemo'>): Promise<string> => {
    const created = await createItemApi({
      ...newItem,
      reporterName: newItem.reporterName || user.fullName,
      reporterContact: newItem.reporterContact || user.email,
    });

    setItems((prev) => [created, ...prev]);
    setMyItems((prev) => [created, ...prev]);

    if (backendStatus.isOnline) {
      fetchItemStatsApi().then(setStats).catch(() => {});
    }

    return created.id;
  };

  const updateItem = async (id: string, updates: Partial<Item>): Promise<Item> => {
    let updated: Item;
    if (backendStatus.isOnline) {
      updated = await updateItemApi(id, updates);
    } else {
      const current = items.find((i) => i.id === id);
      if (!current) throw new Error('Item not found');
      updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    }

    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    setMyItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    if (backendStatus.isOnline) {
      fetchItemStatsApi().then(setStats).catch(() => {});
    }

    return updated;
  };

  const deleteItem = async (id: string): Promise<void> => {
    if (backendStatus.isOnline) {
      await deleteItemApi(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMyItems((prev) => prev.filter((item) => item.id !== id));

    if (backendStatus.isOnline) {
      fetchItemStatsApi().then(setStats).catch(() => {});
    }
  };

  const updateItemStatus = async (id: string, status: ItemStatus): Promise<void> => {
    await updateItem(id, { status });
  };

  const submitClaim = async (claimData: SubmitClaimPayload): Promise<Claim> => {
    if (backendStatus.isOnline && getStoredToken()) {
      const created = await submitClaimApi(claimData);
      setMyClaims((prev) => [created, ...prev]);
      fetchNotifications();
      return created;
    }

    // Local development fallback
    const fallbackClaim: Claim = {
      id: `clm_${Date.now()}`,
      itemId: claimData.itemId,
      claimantId: user.id,
      claimantName: user.fullName,
      claimantEmail: user.email,
      description: claimData.description,
      proofDetails: claimData.proofDetails || claimData.proofDescription,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setMyClaims((prev) => [fallbackClaim, ...prev]);
    return fallbackClaim;
  };

  const reviewClaim = async (
    claimId: string,
    payload: { status: 'under_review' | 'approved' | 'rejected'; reviewNotes?: string }
  ): Promise<Claim> => {
    if (backendStatus.isOnline && getStoredToken()) {
      const updated = await reviewClaimApi(claimId, payload);
      setReceivedClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      setMyClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      fetchNotifications();
      return updated;
    }
    throw new Error('Backend required to review claims.');
  };

  const updateHandover = async (
    claimId: string,
    payload: { handoverStatus: HandoverStatus; handoverDetails?: string }
  ): Promise<Claim> => {
    if (backendStatus.isOnline && getStoredToken()) {
      const updated = await updateHandoverApi(claimId, payload);
      setMyClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      setReceivedClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      fetchNotifications();
      return updated;
    }
    throw new Error('Backend required to coordinate handover.');
  };

  const completeReturn = async (
    claimId: string,
    payload?: { completionNotes?: string }
  ): Promise<Claim> => {
    if (backendStatus.isOnline && getStoredToken()) {
      const updated = await completeReturnApi(claimId, payload);
      setMyClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      setReceivedClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      // Refresh items since item status changed to 'returned'
      refreshBackendData();
      return updated;
    }
    throw new Error('Backend required to complete return.');
  };

  const cancelClaim = async (claimId: string): Promise<Claim> => {
    if (backendStatus.isOnline && getStoredToken()) {
      const cancelled = await cancelClaimApi(claimId);
      setMyClaims((prev) => prev.map((c) => (c.id === claimId ? cancelled : c)));
      return cancelled;
    }
    throw new Error('Backend required to cancel claim.');
  };

  const updateClaimStatus = (id: string, status: ClaimStatus) => {
    setMyClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c))
    );
  };

  const markNotificationAsRead = async (id: string) => {
    if (backendStatus.isOnline && getStoredToken()) {
      try {
        await markNotificationReadApi(id);
      } catch (err) {
        console.warn('Failed to mark notification read on backend:', err);
      }
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
    );
    setUnreadNotifCount((prev) => Math.max(0, prev - 1));
  };

  const markAllNotificationsAsRead = async () => {
    if (backendStatus.isOnline && getStoredToken()) {
      try {
        await markAllNotificationsReadApi();
      } catch (err) {
        console.warn('Failed to mark all notifications read on backend:', err);
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    setUnreadNotifCount(0);
  };

  const updateContactProfile = async (payload: UpdateContactPayload): Promise<User> => {
    if (backendStatus.isOnline && getStoredToken()) {
      const updatedUser = await updateContactProfileApi(payload);
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      return updatedUser;
    }
    const updatedUser = { ...user, ...payload };
    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    return updatedUser;
  };

  const setContactConsent = async (claimId: string, consent: boolean): Promise<Claim> => {
    if (backendStatus.isOnline && getStoredToken()) {
      const updated = await setContactConsentApi(claimId, consent);
      setMyClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      setReceivedClaims((prev) => prev.map((c) => (c.id === claimId ? updated : c)));
      return updated;
    }
    throw new Error('Backend required to update contact consent.');
  };

  const unreadMessagesCount = activeConversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const resetDemoData = () => {
    setItems(INITIAL_ITEMS);
    setMyClaims(DEMO_CLAIMS);
    setNotifications(DEMO_NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.ITEMS);
    localStorage.removeItem(STORAGE_KEYS.CLAIMS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFS);
    refreshBackendData();
  };

  return (
    <AppContext.Provider
      value={{
        items,
        myItems,
        stats,
        user,
        isAuthenticated,
        isLoadingAuth,
        claims: myClaims,
        myClaims,
        receivedClaims,
        isLoadingClaims,
        notifications,
        unreadNotifCount,
        potentialMatches,
        isLoadingMatches,
        matchCounts,
        fetchPotentialMatches,
        submitMatchFeedback,
        updateMatchStatus,
        triggerMatchGeneration,
        isBackendOnline: backendStatus.isOnline,
        isLoadingItems,
        isLoadingMyItems,
        backendError,
        storageMode,
        backendStatus,
        refreshBackendData,
        fetchMyItems,
        fetchMyClaims,
        fetchReceivedClaims,
        fetchNotifications,
        login,
        register,
        logout,
        addItem,
        updateItem,
        deleteItem,
        updateItemStatus,
        submitClaim,
        reviewClaim,
        updateHandover,
        completeReturn,
        cancelClaim,
        updateClaimStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        activeConversations,
        unreadMessagesCount,
        refreshActiveConversations,
        updateContactProfile,
        setContactConsent,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
