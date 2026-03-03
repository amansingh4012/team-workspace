import { Draggable } from 'react-beautiful-dnd';
import { getInitials, priorityColors } from '../utils/helpers';
import { Calendar, Paperclip } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const TaskCard = ({ task, index, onClick }) => {
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = dueDateObj && isPast(dueDateObj) && !isToday(dueDateObj) && task.status !== 'done';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick?.(task)}
          className={`group bg-gray-800/80 rounded-lg border p-3.5 cursor-pointer transition-all
            ${snapshot.isDragging
              ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30 rotate-2 scale-[1.02]'
              : 'border-gray-700/60 hover:border-gray-600 hover:bg-gray-800'
            }`}
        >
          {/* Title */}
          <h4 className="text-sm font-medium text-gray-100 leading-snug mb-2 line-clamp-2">
            {task.title}
          </h4>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.priority && (
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>
            )}

            {dueDateObj && (
              <span
                className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${
                  overdue
                    ? 'bg-red-900/40 text-red-400'
                    : isToday(dueDateObj)
                      ? 'bg-yellow-900/40 text-yellow-400'
                      : 'text-gray-400'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {format(dueDateObj, 'MMM d')}
              </span>
            )}

            {task.attachmentUrl && (
              <span className="text-gray-500">
                <Paperclip className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Footer: assignee */}
          {task.assignee && (
            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-700/40">
              <div
                className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-[10px] font-semibold"
                title={task.assignee.name}
              >
                {getInitials(task.assignee.name)}
              </div>
              <span className="text-[11px] text-gray-400 truncate">
                {task.assignee.name}
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
