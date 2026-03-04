import { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Trash2,
  Paperclip,
  Calendar,
  Upload,
  Clock,
  FileText,
} from 'lucide-react';
import { updateTask, deleteTask, uploadAttachment, getActivities } from '../api';
import { getInitials, priorityColors, statusConfig } from '../utils/helpers';
import { format, formatDistanceToNow } from 'date-fns';
import useAuthStore from '../store/authStore';
import ConfirmDialog from './ConfirmDialog';
import toast from 'react-hot-toast';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'inprogress', 'done'];

const TaskDetailModal = ({ projectId, task, members = [], isAdmin = false, onClose, onUpdated, onDeleted }) => {
  const { user } = useAuthStore();
  const fileRef = useRef(null);

  // Can this user change the task status?
  const canChangeStatus = isAdmin || (task.assigneeId && task.assigneeId === user?.id);

  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    assigneeId: task.assigneeId || task.assignee?.id || '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  });

  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync form with incoming prop changes (real-time WS updates) when user hasn't edited
  useEffect(() => {
    if (!dirty) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assigneeId: task.assigneeId || task.assignee?.id || '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      });
    }
  }, [task, dirty]);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data } = await getActivities(projectId, { entityId: task.id, limit: 20 });
      setActivities(data.activities || []);
    } catch {
      // Silently fail — activities are supplementary
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !dirty) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate || null,
      };
      const { data } = await updateTask(projectId, task.id, payload);
      toast.success('Task updated');
      setDirty(false);
      onUpdated?.(data.task);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTask(projectId, task.id);
      toast.success('Task deleted');
      onDeleted?.(task.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadAttachment(projectId, task.id, file);
      toast.success('Attachment uploaded');
      onUpdated?.(data.task);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl mb-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span
              className={`w-2 h-2 rounded-full ${statusConfig[task.status]?.bg || 'bg-gray-500'}`}
            />
            <h2 className="text-lg font-semibold text-gray-100">Task Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Add a description…"
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
              {canChangeStatus ? (
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusConfig[s].label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="px-3.5 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 text-sm">
                  {statusConfig[form.status]?.label || form.status}
                  <span className="block text-xs text-gray-500 mt-0.5 italic">Only the assignee or admin can change status</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Assignee</label>
              {isAdmin ? (
                <select
                  name="assigneeId"
                  value={form.assigneeId}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="px-3.5 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 text-sm">
                  {members.find(m => m.id === form.assigneeId)?.name || 'Unassigned'}
                  <span className="block text-xs text-gray-500 mt-0.5 italic">Only admins can reassign</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Attachment</label>
            {task.attachmentUrl ? (
              <a
                href={task.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View attachment
              </a>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Uploading…' : 'Upload file'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Activity log */}
          {activities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2 text-xs text-gray-400"
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[9px] font-semibold text-gray-400 shrink-0 mt-0.5">
                      {a.user ? getInitials(a.user.name) : '?'}
                    </div>
                    <div>
                      <span className="text-gray-300">{a.user?.name || 'Someone'}</span>{' '}
                      {a.action}
                      <span className="block text-gray-600 mt-0.5">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty || !form.title.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Delete confirmation dialog */}
    <ConfirmDialog
      open={confirmDelete}
      title="Delete task?"
      message={`"${task.title}" will be permanently deleted. This action cannot be undone.`}
      confirmText="Delete"
      variant="danger"
      loading={deleting}
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  );
};

export default TaskDetailModal;
