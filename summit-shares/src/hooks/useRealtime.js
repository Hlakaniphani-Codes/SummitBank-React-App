import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

// The real-time WebSocket hook for instant state synchronization
let globalSocket = null;
const listeners = new Map();
let authAttempted = false;

function getSocket() {
  if (!globalSocket) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    globalSocket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    globalSocket.on('connect', () => {
      console.log('🔌 Real-time WebSocket connected');
      // Authenticate with the server - retry a few times if user data not ready
      const attemptAuth = () => {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user && user.id) {
              globalSocket.emit('authenticate', { 
                userId: user.id, 
                role: user.role || 'user' 
              });
              authAttempted = true;
              console.log('🔐 Sent authentication for user:', user.id);
              return true;
            }
          }
          return false;
        } catch (e) {
          console.warn('⚠️ Auth parse error:', e);
          return false;
        }
      };
      
      // Try immediately
      if (!attemptAuth()) {
        // Retry after a short delay (user data might not be in localStorage yet)
        console.log('⏳ Delaying auth - user data not ready');
        setTimeout(attemptAuth, 500);
      }
    });

    globalSocket.on('disconnect', (reason) => {
      console.log('🔌 Real-time WebSocket disconnected:', reason);
      authAttempted = false;
    });

    globalSocket.on('connect_error', (err) => {
      console.warn('⚠️ WebSocket connection error:', err.message);
    });

    globalSocket.on('authenticated', (data) => {
      console.log('🔐 Real-time WebSocket authenticated:', data);
    });

    globalSocket.on('new-notification', (data) => {
      console.log('📨 WS event: new-notification', data);
      const callbacks = listeners.get('new-notification');
      if (callbacks) {
        callbacks.forEach(cb => { try { cb(data); } catch(e) { console.error('WS callback error:', e); } });
      }
    });

    globalSocket.on('balance-update', (data) => {
      console.log('💰 WS event: balance-update', data);
      const callbacks = listeners.get('balance-update');
      if (callbacks) {
        callbacks.forEach(cb => { try { cb(data); } catch(e) { console.error('WS callback error:', e); } });
      }
    });

    globalSocket.on('new-transaction', (data) => {
      console.log('💳 WS event: new-transaction', data);
      const callbacks = listeners.get('new-transaction');
      if (callbacks) {
        callbacks.forEach(cb => { try { cb(data); } catch(e) { console.error('WS callback error:', e); } });
      }
    });

    globalSocket.on('card-update', (data) => {
      console.log('🃏 WS event: card-update', data);
      const callbacks = listeners.get('card-update');
      if (callbacks) {
        callbacks.forEach(cb => { try { cb(data); } catch(e) { console.error('WS callback error:', e); } });
      }
    });

    globalSocket.on('account-update', (data) => {
      console.log('🏦 WS event: account-update', data);
      const callbacks = listeners.get('account-update');
      if (callbacks) {
        callbacks.forEach(cb => { try { cb(data); } catch(e) { console.error('WS callback error:', e); } });
      }
    });

    globalSocket.on('admin-notification', (data) => {
      console.log('📢 WS event: admin-notification', data);
      const callbacks = listeners.get('admin-notification');
      if (callbacks) {
        callbacks.forEach(cb => { try { cb(data); } catch(e) { console.error('WS callback error:', e); } });
      }
    });
  }
  return globalSocket;
}

/**
 * Subscribe to a real-time event
 */
function subscribe(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);
  return () => {
    const s = listeners.get(event);
    if (s) {
      s.delete(callback);
      if (s.size === 0) listeners.delete(event);
    }
  };
}

/**
 * React hook for real-time events
 */
export function useRealtime() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      console.log('✅ WS connected state updated');
      setConnected(true);
    };
    const onDisconnect = () => {
      console.log('❌ WS disconnected state updated');
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  /**
   * Subscribe to a specific event type and get real-time updates
   */
  const onEvent = useCallback((event, callback) => {
    return subscribe(event, callback);
  }, []);

  /**
   * Emit an event to the server
   */
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return { connected, onEvent, emit };
}

/**
 * React hook specifically for listening to new notifications
 */
export function useNotificationListener(callback) {
  useEffect(() => {
    const unsub = subscribe('new-notification', callback);
    return unsub;
  }, [callback]);
}

/**
 * React hook for balance updates
 */
export function useBalanceListener(callback) {
  useEffect(() => {
    const unsub = subscribe('balance-update', callback);
    return unsub;
  }, [callback]);
}

/**
 * React hook for transaction updates
 */
export function useTransactionListener(callback) {
  useEffect(() => {
    const unsub = subscribe('new-transaction', callback);
    return unsub;
  }, [callback]);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (globalSocket) {
    globalSocket.close();
    globalSocket = null;
  }
});
