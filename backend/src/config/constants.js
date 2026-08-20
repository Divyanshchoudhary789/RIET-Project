const ROLES = {
  CHAIRPERSON: 'chairperson',
  DIRECTOR: 'director',
  CENTER_HEAD: 'center_head',
  CLUSTER_MANAGER: 'cluster_manager',
  DEPARTMENT_ADMIN: 'department_admin',
  PO_OFFICE: 'po_office',
  ACCOUNTS: 'accounts',
};

const ROLE_LABELS = {
  [ROLES.CHAIRPERSON]: 'Chairperson',
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.CENTER_HEAD]: 'Center Head',
  [ROLES.CLUSTER_MANAGER]: 'Cluster Manager',
  [ROLES.DEPARTMENT_ADMIN]: 'Department Admin',
  [ROLES.PO_OFFICE]: 'PO Office',
  [ROLES.ACCOUNTS]: 'Accounts',
};

const DOCUMENT_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  FORWARDED: 'forwarded',
  REJECTED: 'rejected',
  REVISED: 'revised',
  APPROVED: 'approved',
  CLOSED: 'closed',
};

const TIMELINE_ACTIONS = {
  SUBMITTED: 'Submitted',
  FORWARDED: 'Forwarded',
  REJECTED: 'Rejected',
  APPROVED: 'Approved',
  REVISED: 'Revised',
  CREATED: 'Created',
  RECEIVED: 'Received',
  CLOSED: 'Closed',
};

const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

const CAMPUSES = [
  { name: 'SGS Bharatpur', code: 'SGS', location: 'Bharatpur, Rajasthan' },
  { name: 'SJS Gandhipath', code: 'SJS-G', location: 'Gandhipath, Jaipur, Rajasthan' },
  { name: 'SHS Dhawas', code: 'SHS', location: 'Dhawas, Jaipur, Rajasthan' },
  { name: 'RIET', code: 'RIET', location: 'Bhankrota, Ajmer Road, Jaipur, Rajasthan' },
  { name: 'SJS Hawasadak', code: 'SJS-H', location: 'Hawasadak, Jaipur, Rajasthan' },
];

const DEPARTMENTS = [
  { name: 'HR', code: 'HR' },
  { name: 'Infra', code: 'INFRA' },
  { name: 'Marketing', code: 'MKT' },
  { name: 'Admin', code: 'ADMIN' },
  { name: 'Academics', code: 'ACAD' },
  { name: 'Operations', code: 'OPS' },
  { name: 'Student Development', code: 'SD' },
  { name: 'Event', code: 'EVENT' },
];

const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  PASSWORD_RESET: '15m',
};

const RATE_LIMIT = {
  // Set RATE_LIMIT_ENABLED=false in .env to disable rate limiting in development
  ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',

  AUTH_WINDOW_MS: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000,
  AUTH_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10,

  GLOBAL_WINDOW_MS: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 10) || 15 * 60 * 1000,
  GLOBAL_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10) || 200,
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000;

module.exports = {
  ROLES,
  ROLE_LABELS,
  DOCUMENT_STATUS,
  TIMELINE_ACTIONS,
  PRIORITY_LEVELS,
  CAMPUSES,
  DEPARTMENTS,
  TOKEN_EXPIRY,
  RATE_LIMIT,
  MAX_LOGIN_ATTEMPTS,
  LOCK_TIME_MS,
};
