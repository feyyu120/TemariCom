import { ENV } from '@/config/env';
import { tokenStorage } from '@/services/api/tokenStorage';
import { WSEvent } from '@/features/chat/types';

type EventHandler = (data: any) => void;

class ChatWebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;

  /**
   * Connect to backend WebSocket with active session token
   */
  async connect(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = await tokenStorage.getSessionToken();
    if (!token) {
      if (import.meta.env.DEV) {
        console.log('[ChatWS] No active session token found, skipping WS connection');
      }
      return;
    }

    this.isExplicitlyClosed = false;
    const wsBaseUrl = ENV.API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/chat/ws?token=${encodeURIComponent(token)}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        if (import.meta.env.DEV) {
          console.log('[ChatWS] Connected to real-time chat server');
        }
        this.reconnectAttempts = 0;
        this.emit('connection:open', { connected: true });
      };

      this.socket.onmessage = (event) => {
        try {
          const raw: WSEvent = JSON.parse(event.data);
          if (raw && raw.type) {
            this.emit(raw.type, raw.payload);
            this.emit('*', raw);
          }
        } catch {
          if (import.meta.env.DEV) {
            console.warn('[ChatWS] Failed to parse incoming WS message:', event.data);
          }
        }
      };

      this.socket.onerror = (err) => {
        if (import.meta.env.DEV) {
          console.warn('[ChatWS] WebSocket error:', err);
        }
        this.emit('connection:error', err);
      };

      this.socket.onclose = (event) => {
        if (import.meta.env.DEV) {
          console.log(`[ChatWS] Disconnected (code: ${event.code})`);
        }
        this.socket = null;
        this.emit('connection:close', event);

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[ChatWS] Exception creating WebSocket:', err);
      }
      this.scheduleReconnect();
    }
  }

  /**
   * Explicitly close the WebSocket connection.
   */
  disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Exponential backoff reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isExplicitlyClosed) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to incoming event types
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  private emit(eventType: string, data: any): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (e) {
          console.error(`[ChatWS] Error in handler for event ${eventType}:`, e);
        }
      });
    }
  }

  /**
   * Send a formatted event envelope
   */
  send(type: string, conversationId?: string, payload: any = {}): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const eventMsg: WSEvent = {
      type,
      conversation_id: conversationId,
      payload,
    };

    this.socket.send(JSON.stringify(eventMsg));
    return true;
  }

  /**
   * Typing event emission
   */
  sendTyping(conversationId: string, isTyping: boolean): boolean {
    return this.send('chat:typing', conversationId, { is_typing: isTyping });
  }

  /**
   * Read receipt emission
   */
  sendReadReceipt(conversationId: string): boolean {
    return this.send('chat:read', conversationId);
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

export const chatWebSocketService = new ChatWebSocketService();
export default chatWebSocketService;
