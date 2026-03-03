export const classNames = (...classes) => classes.filter(Boolean).join(' ');

export const getInitials = (name) =>
  name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

export const priorityColors = {
  low: 'bg-green-900/40 text-green-400 border border-green-800/50',
  medium: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50',
  high: 'bg-red-900/40 text-red-400 border border-red-800/50',
};

export const statusConfig = {
  todo: { label: 'To Do', color: 'text-gray-400', bg: 'bg-gray-500' },
  inprogress: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500' },
  done: { label: 'Done', color: 'text-green-400', bg: 'bg-green-500' },
};
