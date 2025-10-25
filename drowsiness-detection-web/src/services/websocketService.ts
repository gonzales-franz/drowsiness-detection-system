import { WS_URL } from '../utils/constants';
import type { WebSocketResponse } from '../types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  connect(
    onMessage: (data: WebSocketResponse) => void,
    onError: (error: Event) => void,
    onOpen?: () => void
  ): void {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket conectado');
        this.reconnectAttempts = 0;
        onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketResponse = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('Error al parsear mensaje:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket desconectado');
        this.handleReconnect(onMessage, onError, onOpen);
      };
    } catch (err) {
      console.error('Error al crear WebSocket:', err);
      onError(err as Event);
    }
  }

  private handleReconnect(
    onMessage: (data: WebSocketResponse) => void,
    onError: (error: Event) => void,
    onOpen?: () => void
  ): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        this.connect(onMessage, onError, onOpen);
      }, this.reconnectDelay);
    }
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('WebSocket no está conectado');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}