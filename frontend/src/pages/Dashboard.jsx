import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProjects, createProject, getMyTasks } from '../api';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  Plus,
  FolderKanban,
  ArrowRight,
  Users,
  X,
  LayoutDashboard,
  CheckCircle2,
  ListTodo,
  BarChart3,
  LogOut,
  ChevronDown,
  ClipboardList,
  Moon,
  Sun,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */
const Pulse = ({ className }) => (
  <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
);

const StatSkeleton = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <Pulse className="h-4 w-24 mb-3" />
    <Pulse className="h-8 w-16" />
  </div>
);

const CardSkeleton = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
    <Pulse className="h-5 w-3/4" />
    <Pulse className="h-4 w-full" />
    <Pulse className="h-4 w-1/2" />
    <div className="flex items-center gap-3 pt-2">
      <Pulse className="h-3 w-20" />
      <Pulse className="h-3 w-24" />
    </div>
    <Pulse className="h-9 w-full rounded-lg" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const Dashboard = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  /* data state */
  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  /* modal state */
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);

  /* avatar dropdown */
  const [showDropdown, setShowDropdown] = useState(false);

  /* sidebar collapsed (mobile) */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Fetch on mount ── */
  useEffect(() => {
    getProjects()
      .then(({ data }) => setProjects(data.projects))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoadingProjects(false));

    getMyTasks()
      .then(({ data }) => setMyTasks(data.tasks))
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, []);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const total = projects.length;
    const assigned = myTasks.length;

    // "completed this week" — tasks with status=done updated in last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedThisWeek = myTasks.filter(
      (t) => t.status === 'done' && new Date(t.updatedAt) >= oneWeekAgo
    ).length;

    return { total, assigned, completedThisWeek };
  }, [projects, myTasks]);

  /* ── Helpers ── */
  const taskStatsForProject = (project) => {
    const tasks = project.tasks ?? [];
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pct };
  };

  /* ── Create project ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await createProject(form);
      setProjects((prev) => [...prev, data.project]);
      setShowModal(false);
      setForm({ title: '', description: '' });
      toast.success('Project created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /* ================================================================ */
  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* ── Sidebar ── */}
      {/* overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* brand */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-800 shrink-0">
          <LayoutDashboard className="w-7 h-7 text-indigo-400" />
          <span className="text-xl font-bold text-white tracking-tight">TeamWork</span>
        </div>

        {/* nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <SideLink icon={BarChart3} label="Dashboard" active />
          <SideLink icon={ClipboardList} label="My Tasks" badge={stats.assigned || null} />

          {!loadingProjects && projects.length > 0 && (
            <>
              <div className="pt-5 pb-2 px-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Projects
                </span>
              </div>
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                >
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span className="truncate">{p.title}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* bottom user card */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-semibold shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="h-16 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
          {/* hamburger (mobile) */}
          <button
            className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-lg font-semibold text-gray-100 hidden lg:block">Dashboard</h1>

          {/* right side: theme toggle + avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* avatar dropdown */}
            <div className="relative">
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-medium">
                {getInitials(user?.name)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 py-1">
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* ── Stats Bar ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {loadingProjects || loadingTasks ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  icon={FolderKanban}
                  label="Total Projects"
                  value={stats.total}
                  color="text-indigo-400"
                  bg="bg-indigo-500/10"
                />
                <StatCard
                  icon={ListTodo}
                  label="Assigned to Me"
                  value={stats.assigned}
                  color="text-amber-400"
                  bg="bg-amber-500/10"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Completed This Week"
                  value={stats.completedThisWeek}
                  color="text-emerald-400"
                  bg="bg-emerald-500/10"
                />
              </>
            )}
          </div>

          {/* ── Header row ── */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-100">Projects</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>

          {/* ── Project grid / skeleton / empty ── */}
          {loadingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-28 h-28 rounded-full bg-gray-900 border-2 border-dashed border-gray-700 flex items-center justify-center mb-6">
                <FolderKanban className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-1">No projects yet</h3>
              <p className="text-gray-500 mb-6 text-center max-w-sm">
                Create your first project to start organising tasks and collaborating with your team.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => {
                const { total, done, pct } = taskStatsForProject(project);
                return (
                  <div
                    key={project.id}
                    className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col hover:border-indigo-500/40 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-base font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors truncate">
                        {project.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                      {project.description || 'No description'}
                    </p>

                    {/* meta row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {project.members?.length || 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {done}/{total} tasks
                      </span>
                    </div>

                    {/* progress bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-gray-400 font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Open Board
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Create Project Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-100">New Project</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="e.g. Marketing Website"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
                  placeholder="What is this project about?"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {creating ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */
function SideLink({ icon: Icon, label, active, badge }) {
  return (
    <button
      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-indigo-500/10 text-indigo-400'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </span>
      {badge != null && (
        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
      </div>
    </div>
  );
}

export default Dashboard;
