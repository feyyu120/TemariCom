const SESSION_TOKEN_KEY = 'temaricom_session_token';
const USER_DATA_KEY = 'temaricom_user_data';
const ACCOUNTS_KEY = 'temaricom_accounts';
const ACTIVE_ACCOUNT_ID_KEY = 'temaricom_active_account_id';

export interface StoredAccount<T = any> {
  user: T;
  sessionToken: string;
  addedAt: number;
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`[tokenStorage] Failed to read ${key} from localStorage:`, error);
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[tokenStorage] Failed to write ${key} to localStorage:`, error);
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[tokenStorage] Failed to delete ${key} from localStorage:`, error);
  }
}

/**
 * Web Token Storage (Pure functional object - zero classes)
 */
export const tokenStorage = {
  /**
   * Retrieve all saved accounts for multi-account switching.
   */
  async getAccounts<T = any>(): Promise<StoredAccount<T>[]> {
    const raw = safeGetItem(ACCOUNTS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieve active account ID.
   */
  async getActiveAccountId(): Promise<string | null> {
    return safeGetItem(ACTIVE_ACCOUNT_ID_KEY);
  },

  /**
   * Save or update an account in the multi-account vault.
   */
  async saveAccount<T extends { id: string }>(
    account: StoredAccount<T>,
    makeActive = true
  ): Promise<void> {
    const currentAccounts = await this.getAccounts<T>();
    const existingIdx = currentAccounts.findIndex(
      (acc) => acc.user.id === account.user.id
    );

    let updatedAccounts: StoredAccount<T>[];
    if (existingIdx !== -1) {
      updatedAccounts = [...currentAccounts];
      updatedAccounts[existingIdx] = account;
    } else {
      updatedAccounts = [...currentAccounts, account];
    }

    safeSetItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

    if (makeActive) {
      safeSetItem(ACTIVE_ACCOUNT_ID_KEY, account.user.id);
      await this.setSessionToken(account.sessionToken);
      await this.setUserData(account.user);
    }
  },

  /**
   * Switch the active account to another user ID without logging out.
   */
  async switchActiveAccount<T extends { id: string }>(
    userId: string
  ): Promise<StoredAccount<T> | null> {
    const accounts = await this.getAccounts<T>();
    const target = accounts.find((acc) => acc.user.id === userId);
    if (!target) return null;

    safeSetItem(ACTIVE_ACCOUNT_ID_KEY, userId);
    await this.setSessionToken(target.sessionToken);
    await this.setUserData(target.user);
    return target;
  },

  /**
   * Remove a specific account from stored accounts.
   */
  async removeAccount<T extends { id: string }>(
    userId: string
  ): Promise<{ remaining: StoredAccount<T>[]; newActive: StoredAccount<T> | null }> {
    const accounts = await this.getAccounts<T>();
    const filtered = accounts.filter((acc) => acc.user.id !== userId);
    safeSetItem(ACCOUNTS_KEY, JSON.stringify(filtered));

    const activeId = await this.getActiveAccountId();
    if (activeId === userId) {
      if (filtered.length > 0) {
        const nextAccount = filtered[0];
        await this.switchActiveAccount(nextAccount.user.id);
        return { remaining: filtered, newActive: nextAccount };
      } else {
        await this.clearAll();
        return { remaining: [], newActive: null };
      }
    }

    return {
      remaining: filtered,
      newActive: filtered.find((a) => a.user.id === activeId) || null,
    };
  },

  /**
   * Save session token.
   */
  async setSessionToken(token: string): Promise<void> {
    safeSetItem(SESSION_TOKEN_KEY, token);
  },

  /**
   * Retrieve session token.
   */
  async getSessionToken(): Promise<string | null> {
    return safeGetItem(SESSION_TOKEN_KEY);
  },

  /**
   * Remove session token.
   */
  async removeSessionToken(): Promise<void> {
    safeRemoveItem(SESSION_TOKEN_KEY);
  },

  /**
   * Save serialized user data.
   */
  async setUserData(userData: object): Promise<void> {
    safeSetItem(USER_DATA_KEY, JSON.stringify(userData));
  },

  /**
   * Retrieve serialized user data synchronously (critical for zero-FOUC hydration).
   */
  getUserDataSync<T = any>(): T | null {
    const raw = safeGetItem(USER_DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /**
   * Retrieve active account synchronously.
   */
  getActiveAccountSync<T = any>(): StoredAccount<T> | null {
    const accountsRaw = safeGetItem(ACCOUNTS_KEY);
    const activeId = safeGetItem(ACTIVE_ACCOUNT_ID_KEY);
    if (!accountsRaw || !activeId) return null;
    try {
      const accounts = JSON.parse(accountsRaw) as StoredAccount<T>[];
      if (!Array.isArray(accounts)) return null;
      return accounts.find((acc: any) => acc.user?.id === activeId) || null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieve serialized user data.
   */
  async getUserData<T = any>(): Promise<T | null> {
    return this.getUserDataSync<T>();
  },

  /**
   * Clear all auth data from web storage.
   */
  async clearAll(): Promise<void> {
    safeRemoveItem(SESSION_TOKEN_KEY);
    safeRemoveItem(USER_DATA_KEY);
    safeRemoveItem(ACCOUNTS_KEY);
    safeRemoveItem(ACTIVE_ACCOUNT_ID_KEY);
  },
};

export default tokenStorage;

