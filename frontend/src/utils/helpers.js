/**
 * Format a date string or Date object to a readable format.
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(d);
};

/**
 * Format a date with time.
 */
export const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/**
 * Relative time (e.g. "2 hours ago").
 */
export const timeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

/**
 * Format a number as Indian currency.
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Extract error message from an axios error.
 */
export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    'An unexpected error occurred.'
  );
};

/**
 * Map a status string to a badge CSS class.
 */
export const getStatusClass = (status) => {
  if (!status) return 'badge-closed';
  return `badge-${status.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')}`;
};

/**
 * Map a priority string to a badge CSS class.
 */
export const getPriorityClass = (priority) => {
  if (!priority) return 'badge-low';
  return `badge-${priority.toLowerCase()}`;
};

/**
 * Truncate text to a max length.
 */
export const truncate = (text, maxLength = 60) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
};

/**
 * Map role enum to display label.
 */
export const ROLE_LABELS = {
  chairperson: 'Chairperson',
  director: 'Director',
  center_head: 'Center Head',
  cluster_manager: 'Cluster Manager',
  department_admin: 'Department Admin',
  po_office: 'PO Office',
  accounts: 'Accounts',
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || role;

/**
 * Map role to dashboard base path.
 */
export const ROLE_PATHS = {
  chairperson: '/chairperson',
  director: '/director',
  center_head: '/center-head',
  cluster_manager: '/cluster-manager',
  department_admin: '/department-admin',
  po_office: '/po-office',
  accounts: '/accounts',
};

export const getDashboardPath = (role) => ROLE_PATHS[role] || '/login';
