import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketService } from '../services/websocketService';
import type { WebSocketResponse } from '../types';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketResponse | null>(null);
  const wsService = useRef<WebSocketService>(new WebSocketService());

  const connect = useCallback(() => {
    wsService.current.connect(
      (data) => {
        setLastMessage(data);
        setError(null);
      },
      (err) => {
        console.error('WebSocket error:', err);
        setError('Error de conexión con el servidor');
        setIsConnected(false);
      },
      () => {
        setIsConnected(true);
        setError(null);
      }
    );
  }, []);

  const sendFrame = useCallback((frameBase64: string) => {
    if (wsService.current.isConnected()) {
      wsService.current.send(frameBase64);
    }
  }, []);

  const disconnect = useCallback(() => {
    wsService.current.disconnect();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    lastMessage,
    connect,
    sendFrame,
    disconnect,
  };
};