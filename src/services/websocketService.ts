import { authService } from './authService';

type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = await authService.getValidToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const wsUrl = `ws://localhost:4001?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Attempting to reconnect WebSocket in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private handleMessage(data: any): void {
    const { type } = data;
    const handlers = this.eventHandlers.get(type) || [];

    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in WebSocket handler for ${type}:`, error);
      }
    });
  }

  // Subscribe to WebSocket events
  on(eventType: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // Send message through WebSocket
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.eventHandlers.clear();
    this.reconnectAttempts = 0;
  }

  // Get connection status
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Supabase-like channel interface for backward compatibility
export class RealtimeChannel {
  private channelName: string;
  private subscriptions: (() => void)[] = [];

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  on(event: string, config: any, callback: (payload: any) => void) {
    // Map Supabase events to WebSocket events
    let wsEventType = 'new_message';

    if (event === 'postgres_changes') {
      if (config.event === 'INSERT') {
        wsEventType = 'new_message';
      } else if (config.event === 'UPDATE') {
        wsEventType = 'message_updated';
      } else if (config.event === '*') {
        // Subscribe to both insert and update
        const insertUnsub = websocketService.on('new_message', (data) => {
          const payload = {
            eventType: 'INSERT',
            new: data.message,
            old: null,
            table: config.table || 'messages'
          };
          callback(payload);
        });

        const updateUnsub = websocketService.on('message_updated', (data) => {
          const payload = {
            eventType: 'UPDATE',
            new: data.message,
            old: data.oldMessage,
            table: config.table || 'messages'
          };
          callback(payload);
        });

        this.subscriptions.push(insertUnsub, updateUnsub);
        return this;
      }
    }

    // Subscribe to the mapped WebSocket event
    const unsubscribe = websocketService.on(wsEventType, (data) => {
      // Transform WebSocket data to match Supabase format
      const payload = {
        eventType: config.event === '*' ? 'INSERT' : config.event || 'INSERT',
        new: data.message,
        old: data.oldMessage || null,
        table: config.table || 'messages'
      };
      callback(payload);
    });

    this.subscriptions.push(unsubscribe);
    return this;
  }

  subscribe() {
    // Ensure WebSocket is connected
    websocketService.connect().catch(console.error);
    return this;
  }

  unsubscribe() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
  }
}

// Supabase-compatible interface
export const createRealtimeChannel = (channelName: string) => {
  return new RealtimeChannel(channelName);
};