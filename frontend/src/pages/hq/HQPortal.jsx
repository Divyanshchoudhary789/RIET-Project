import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/hq.css';

/* ══════════════════════════════════════════════
   STATIC DEMO DATA
═══════════════════════════════════════════════ */
const REQUIREMENTS = [
  {
    id: 'REQ-2024-001',
    memoId: 'MEMO-001',
    poId: 'PO-2024-001',
    campus: 'SHS School',
    campusKey: 'shs',
    dept: 'Academics',
    deptIcon: '📚',
    priority: 'High',
    items: 'A4 Paper Ream × 50 Ream',
    raisedBy: 'Mr. Sharma',
    date: '2024-01-10',
    status: 'PO Generated',
    statusKey: 'po-gen',
    step: 7,
    totalSteps: 10,
    progressColor: '#3b82f6',
  },
  {
    id: 'REQ-2024-002',
    memoId: 'MEMO-002',
    poId: null,
    campus: 'RIET Engineering',
    campusKey: 'riet',
    dept: 'Infrastructure',
    deptIcon: '🏗️',
    priority: 'Medium',
    items: 'Cement Bag × 100 Bag',
    raisedBy: 'Er. Verma',
    date: '2024-01-12',
    status: 'Awaiting Chairperson Approval',
    statusKey: 'await-chair',
    step: 5,
    totalSteps: 10,
    progressColor: '#ef4444',
  },
  {
    id: 'REQ-2024-003',
    memoId: null,
    poId: null,
    campus: 'Kindergarten Hawasadak',
    campusKey: 'kgh',
    dept: 'Uniform',
    deptIcon: '👕',
    priority: 'High',
    items: 'School Uniform Set × 40 Set',
    raisedBy: 'Ms. Gupta',
    date: '2024-01-14',
    status: 'Regional Head Review',
    statusKey: 'rh-review',
    step: 2,
    totalSteps: 10,
    progressColor: '#f59e0b',
  },
  {
    id: 'REQ-2024-004',
    memoId: null,
    poId: null,
    campus: 'Junior School',
    campusKey: 'jsc',
    dept: 'Maintenance',
    deptIcon: '🔧',
    priority: 'Low',
    items: 'Paint (Emulsion) × 20 Litre',
    raisedBy: 'Mr. Patel',
    date: '2024-01-15',
    status: 'Requirement Raised',
    statusKey: 'req-raised',
    step: 1,
    totalSteps: 10,
    progressColor: '#6366f1',
  },
];

const CAMPUSES = [
  { abbr: 'SHS', name: 'SHS School',             key: 'shs',  total: 1, pending: 1 },
  { abbr: 'JSC', name: 'Junior School',           key: 'jsc',  total: 1, pending: 1 },
  { abbr: 'SGS', name: 'SGS Bharatpur',           key: 'sgs',  total: 0, pending: 0 },
  { abbr: 'RIET',name: 'RIET Engineering',        key: 'riet', total: 1, pending: 1 },
  { abbr: 'KGH', name: 'Kindergarten Hawasadak',  key: 'kgh',  total: 1, pending: 1 },
];

const INVENTORY = [
  { item: 'A4 Paper Ream',      qty: 45, unit: 'Ream',  dept: '📚 Academics',      status: 'OK' },
  { item: 'Whiteboard Marker',  qty: 12, unit: 'Box',   dept: '📚 Academics',      status: 'OK' },
  { item: 'Cement Bag',         qty: 5,  unit: 'Bag',   dept: '🏗️ Infrastructure', status: 'Low' },
  { item: 'School Uniform Set', qty: 30, unit: 'Set',   dept: '👕 Uniform',        status: 'OK' },
  { item: 'Paint (Emulsion)',   qty: 8,  unit: 'Litre', dept: '🔧 Maintenance',    status: 'Low' },
  { item: 'Desks & Chairs',     qty: 10, unit: 'Set',   dept: '🏗️ Infrastructure', status: 'OK' },
  { item: 'Lab Equipment Kit',  qty: 3,  unit: 'Kit',   dept: '📚 Academics',      status: 'Low' },
  { item: 'Sports Shoes',       qty: 20, unit: 'Pair',  dept: '👕 Uniform',        status: 'OK' },
];

