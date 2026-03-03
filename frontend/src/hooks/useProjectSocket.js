import { useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../store/authStore';

/**
 * Custom React hook that manages a WebSocket connection to a project room.
 *
 * @param {string}   projectId     – UUID of the project to join
 * @param {object}   callbacks     – event handlers:
 *   - onTaskUpdate(payload)       – called on TASK_UPDATE messages
 *   - onActivity(payload)         – called on ACTIVITY messages
 *   - onConnected()               – called after successful join
 *   - onDisconnected()            – called when ws closes
 */
export default function useProjectSocket(projectId, callbacks = {}) {
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const timerRef = useRef(null);
  const unmountedRef = useRef(false);

  // Keep the latest callbacks in a ref so the WS handler always uses
  // the freshest version without re-creating the socket.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !projectId || unmountedRef.current) return;

    // Determine WS URL — use Vite env if provided, else derive from page
    const wsBase = import.meta.env.VITE_WS_URL; // e.g. wss://my-app.onrender.com
    let wsUrl;
    if (wsBase) {
      wsUrl = wsBase;
    } else if (window.location.protocol === 'https:') {
      // Production: WSS on same host, standard port (443)
      wsUrl = `wss://${window.location.host}`;
    } else {
      // Local dev: ws on localhost with explicit port
      const wsPort = import.meta.env.VITE_WS_PORT || '5000';
      wsUrl = `ws://${window.location.hostname}:${wsPort}`;
    }

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0; // reset backoff on successful connect
      ws.send(JSON.stringify({ type: 'join', projectId, token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'joined':
            cbRef.current.onConnected?.();
            break;

          case 'TASK_UPDATE':
            cbRef.current.onTaskUpdate?.(msg.payload);
            break;

          case 'ACTIVITY':
            cbRef.current.onActivity?.(msg.payload);
            break;

          case 'error':
            console.warn('[ws] server error:', msg.message);
            break;

          default:
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      cbRef.current.onDisconnected?.();
      if (!unmountedRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, which triggers reconnect
    };
  }, [projectId]);

  /**
   * Exponential backoff: 1 s → 2 s → 4 s → 8 s → … capped at 30 s.
   */
  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return;
    const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
    retriesRef.current += 1;
    timerRef.current = setTimeout(() => {
      if (!unmountedRef.current) connect();
    }, delay);
  }, [connect]);

  /* ── Lifecycle ──────────────────────────────────────────────────── */
  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop on cleanup
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return wsRef;
}
