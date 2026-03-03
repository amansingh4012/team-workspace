import { useState } from 'react';
import { X, UserPlus, Trash2, Loader2, Shield, Crown } from 'lucide-react';
import { addProjectMember, removeProjectMember } from '../api';
import { getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

/**
 * Modal to view, add, and remove project members.
 *
 * Props:
 *   projectId  – current project ID
 *   members    – array of current members [{ id, name, email, avatar, ProjectMember: { role } }]
 *   currentUserId – the logged-in user's ID
 *   isAdmin    – whether the logged-in user is an admin of this project
 *   onClose    – callback to close the modal
 *   onMembersChanged – callback to refresh project data after add/remove
 */
const ManageMembersModal = ({
  projectId,
  members = [],
  currentUserId,
  isAdmin = false,
  onClose,
  onMembersChanged,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await addProjectMember(projectId, { email: email.trim(), role });
      toast.success(`Added ${email.trim()} to the project`);
      setEmail('');
      onMembersChanged?.();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add member';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId, userName) => {
    setRemovingId(userId);
    try {
      await removeProjectMember(projectId, userId);
      toast.success(`Removed ${userName} from the project`);
      onMembersChanged?.();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove member';
      toast.error(msg);
    } finally {
      setRemovingId(null);
    }
  };

  const getMemberRole = (member) => {
    return member.ProjectMember?.role || member.role || 'member';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">Manage Members</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add member form (admin only) */}
        {isAdmin && (
          <form onSubmit={handleAdd} className="px-6 pt-4 pb-3 border-b border-gray-800">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Invite by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={adding}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </form>
        )}

        {/* Members list */}
        <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No members yet</p>
          ) : (
            members.map((m) => {
              const memberRole = getMemberRole(m);
              const isMe = m.id === currentUserId;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-gray-700 text-indigo-300 flex items-center justify-center text-xs font-semibold">
                      {getInitials(m.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {m.name}
                        {isMe && <span className="text-xs text-gray-500 ml-1.5">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Role badge */}
                    {memberRole === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                        <Crown className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-gray-800 text-gray-400 border border-gray-700 rounded-full">
                        <Shield className="w-3 h-3" />
                        Member
                      </span>
                    )}

                    {/* Remove button (admin only, can't remove self) */}
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => handleRemove(m.id, m.name)}
                        disabled={removingId === m.id}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title={`Remove ${m.name}`}
                      >
                        {removingId === m.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            {isAdmin
              ? 'Add teammates by their registered email address. They can then be assigned to tasks.'
              : 'Only project admins can add or remove members.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManageMembersModal;
