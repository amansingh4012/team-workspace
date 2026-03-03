import { useEffect, useState } from 'react';
import { getProjectAnalytics } from '../api';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { X, Loader2, BarChart3, TrendingUp } from 'lucide-react';

/* ── Colour palettes ─────────────────────────────────────────────── */
const PRIORITY_COLORS = { low: '#22c55e', medium: '#eab308', high: '#ef4444' };
const STATUS_COLORS = { todo: '#6b7280', inprogress: '#3b82f6', done: '#22c55e' };
const BAR_COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

/* ── Circular progress ring ──────────────────────────────────────── */
const ProgressRing = ({ pct, size = 120, stroke = 10 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#6366f1"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-100">{pct}%</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Done</span>
      </div>
    </div>
  );
};

/* ── Custom Recharts tooltip (dark theme) ────────────────────────── */
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-300 font-medium mb-0.5">{label ?? payload[0]?.name}</p>
      <p className="text-white font-bold">{payload[0]?.value} tasks</p>
    </div>
  );
};

/* ================================================================== */
/*  AnalyticsPanel                                                     */
/* ================================================================== */
const AnalyticsPanel = ({ projectId, open, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProjectAnalytics(projectId)
      .then(({ data: res }) => setData(res.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, projectId]);

  /* Build chart arrays */
  const priorityData = data
    ? Object.entries(data.priorityMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: PRIORITY_COLORS[name],
      }))
    : [];

  const memberData = data
    ? [...data.tasksPerMember].sort((a, b) => b.count - a.count)
    : [];

  const statusData = data
    ? Object.entries(data.statusMap).map(([key, value]) => ({
        name: key === 'inprogress' ? 'In Progress' : key === 'todo' ? 'To Do' : 'Done',
        value,
        fill: STATUS_COLORS[key],
      }))
    : [];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-gray-100">Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : !data ? (
            <p className="text-center text-gray-500 py-20 text-sm">No data available</p>
          ) : (
            <>
              {/* ── Completion Ring ──────────────────────────────── */}
              <div className="flex flex-col items-center">
                <ProgressRing pct={data.completionPct} />
                <p className="mt-3 text-sm text-gray-400">
                  <span className="text-gray-200 font-medium">{data.statusMap.done}</span> of{' '}
                  <span className="text-gray-200 font-medium">{data.totalTasks}</span> tasks
                  completed
                </p>
              </div>

              {/* ── Status summary cards ─────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                {statusData.map((s) => (
                  <div
                    key={s.name}
                    className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center"
                  >
                    <div
                      className="w-2 h-2 rounded-full mx-auto mb-2"
                      style={{ background: s.fill }}
                    />
                    <p className="text-lg font-bold text-gray-100">{s.value}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.name}</p>
                  </div>
                ))}
              </div>

              {/* ── Priority Donut ───────────────────────────────── */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">By Priority</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={140}>
                    <PieChart>
                      <Pie
                        data={priorityData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {priorityData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {priorityData.map((p) => (
                      <div key={p.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ background: p.fill }}
                        />
                        <span className="text-gray-400">{p.name}</span>
                        <span className="text-gray-200 font-medium ml-auto">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Tasks per Member Bar Chart ───────────────────── */}
              {memberData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Tasks per Member</h3>
                  <ResponsiveContainer width="100%" height={Math.max(memberData.length * 36, 100)}>
                    <BarChart data={memberData} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                        {memberData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AnalyticsPanel;