const PO_LIST = [
  {
    poNumber: 'PO-2024-001',
    reqId: 'REQ-2024-001',
    items: 'A4 Paper Ream ×50',
    campus: '● SHS',
    campusKey: 'shs',
    dept: '📚 Academics',
    status: 'PO Generated',
  },
];

const ROLE_TABS = ['Campus', 'Regional Head', 'Purchase Manager', 'Chairperson', 'Accounts', 'Inventory', 'HQ'];

/* ── filter requirements by role tab ── */
function filterByRole(reqs, role) {
  if (role === 'HQ') return reqs;
  if (role === 'Inventory') return [];
  if (role === 'Regional Head') return reqs.filter(r => r.campusKey === 'kgh');
  if (role === 'Purchase Manager') return reqs.filter(r => r.statusKey === 'po-gen');
  if (role === 'Chairperson') return reqs.filter(r => r.statusKey === 'await-chair');
  if (role === 'Accounts') return reqs.filter(r => r.statusKey === 'po-gen');
  return reqs; // Campus
}

/* ══════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════ */

/* ── New Requirement Modal ── */
function NewRequirementModal({ onClose }) {
  const campuses = ['SHS School', 'Junior School', 'SGS Bharatpur', 'RIET Engineering', 'Kindergarten Hawasadak'];
  const departments = ['Academics', 'Infrastructure', 'Uniform', 'Maintenance', 'Sports'];
  const priorities = ['Low', 'Medium', 'High'];

  const [form, setForm] = useState({ campus: 'SHS School', dept: 'Academics', raisedBy: '', priority: 'Medium' });
  const [items, setItems] = useState([{ name: '', qty: 1, unit: '', remarks: '' }]);

  const addItem = () => setItems(prev => [...prev, { name: '', qty: 1, unit: '', remarks: '' }]);

  const handleItemChange = (i, field, val) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  return (
    <div className="hq-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hq-modal">
        <div className="hq-modal-header">
          <span className="hq-modal-title">New Requirement</span>
          <button className="hq-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="hq-modal-row">
          <div className="hq-modal-field">
            <label className="hq-modal-label">CAMPUS <span className="hq-required">*</span></label>
            <select className="hq-modal-select" value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))}>
              {campuses.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="hq-modal-field">
            <label className="hq-modal-label">DEPARTMENT <span className="hq-required">*</span></label>
            <select className="hq-modal-select" value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="hq-modal-row">
          <div className="hq-modal-field">
            <label className="hq-modal-label">RAISED BY <span className="hq-required">*</span></label>
            <input className="hq-modal-input" placeholder="Your name" value={form.raisedBy} onChange={e => setForm(f => ({ ...f, raisedBy: e.target.value }))} />
          </div>
          <div className="hq-modal-field">
            <label className="hq-modal-label">PRIORITY</label>
            <select className="hq-modal-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {priorities.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="hq-items-header">
          <label className="hq-modal-label">ITEMS <span className="hq-required">*</span></label>
          <button className="hq-add-item-btn" onClick={addItem}>+ Add Item</button>
        </div>

        {items.map((item, i) => (
          <div className="hq-item-row" key={i}>
            <input className="hq-modal-input" placeholder="Item name" value={item.name} onChange={e => handleItemChange(i, 'name', e.target.value)} />
            <input className="hq-modal-input" type="number" min="1" value={item.qty} onChange={e => handleItemChange(i, 'qty', e.target.value)} />
            <input className="hq-modal-input" placeholder="Unit" value={item.unit} onChange={e => handleItemChange(i, 'unit', e.target.value)} />
            <input className="hq-modal-input" placeholder="Remarks" value={item.remarks} onChange={e => handleItemChange(i, 'remarks', e.target.value)} />
          </div>
        ))}

        <div className="hq-modal-footer">
          <button className="hq-modal-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="hq-modal-submit-btn" onClick={onClose}>Submit Requirement</button>
        </div>
      </div>
    </div>
  );
}

