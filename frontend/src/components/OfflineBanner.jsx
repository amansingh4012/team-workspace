import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { getQueuedMutations, clearQueue } from '../utils/offlineCache';
import api from '../api/axios';
import toast from 'react-hot-toast';

/**
 * Thin banner that appears at the top of the viewport when the browser
 * is offline.  When the connection comes back it automatically replays
 * any queued mutations, then refreshes data.
 */
const OfflineBanner = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [replaying, setReplaying] = useState(false);
  const [queueLen, setQueueLen] = useState(0);
  const [showReconnected, setShowReconnected] = useState(false);

  /* Listen for connectivity changes */
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /* Count queued mutations whenever we go offline */
  useEffect(() => {
    if (!online) {
      getQueuedMutations().then((q) => setQueueLen(q.length));
      // Periodically update count while offline
      const interval = setInterval(() => {
        getQueuedMutations().then((q) => setQueueLen(q.length));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [online]);

  /* Replay queued mutations when coming back online */
  useEffect(() => {
    if (!online) return;

    const replay = async () => {
      const queue = await getQueuedMutations();
      if (queue.length === 0) return;

      setReplaying(true);
      let succeeded = 0;

      for (const entry of queue) {
        try {
          await api({
            method: entry.method,
            url: entry.url,
            data: entry.data,
            headers: entry.headers,
          });
          succeeded++;
        } catch {
          // Drop permanently failed mutations
        }
      }

      await clearQueue();
      setReplaying(false);

      if (succeeded > 0) {
        toast.success(`Synced ${succeeded} offline change${succeeded > 1 ? 's' : ''}`);
        // Brief delay then reload for fresh data
        setTimeout(() => window.location.reload(), 800);
      } else {
        // Show reconnected banner briefly
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 2500);
      }
    };

    replay().then(() => {
      // If no queue was present, still show a brief "back online" note
      getQueuedMutations().then((q) => {
        if (q.length === 0 && !replaying) {
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 2500);
        }
      });
    });
  }, [online]);

  if (online && !replaying && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium shadow-lg animate-slide-down ${
        showReconnected
          ? 'bg-emerald-600 text-white'
          : replaying
          ? 'bg-blue-600 text-white'
          : 'bg-amber-600 text-white'
      }`}
    >
      {showReconnected ? (
        <>
          <Wifi className="w-4 h-4" />
          Back online
        </>
      ) : replaying ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Syncing {queueLen} offline change{queueLen !== 1 ? 's' : ''}…
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          You are offline — changes will be saved locally
          {queueLen > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
              {queueLen} pending
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
