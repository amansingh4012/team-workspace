import { useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, onMessage) => {
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch {
        // ignore non-JSON messages
      }
    };
    ws.onclose = () => console.log('WebSocket disconnected');

    return () => ws.close();
  }, [url, onMessage]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
};

export default useWebSocket;