/* ── Requirement Card ── */
function ReqCard({ req }) {
  const priorityKey = req.priority.toLowerCase();
  const progress = (req.step / req.totalSteps) * 100;

  return (
    <div className="hq-req-card">
      <div className="hq-req-card-header">
        <div className="hq-req-ids">
          <span className="hq-req-id">{req.id}</span>
          {req.memoId && <span className="hq-req-badge memo">{req.memoId}</span>}
          {req.poId   && <span className="hq-req-badge po">{req.poId}</span>}
        </div>
        <span className={`hq-status-badge ${req.statusKey}`}>{req.status}</span>
      </div>

      <div className="hq-req-meta">
        <span className={`hq-campus-dot ${req.campusKey}`}>{req.campus}</span>
        <span className="hq-req-dept">{req.deptIcon} {req.dept}</span>
        <span className={`hq-priority-badge ${priorityKey}`}>{req.priority}</span>
      </div>

      <p className="hq-req-items">• {req.items}</p>

      <div className="hq-req-progress">
        <div className="hq-req-progress-bar" style={{ width: `${progress}%`, background: req.progressColor }} />
      </div>

      <div className="hq-req-footer">
        <span className="hq-req-footer-meta">By {req.raisedBy} · {req.date}</span>
        <span className="hq-req-footer-meta">Step {req.step}/{req.totalSteps}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════ */

/* ── Dashboard Page ── */
function DashboardPage({ onNewReq }) {
  const stats = [
    { label: 'Total Requirements', value: 4, icon: '🗒️', color: 'blue' },
    { label: 'In Progress',        value: 4, icon: '⏳', color: 'orange' },
    { label: 'Approved / PO',      value: 1, icon: '✅', color: 'green' },
    { label: 'Completed',          value: 0, icon: '🏁', color: 'purple' },
  ];

  return (
    <>
      <h1 className="hq-page-title">HQ Dashboard</h1>
      <p className="hq-page-subtitle">Central procurement overview across all 5 campuses</p>

      {/* Stat Cards */}
      <div className="hq-stat-grid">
        {stats.map(s => (
          <div key={s.label} className={`hq-stat-card ${s.color}`}>
            <div className="hq-stat-icon">{s.icon}</div>
            <div className="hq-stat-number">{s.value}</div>
            <div className="hq-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Campus Cards */}
      <div className="hq-campus-grid">
        {CAMPUSES.map(c => (
          <div key={c.key} className={`hq-campus-card ${c.key}`}>
            <div className="hq-campus-abbr">{c.abbr}</div>
            <div className="hq-campus-name">{c.name}</div>
            <div className="hq-campus-stats">
              <div className="hq-campus-stat">
                <span className="hq-campus-stat-num">{c.total}</span>
                <span className="hq-campus-stat-label">Total</span>
              </div>
              <div className="hq-campus-stat">
                <span className={`hq-campus-stat-num${c.pending > 0 ? ' pending' : ''}`}>{c.pending}</span>
                <span className="hq-campus-stat-label">Pending</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requirements */}
      <div className="hq-recent-header">
        <span className="hq-recent-title">Recent Requirements</span>
        <button className="hq-new-req-btn" onClick={onNewReq}>+ New Requirement</button>
      </div>

      <div className="hq-req-table-wrap">
        {REQUIREMENTS.map(req => {
          const campusColor = { shs: '#2563eb', jsc: '#16a34a', sgs: '#d97706', riet: '#9333ea', kgh: '#dc2626' }[req.campusKey];
          return (
            <div className="hq-req-row" key={req.id}>
              <span className="hq-req-row-id">{req.id}</span>
              <div>
                <div className="hq-req-row-name">{req.items.split(' × ')[0]}</div>
                <div className="hq-req-row-dept">{req.deptIcon} {req.dept}</div>
              </div>
              <span className="hq-req-row-campus" style={{ color: campusColor }}>● {req.campusKey.toUpperCase()}</span>
              <span className={`hq-status-badge ${req.statusKey}`}>{req.status}</span>
              <span className={`hq-priority-badge ${req.priority.toLowerCase()}`}>{req.priority}</span>
              <span className="hq-req-row-date">{req.date}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Requirements Page ── */
function RequirementsPage({ onNewReq }) {
  const [activeRole, setActiveRole] = useState('HQ');
  const filtered = filterByRole(REQUIREMENTS, activeRole);

  return (
    <>
      <div className="hq-req-header">
        <h1 className="hq-page-title">Requirements</h1>
        <button className="hq-new-req-btn" onClick={onNewReq}>+ New Requirement</button>
      </div>

      <div className="hq-role-tabs">
        {ROLE_TABS.map(tab => (
          <button
            key={tab}
            className={`hq-role-tab${activeRole === tab ? ' active' : ''}`}
            onClick={() => setActiveRole(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="hq-empty-state">
          <div className="hq-empty-state-icon">📭</div>
          <div className="hq-empty-state-title">No requirements for {activeRole}</div>
          <div className="hq-empty-state-sub">Switch roles to view pending actions</div>
        </div>
      ) : (
        filtered.map(req => <ReqCard key={req.id} req={req} />)
      )}
    </>
  );
}

/* ── Inventory Page ── */
function InventoryPage() {
  const lowStock = INVENTORY.filter(i => i.status === 'Low');

  return (
    <>
      <h1 className="hq-page-title">Inventory Management</h1>
      <p className="hq-page-subtitle">Current stock levels at HQ</p>

      <div style={{ marginTop: 24 }}>
        <div className="hq-table-wrapper">
          <table className="hq-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {INVENTORY.map(row => (
                <tr key={row.item}>
                  <td style={{ fontWeight: 500 }}>{row.item}</td>
                  <td className={row.status === 'Low' ? 'hq-qty-low' : 'hq-qty-ok'}>{row.qty}</td>
                  <td style={{ color: '#7a6a52' }}>{row.unit}</td>
                  <td>{row.dept}</td>
                  <td>
                    <span className={row.status === 'Low' ? 'hq-inv-status-low' : 'hq-inv-status-ok'}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {lowStock.length > 0 && (
          <div className="hq-alerts-box">
            <div className="hq-alerts-title">⚠️ Low Stock Alerts</div>
            {lowStock.map(i => (
              <div key={i.item} className="hq-alert-item">
                {i.item}: only {i.qty} {i.unit} remaining
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── PO Page ── */
function POPage() {
  return (
    <>
      <h1 className="hq-page-title">Purchase Orders</h1>
      <p className="hq-page-subtitle">All generated purchase orders</p>

      <div style={{ marginTop: 24 }}>
        <div className="hq-table-wrapper">
          <table className="hq-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Req ID</th>
                <th>Items</th>
                <th>Campus</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PO_LIST.map(po => (
                <tr key={po.poNumber}>
                  <td><span className="hq-table-link">{po.poNumber}</span></td>
                  <td style={{ color: '#7a6a52' }}>{po.reqId}</td>
                  <td>{po.items}</td>
                  <td>
                    <span className="hq-req-row-campus" style={{
                      color: { shs: '#2563eb', jsc: '#16a34a', sgs: '#d97706', riet: '#9333ea', kgh: '#dc2626' }[po.campusKey]
                    }}>
                      {po.campus}
                    </span>
                  </td>
                  <td>{po.dept}</td>
                  <td><span className="hq-status-badge po-gen">{po.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Workflow Page ── */
function WorkflowPage() {
  const steps = [
    { n: 1, title: 'Requirement Raised',          by: 'Campus',           cls: 's1' },
    { n: 2, title: 'Regional Head Review',         by: 'Regional Head',    cls: 's2' },
    { n: 3, title: 'Memo Generated',               by: 'Regional Head',    cls: 's3' },
    { n: 4, title: 'Inventory Check',              by: 'Purchase Manager', cls: 's4' },
    { n: 5, title: 'Awaiting Chairperson Approval',by: 'Chairperson',      cls: 's5' },
    { n: 6, title: 'Approved',                     by: 'Chairperson',      cls: 's6' },
    { n: 7, title: 'PO Generated',                 by: 'Purchase Manager', cls: 's7' },
    { n: 8, title: 'Proforma Invoice Received',    by: 'Accounts',         cls: 's8' },
    { n: 9, title: 'Payment Processed',            by: 'Accounts',         cls: 's9' },
    { n: 10,title: 'Completed',                    by: 'HQ Admin',         cls: 's10' },
  ];

  const memoCategories = [
    { name: '🏗️ Infrastructure', count: 1 },
    { name: '📚 Academics',      count: 1 },
    { name: '👕 Uniform',        count: 1 },
    { name: '🔧 Maintenance',    count: 1 },
  ];

  return (
    <>
      <h1 className="hq-page-title">Procurement Workflow</h1>
      <p className="hq-page-subtitle">Standard operating procedure for purchase orders</p>

      <div className="hq-workflow-grid">
        {/* Process Steps */}
        <div className="hq-workflow-card">
          <div className="hq-workflow-card-title">Process Steps</div>
          {steps.map(s => (
            <div className="hq-process-step" key={s.n}>
              <div className={`hq-step-num ${s.cls}`}>{s.n}</div>
              <div>
                <div className="hq-step-info-title">{s.title}</div>
                <div className="hq-step-info-sub">Handled by: {s.by}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Campuses */}
          <div className="hq-workflow-card">
            <div className="hq-workflow-card-title">Campuses</div>
            {CAMPUSES.map(c => (
              <div className="hq-campus-list-item" key={c.key}>
                <div className={`hq-campus-chip ${c.key}`}>{c.abbr}</div>
                <div>
                  <div className="hq-campus-list-name">{c.name}</div>
                  <div className="hq-campus-list-count">{c.total} requirement{c.total !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Memo Categories */}
          <div className="hq-workflow-card">
            <div className="hq-workflow-card-title">Memo Categories</div>
            {memoCategories.map(cat => (
              <div className="hq-memo-cat-item" key={cat.name}>
                <span className="hq-memo-cat-name">{cat.name}</span>
                <span className="hq-memo-cat-count">{cat.count} reqs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   MAIN HQ PORTAL
═══════════════════════════════════════════════ */
export default function HQPortal() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showModal, setShowModal] = useState(false);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const tabs = ['Dashboard', 'Requirements', 'Inventory', 'PO', 'Workflow'];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'Dashboard':    return <DashboardPage onNewReq={() => setShowModal(true)} />;
      case 'Requirements': return <RequirementsPage onNewReq={() => setShowModal(true)} />;
      case 'Inventory':    return <InventoryPage />;
      case 'PO':           return <POPage />;
      case 'Workflow':     return <WorkflowPage />;
      default:             return <DashboardPage onNewReq={() => setShowModal(true)} />;
    }
  };

  return (
    <div className="hq-portal">
      {/* Navbar */}
      <nav className="hq-navbar">
        <div className="hq-navbar-brand">
          <div className="hq-navbar-avatar">S</div>
          <div className="hq-navbar-brand-text">
            <div className="hq-navbar-brand-name">Sapiens Group</div>
            <div className="hq-navbar-brand-sub">Purchase Order Management</div>
          </div>
        </div>

        <div className="hq-navbar-nav">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`hq-nav-btn${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="hq-navbar-right">
          <span className="hq-navbar-role-label">Role:</span>
          <div className="hq-navbar-role-badge">HQ ▾</div>
          <button className="hq-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* Page */}
      <div className="hq-content">
        {renderPage()}
      </div>

      {/* New Requirement Modal */}
      {showModal && <NewRequirementModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
