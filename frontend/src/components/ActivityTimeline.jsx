import { useEffect, useState, useRef } from 'react';
import { getActivities } from '../api';
import { getInitials } from '../utils/helpers';
import { formatDistanceToNow } from 'date-fns';
import {
  X,
  Clock,
  Loader2,
  ChevronDown,
  Activity as ActivityIcon,
} from 'lucide-react';

/**
 * Slide-in panel from the right showing the project's activity timeline.
 *
 * Props:
 *  - projectId      – UUID of the project
 *  - open           – boolean controlling visibility
 *  - onClose        – callback to close the panel
 *  - realtimeItems  – array of new activities pushed via WebSocket (newest first)
 *  - members        – project member list for avatar lookup
 */
const ActivityTimeline = ({ projectId, open, onClose, realtimeItems = [], members = [] }) => {
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const panelRef = useRef(null);

  /* ── Fetch paginated activities ─────────────────────────────────── */
  const fetchActivities = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const { data } = await getActivities(projectId, { page: pageNum, limit: 20 });
      const fetched = data.activities || [];
      setActivities((prev) => (append ? [...prev, ...fetched] : fetched));
      setTotalPages(data.pagination?.totalPages || 1);
      setPage(pageNum);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (open && initialLoad) {
      fetchActivities(1);
    }
  }, [open]);

  /* ── Merge real-time items (newest first, deduped) ─────────────── */
  const merged = (() => {
    const ids = new Set(activities.map((a) => a.id));
    const newOnes = realtimeItems.filter((a) => !ids.has(a.id));
    return [...newOnes, ...activities];
  })();

  /* ── Load more ──────────────────────────────────────────────────── */
  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      fetchActivities(page + 1, true);
    }
  };

  /* ── Resolve user name from activity or members ────────────────── */
  const getUserInfo = (activity) => {
    if (activity.user) return activity.user;
    const m = members.find((m) => m.id === activity.userId);
    if (m) return m;
    return { name: 'Someone', avatar: null };
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-gray-100">Activity</h2>
            <span className="text-xs text-gray-500 ml-1">Timeline</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100%-60px)] px-5 py-4">
          {initialLoad && loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : merged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600">
              <Clock className="w-10 h-10 mb-3" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gray-800" />

              <div className="space-y-0">
                {merged.map((activity, idx) => {
                  const userInfo = getUserInfo(activity);
                  const isNew = realtimeItems.some((r) => r.id === activity.id);

                  return (
                    <div
                      key={activity.id || idx}
                      className={`relative flex gap-3 py-3 transition-all duration-500 ${
                        isNew ? 'animate-fade-in' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative z-10 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-400 shrink-0">
                        {getInitials(userInfo.name)}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 leading-relaxed">
                          <span className="font-medium text-gray-100">{userInfo.name}</span>{' '}
                          {activity.action}
                        </p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              {page < totalPages && (
                <div className="flex justify-center pt-4 pb-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ActivityTimeline;
