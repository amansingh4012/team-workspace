import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard, createList, createTask } from '../api';
import TaskCard from '../components/TaskCard';
import toast from 'react-hot-toast';
import { Plus, ArrowLeft, MoreHorizontal } from 'lucide-react';

const BoardView = () => {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [addingTaskForList, setAddingTaskForList] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const fetchBoard = () => {
    getBoard(id)
      .then(({ data }) => setBoard(data.board))
      .catch(() => toast.error('Failed to load board'));
  };

  useEffect(() => {
    fetchBoard();
  }, [id]);

  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await createList({
        title: newListTitle,
        boardId: id,
        position: board?.lists?.length || 0,
      });
      setNewListTitle('');
      setAddingList(false);
      fetchBoard();
      toast.success('List added!');
    } catch {
      toast.error('Failed to add list');
    }
  };

  const handleAddTask = async (listId) => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({
        title: newTaskTitle,
        listId,
        position: 0,
      });
      setNewTaskTitle('');
      setAddingTaskForList(null);
      fetchBoard();
      toast.success('Task added!');
    } catch {
      toast.error('Failed to add task');
    }
  };

  if (!board) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/workspace/${board.workspaceId || ''}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Boards
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{board.title}</h1>
        {board.description && <p className="text-gray-500 mt-1">{board.description}</p>}
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {board.lists
          ?.sort((a, b) => a.position - b.position)
          .map((list) => (
            <div key={list.id} className="bg-gray-100 rounded-xl p-4 min-w-[300px] max-w-[300px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{list.title}</h3>
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                  {list.tasks?.length || 0}
                </span>
              </div>

              <div className="space-y-3">
                {list.tasks
                  ?.sort((a, b) => a.position - b.position)
                  .map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
              </div>

              {addingTaskForList === list.id ? (
                <div className="mt-3">
                  <input
                    type="text"
                    autoFocus
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask(list.id)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Task title..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAddTask(list.id)}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingTaskForList(null);
                        setNewTaskTitle('');
                      }}
                      className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTaskForList(list.id)}
                  className="mt-3 flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 w-full py-1.5 hover:bg-gray-200 rounded-lg px-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add task
                </button>
              )}
            </div>
          ))}

        {/* Add List */}
        {addingList ? (
          <div className="bg-gray-100 rounded-xl p-4 min-w-[300px] max-w-[300px] flex-shrink-0">
            <form onSubmit={handleAddList}>
              <input
                type="text"
                autoFocus
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="List title..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                >
                  Add List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingList(false);
                    setNewListTitle('');
                  }}
                  className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setAddingList(true)}
            className="bg-gray-100/80 hover:bg-gray-100 rounded-xl p-4 min-w-[300px] max-w-[300px] flex-shrink-0 flex items-center gap-2 text-gray-500 hover:text-indigo-600 border-2 border-dashed border-gray-300 hover:border-indigo-300 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add List
          </button>
        )}
      </div>
    </div>
  );
};

export default BoardView;
