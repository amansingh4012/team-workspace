import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { getProject, getTasks, reorderTasks } from '../api';
import useAuthStore from '../store/authStore';
import useProjectSocket from '../hooks/useProjectSocket';
import TaskCard from '../components/TaskCard';
import AddTaskModal from '../components/AddTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import ActivityTimeline from '../components/ActivityTimeline';
import AnalyticsPanel from '../components/AnalyticsPanel';
import ManageMembersModal from '../components/ManageMembersModal';
import { getInitials, statusConfig } from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Users,
  LayoutGrid,
  Loader2,
  Activity,
  BarChart3,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Column configuration                                               */
/* ------------------------------------------------------------------ */
const COLUMNS = [
  { id: 'todo', label: 'To Do', dot: 'bg-gray-400' },
  { id: 'inprogress', label: 'In Progress', dot: 'bg-blue-400' },
  { id: 'done', label: 'Done', dot: 'bg-green-400' },
];

/* ------------------------------------------------------------------ */
/*  Skeleton Helpers                                                   */
/* ------------------------------------------------------------------ */
const Pulse = ({ className }) => (
  <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
);

const ColumnSkeleton = () => (
  <div className="flex-1 min-w-[300px] max-w-[380px]">
    <Pulse className="h-6 w-28 mb-4" />
    <div className="space-y-3">
      <Pulse className="h-24 w-full" />
      <Pulse className="h-20 w-full" />
      <Pulse className="h-28 w-full" />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const ProjectBoardPage = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  /* Data state */
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  /* URL-persisted filters */
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const assigneeFilter = searchParams.get('assignee') || '';

  const setFilter = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  /* UI state */
  const [showFilters, setShowFilters] = useState(!!(priorityFilter || assigneeFilter));
  const [addTaskColumn, setAddTaskColumn] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [realtimeActivities, setRealtimeActivities] = useState([]);

  /* ── Fetch data ─────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        getProject(projectId),
        getTasks(projectId),
      ]);
      setProject(projectRes.data.project);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Real-time via useProjectSocket ───────────────────────────────── */
  const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };

  const { connected: wsConnected } = useProjectSocket(projectId, {
    onTaskUpdate: (payload) => {
      const isOther = payload.userId && payload.userId !== user?.id;

      switch (payload.action) {
        case 'created': {
          setTasks((prev) => {
            if (prev.some((t) => t.id === payload.task?.id)) return prev;
            return [...prev, payload.task];
          });
          if (isOther) {
            toast(`${payload.userName || 'Someone'} added a new task: ${payload.task?.title}`, {
              icon: '📋',
              style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
            });
          }
          break;
        }
        case 'updated': {
          const merged = payload.task;
          setTasks((prev) =>
            prev.map((t) =>
              t.id === merged?.id ? { ...t, ...merged } : t
            )
          );
          // Keep the open TaskDetailModal in sync
          setSelectedTask((prev) =>
            prev && prev.id === merged?.id ? { ...prev, ...merged } : prev
          );
          if (isOther) {
            toast(`${payload.userName || 'Someone'} updated '${merged?.title}'`, {
              icon: '✏️',
              style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
            });
          }
          break;
        }
        case 'deleted': {
          setTasks((prev) => prev.filter((t) => t.id !== payload.taskId));
          // Close the modal if this task was open
          setSelectedTask((prev) =>
            prev && prev.id === payload.taskId ? null : prev
          );
          if (isOther) {
            toast(`${payload.userName || 'Someone'} deleted '${payload.taskTitle || 'a task'}'`, {
              icon: '🗑️',
              style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
            });
          }
          break;
        }
        case 'reordered': {
          // Refetch all tasks (bulk reorder is too complex to reconstruct client-side)
          getTasks(projectId)
            .then(({ data }) => setTasks(data.tasks))
            .catch(() => {});
          break;
        }
        default:
          break;
      }
    },
    onActivity: (activity) => {
      setRealtimeActivities((prev) => [activity, ...prev.slice(0, 99)]);
    },
    onMemberUpdate: (payload) => {
      // If the current user was removed, redirect them out
      if (payload.action === 'removed' && payload.memberId === user?.id) {
        toast('You have been removed from this project', {
          icon: '⚠️',
          style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
        });
        navigate('/dashboard');
        return;
      }

      // Re-fetch the full project to get updated members list
      getProject(projectId)
        .then(({ data }) => setProject(data.project))
        .catch(() => {});

      const isOther = payload.userId && payload.userId !== user?.id;
      if (isOther) {
        if (payload.action === 'added') {
          toast(`${payload.userName} added ${payload.member?.name || 'a member'}`, {
            icon: '👤',
            style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
          });
        } else if (payload.action === 'removed') {
          toast(`${payload.userName} removed a member`, {
            icon: '👤',
            style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
          });
        }
      }
    },
    onProjectUpdate: (payload) => {
      // Update project title/description in real-time
      setProject((prev) =>
        prev ? { ...prev, ...payload.project } : prev
      );
      const isOther = payload.userId && payload.userId !== user?.id;
      if (isOther) {
        toast(`${payload.userName || 'Someone'} updated project details`, {
          icon: '📝',
          style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
        });
      }
    },
    onProjectDelete: (payload) => {
      toast(`This project has been deleted${payload.userName ? ` by ${payload.userName}` : ''}`, {
        icon: '🗑️',
        style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
        duration: 4000,
      });
      navigate('/dashboard');
    },
  });

  /* ── Members list from project ─────────────────────────────────── */
  const members = useMemo(() => project?.members || [], [project]);

  /* ── Check if current user is admin ────────────────────────────── */
  const isAdmin = useMemo(() => {
    const me = members.find((m) => m.id === user?.id);
    return me?.ProjectMember?.role === 'admin' || project?.ownerId === user?.id;
  }, [members, user, project]);

  /* ── Filter + group tasks into columns ─────────────────────────── */
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, assigneeFilter]);

  const columns = useMemo(() => {
    const grouped = { todo: [], inprogress: [], done: [] };
    filteredTasks.forEach((t) => {
      if (grouped[t.status]) grouped[t.status].push(t);
    });
    // Sort within each column by order
    Object.values(grouped).forEach((col) => col.sort((a, b) => a.order - b.order));
    return grouped;
  }, [filteredTasks]);

  /* ── Drag & Drop handler ───────────────────────────────────────── */
  const onDragEnd = useCallback(
    async (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      // Build new columns map (from current unfiltered tasks)
      const colMap = { todo: [], inprogress: [], done: [] };
      tasks.forEach((t) => {
        if (colMap[t.status]) colMap[t.status].push({ ...t });
      });
      Object.values(colMap).forEach((col) => col.sort((a, b) => a.order - b.order));

      // Remove from source
      const [moved] = colMap[source.droppableId].splice(source.index, 1);
      moved.status = destination.droppableId;

      // Insert at destination
      colMap[destination.droppableId].splice(destination.index, 0, moved);

      // Recompute order for affected columns
      const updates = [];
      const affectedCols = new Set([source.droppableId, destination.droppableId]);
      affectedCols.forEach((colId) => {
        colMap[colId].forEach((t, i) => {
          updates.push({ id: t.id, order: i, status: colId });
        });
      });

      // Optimistic update
      const flatTasks = [...colMap.todo, ...colMap.inprogress, ...colMap.done];
      // Merge back any tasks not in these 3 status buckets (edge case)
      const flatIds = new Set(flatTasks.map((t) => t.id));
      tasks.forEach((t) => {
        if (!flatIds.has(t.id)) flatTasks.push(t);
      });
      setTasks(flatTasks);

      try {
        await reorderTasks(projectId, updates);
      } catch {
        toast.error('Reorder failed — refreshing…');
        fetchData();
      }
    },
    [tasks, projectId, fetchData]
  );

  /* ── Task CRUD callbacks ───────────────────────────────────────── */
  const handleTaskCreated = (newTask) => {
    // Dedup: the WS broadcast may have already added this task
    setTasks((prev) => {
      if (prev.some((t) => t.id === newTask.id)) return prev;
      return [...prev, newTask];
    });
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
    setSelectedTask(null);
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  /* ── Active filter count ───────────────────────────────────────── */
  const activeFilters = [priorityFilter, assigneeFilter].filter(Boolean).length;

  /* ── Loading state ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col p-6 overflow-hidden">
        <Pulse className="h-8 w-64 mb-6" />
        <div className="flex gap-5 flex-1 overflow-x-auto pb-4">
          <ColumnSkeleton />
          <ColumnSkeleton />
          <ColumnSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* ── Board Header ───────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          {/* Left: back + title */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-100">{project?.title}</h1>
                <span
                  title={wsConnected ? 'Real-time connected' : 'Reconnecting…'}
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    wsConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-gray-500 animate-pulse'
                  }`}
                />
              </div>
              {project?.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1 max-w-xl">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: member avatars + activity toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMembersOpen(true)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              title="Manage members"
            >
              <div className="flex -space-x-2">
                {members.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    title={m.name}
                    className="w-8 h-8 rounded-full bg-indigo-600/30 border-2 border-gray-900 text-indigo-300 flex items-center justify-center text-xs font-semibold"
                  >
                    {getInitials(m.name)}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-900 text-gray-400 flex items-center justify-center text-xs font-medium">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5" />
                {members.length}
              </div>
            </button>

            {/* Activity panel toggle */}
            <button
              onClick={() => setActivityOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-700/50 bg-gray-800/70 text-gray-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
              {realtimeActivities.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full font-semibold">
                  {realtimeActivities.length > 99 ? '99+' : realtimeActivities.length}
                </span>
              )}
            </button>

            {/* Analytics panel toggle */}
            <button
              onClick={() => setAnalyticsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-700/50 bg-gray-800/70 text-gray-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </div>
        </div>

        {/* Search + Filters bar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setFilter('q', e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-9 pr-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              showFilters || activeFilters
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-gray-800/70 border-gray-700/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilters > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full font-semibold">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex items-center gap-3 mt-3 animate-in slide-in-from-top-1">
            <select
              value={priorityFilter}
              onChange={(e) => setFilter('priority', e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setFilter('assignee', e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              <option value="">All Assignees</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setFilter('priority', '');
                  setFilter('assignee', '');
                }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Board Columns ──────────────────────────────────────────── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-4 sm:gap-5 overflow-x-auto px-4 sm:px-6 py-5 snap-x snap-mandatory sm:snap-none">
          {COLUMNS.map((col) => {
            const colTasks = columns[col.id] || [];
            return (
              <div key={col.id} className="shrink-0 w-[85vw] sm:w-auto sm:flex-1 sm:min-w-[280px] sm:max-w-[380px] flex flex-col snap-center">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h3 className="text-sm font-semibold text-gray-300">{col.label}</h3>
                    <span className="text-xs text-gray-600 font-medium ml-1">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setAddTaskColumn(col.id)}
                    className="p-1 rounded-md text-gray-500 hover:text-indigo-400 hover:bg-gray-800 transition-colors"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2.5 rounded-xl p-2 transition-colors overflow-y-auto ${
                        snapshot.isDraggingOver
                          ? 'bg-indigo-500/5 ring-1 ring-indigo-500/20'
                          : 'bg-gray-900/40'
                      }`}
                    >
                      {colTasks.map((task, index) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={index}
                          onClick={(t) => setSelectedTask(t)}
                        />
                      ))}
                      {provided.placeholder}

                      {/* Empty column state */}
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <button
                          onClick={() => setAddTaskColumn(col.id)}
                          className="w-full py-8 flex flex-col items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors rounded-lg border border-dashed border-gray-800 hover:border-gray-700"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="text-xs">Add a task</span>
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {addTaskColumn && (
        <AddTaskModal
          projectId={projectId}
          members={members}
          column={addTaskColumn}
          isAdmin={isAdmin}
          onClose={() => setAddTaskColumn(null)}
          onCreated={handleTaskCreated}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          projectId={projectId}
          task={selectedTask}
          members={members}
          isAdmin={isAdmin}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {/* ── Activity Timeline Panel ────────────────────────────────── */}
      <ActivityTimeline
        projectId={projectId}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        realtimeItems={realtimeActivities}
        members={members}
      />

      {/* ── Analytics Panel ─────────────────────────────────────────── */}
      <AnalyticsPanel
        projectId={projectId}
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />

      {/* ── Manage Members Modal ───────────────────────────────────── */}
      {membersOpen && (
        <ManageMembersModal
          projectId={projectId}
          members={members}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onClose={() => setMembersOpen(false)}
          onMembersChanged={() => {
            // Re-fetch project to get updated members list
            getProject(projectId).then(({ data }) => setProject(data.project));
          }}
        />
      )}
    </div>
  );
};

export default ProjectBoardPage;
