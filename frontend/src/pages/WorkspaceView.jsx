import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWorkspace, getBoards, createBoard } from '../api';
import toast from 'react-hot-toast';
import { Plus, Columns3, ArrowLeft } from 'lucide-react';

const WorkspaceView = () => {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getWorkspace(id)
      .then(({ data }) => setWorkspace(data.workspace))
      .catch(() => toast.error('Failed to load workspace'));

    getBoards(id)
      .then(({ data }) => setBoards(data.boards))
      .catch(() => toast.error('Failed to load boards'));
  }, [id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createBoard({ ...form, workspaceId: id });
      setBoards([...boards, data.board]);
      setShowModal(false);
      setForm({ title: '', description: '' });
      toast.success('Board created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Workspaces
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workspace?.name}</h1>
            <p className="text-gray-500 mt-1">{workspace?.description}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Board
          </button>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-16">
          <Columns3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No boards yet</h3>
          <p className="text-gray-500 mb-4">Create a board to start organizing tasks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/board/${board.id}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <Columns3 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {board.title}
                </h3>
              </div>
              {board.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{board.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Board</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Sprint Board"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Board description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceView;
