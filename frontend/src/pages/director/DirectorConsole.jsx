import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/director-console.css';

/* ══════════════════════════════════════════════
   EXACT DEMO DATA
═══════════════════════════════════════════════ */

// Memos & Approvals (Images 2 & 3)
const INITIAL_MEMOS = [
  {
    id: 1,
    title: 'Faculty recruitment approval - CS dept',
    description: 'Three senior faculty positions need to be approved for the Computer Science department for the upcoming semester.',
    from: 'Priya Sharma · Regional Head - West · West · Mumbai Campus',
    status: 'Received',
    date: '04/06/2026',
    isPurchase: false,
    isHigh: false,
  },
  {
    id: 2,
    title: 'Annual sports meet budget',
    description: 'Proposing a budget of 4.5L for the annual inter-campus sports meet scheduled in March. Detailed breakdown attached.',
    from: 'Ravi Iyer · Regional Head - South · South · Bangalore Campus',
    status: 'Received',
    date: '04/06/2026',
    isPurchase: false,
    isHigh: false,
  },
  {
    id: 3,
    title: 'Library book purchase - reference set',
    description: 'Procurement request for 120 reference titles to update the Engineering library. Estimated cost 2.8L.',
    from: 'Sneha Kapoor · Regional Head - East · East · Kolkata Campus',
    status: 'Received',
    date: '04/06/2026',
    isPurchase: true,
    isHigh: false,
  },
  {
    id: 4,
    title: 'Request for new projectors - 5 units',
    description: 'Auditorium AV equipment urgently needs upgrade. Requesting 5 BenQ projectors for the main hall and 2 classrooms.',
    from: 'Amit Verma · Regional Head - North · North · Delhi Main Campus',
    status: 'With Chairperson',
    date: '04/06/2026',
    isPurchase: true,
    isHigh: true,
  },
];

// Circulars (Image 1)
const INITIAL_CIRCULARS = [
  {
    id: 1,
    title: 'Mid-term exam schedule released',
    timestamp: '04/06/2026, 14:47:32',
    region: 'all',
    dept: 'academics',
    campus: 'all',
    audience: 'Everyone (broadcast)',
    body: 'The mid-term examination schedule for the current semester has been finalized. All campus heads are requested to communicate it to faculty and students by end of week.',
  },
  {
    id: 2,
    title: 'Quarterly marketing review meeting',
    timestamp: '04/06/2026, 14:47:32',
    region: 'all',
    dept: 'marketing',
    campus: 'all',
    audience: 'Regional Heads',
    body: 'A quarterly marketing performance review will be held next Friday at 11 AM via video conference. All regional heads must attend with admission data.',
  },
];

// Activity Feed
const INITIAL_ACTIVITIES = [
  {
    id: 1,
    action: 'Forwarded to Chairperson',
    timestamp: '04/06/2026, 16:07:29',
    memoTitle: 'Request for new projectors - 5 units',
    role: 'Director',
    priority: 'HIGH',
    note: '"urgently required"',
  },
];

/* ══════════════════════════════════════════════
   NEW INCOMING MEMO MODAL (Images 2 & 3)
═══════════════════════════════════════════════ */
function NewIncomingMemoModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromRole, setFromRole] = useState('Regional Head');
  const [region, setRegion] = useState('');
  const [campus, setCampus] = useState('');
  const [category, setCategory] = useState('General (Chairperson → Accounts)');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const isPurchase = category.includes('Purchase');

    onSubmit({
      id: Date.now(),
      title: title.trim(),
      description: body.trim(),
      from: `${fromName || 'Regional Head'} · ${fromRole || 'Regional Head'} ${region ? '· ' + region : ''} ${campus ? '· ' + campus : ''}`,
      status: 'Received',
      date: dateStr,
      isPurchase,
      isHigh: false,
    });

    onClose();
  };

  return (
    <div className="dc-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dc-modal">
        <div className="dc-modal-header">
          <h2 className="dc-modal-title">New incoming memo</h2>
          <button type="button" className="dc-modal-close" onClick={onClose}>×</button>
        </div>
        <p className="dc-modal-sub">Record a memo received from a Regional Head.</p>

        <form onSubmit={handleSubmit}>
          <div className="dc-modal-field">
            <label className="dc-modal-label">Title</label>
            <input
              type="text"
              className="dc-modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder=""
              required
            />
          </div>

          <div className="dc-modal-field">
            <label className="dc-modal-label">Body</label>
            <textarea
              className="dc-modal-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="dc-modal-row-2">
            <div className="dc-modal-field">
              <label className="dc-modal-label">From (name)</label>
              <input
                type="text"
                className="dc-modal-input"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
            <div className="dc-modal-field">
              <label className="dc-modal-label">From (role)</label>
              <input
                type="text"
                className="dc-modal-input"
                value={fromRole}
                onChange={(e) => setFromRole(e.target.value)}
              />
            </div>
          </div>

          <div className="dc-modal-row-2">
            <div className="dc-modal-field">
              <label className="dc-modal-label">Region</label>
              <input
                type="text"
                className="dc-modal-input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
            <div className="dc-modal-field">
              <label className="dc-modal-label">Campus</label>
              <input
                type="text"
                className="dc-modal-input"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
              />
            </div>
          </div>

          <div className="dc-modal-field">
            <label className="dc-modal-label">Category</label>
            <select
              className="dc-modal-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="General (Chairperson → Accounts)">General (Chairperson → Accounts)</option>
              <option value="Purchase (full PO flow)">Purchase (full PO flow)</option>
            </select>
          </div>

          <div className="dc-modal-footer">
            <button type="submit" className="dc-publish-btn">Create memo</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   NEW CIRCULAR MODAL
═══════════════════════════════════════════════ */
function NewCircularModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('All regions');
  const [department, setDepartment] = useState('All departments');
  const [campus, setCampus] = useState('all');
  const [audience, setAudience] = useState('Everyone (broadcast)');
  const [body, setBody] = useState('');

  const regions = ['All regions', 'North', 'South', 'East', 'West', 'Central'];
  const departments = ['All departments', 'Marketing', 'Academics', 'Administration', 'Operation', 'Event', 'Accounts', 'None'];
  const audiences = ['Everyone (broadcast)', 'Campus Heads', 'Cluster Managers', 'Regional Heads', 'Selected Department only'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    onSubmit({
      id: Date.now(),
      title: title.trim(),
      timestamp,
      region: region === 'All regions' ? 'all' : region.toLowerCase(),
      dept: department === 'All departments' ? 'all' : department.toLowerCase(),
      campus: campus.trim().toLowerCase() || 'all',
      audience,
      body: body.trim(),
    });

    onClose();
  };

  return (
    <div className="dc-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dc-modal">
        <div className="dc-modal-header">
          <h2 className="dc-modal-title">New circular</h2>
          <button type="button" className="dc-modal-close" onClick={onClose}>×</button>
        </div>
        <p className="dc-modal-sub">Reaches Campus Head, Cluster Manager, Regional Head or department panels.</p>

        <form onSubmit={handleSubmit}>
          <div className="dc-modal-field">
            <label className="dc-modal-label">Title</label>
            <input
              type="text"
              className="dc-modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="dc-modal-row">
            <div className="dc-modal-field">
              <label className="dc-modal-label">Region</label>
              <select className="dc-modal-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="dc-modal-field">
              <label className="dc-modal-label">Department</label>
              <select className="dc-modal-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="dc-modal-field">
              <label className="dc-modal-label">Campus</label>
              <input
                type="text"
                className="dc-modal-input"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
              />
            </div>
          </div>

          <div className="dc-modal-field">
            <label className="dc-modal-label">Audience</label>
            <select className="dc-modal-select" value={audience} onChange={(e) => setAudience(e.target.value)}>
              {audiences.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="dc-modal-field">
            <label className="dc-modal-label">Body</label>
            <textarea
              className="dc-modal-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the circular..."
              rows={4}
              required
            />
          </div>

          <div className="dc-modal-footer">
            <button type="submit" className="dc-publish-btn">Publish circular</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN DIRECTOR CONSOLE COMPONENT
═══════════════════════════════════════════════ */
export default function DirectorConsole() {
  const [activeTab, setActiveTab] = useState('circulars');
  const [memosFilter, setMemosFilter] = useState('Open');

  const [circulars, setCirculars] = useState(INITIAL_CIRCULARS);
  const [memos, setMemos] = useState(INITIAL_MEMOS);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);

  const [showCircularModal, setShowCircularModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleAddCircular = (newCircular) => {
    setCirculars((prev) => [newCircular, ...prev]);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    setActivities((prev) => [
      {
        id: Date.now(),
        action: 'Published Circular',
        timestamp,
        memoTitle: newCircular.title,
        role: 'Director',
        priority: 'HIGH',
        note: `"${newCircular.audience}"`,
      },
      ...prev,
    ]);
  };

  const handleAddMemo = (newMemo) => {
    setMemos((prev) => [newMemo, ...prev]);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    setActivities((prev) => [
      {
        id: Date.now(),
        action: 'Logged Incoming Memo',
        timestamp,
        memoTitle: newMemo.title,
        role: 'Director',
        priority: newMemo.isHigh ? 'HIGH' : 'MEDIUM',
        note: `"${newMemo.status}"`,
      },
      ...prev,
    ]);
  };

  const openMemosCount = memos.filter((m) => m.status === 'Received' || m.status === 'With Chairperson').length;
  const awaitingCount = memos.filter((m) => m.status === 'Received').length;
  const purchaseCount = memos.filter((m) => m.isPurchase).length;
  const completedCount = memos.filter((m) => m.status === 'Completed' || m.status === 'Approved').length;

  const filteredMemos = memos.filter((m) => {
    if (memosFilter === 'Open') return m.status === 'Received' || m.status === 'With Chairperson';
    if (memosFilter === 'Completed') return m.status === 'Approved' || m.status === 'Completed';
    return true;
  });

  return (
    <div className="dc-portal">
      {/* Sidebar */}
      <aside className="dc-sidebar">
        <div className="dc-sidebar-brand">
          <div className="dc-sidebar-logo-img">
            <img src="/sapiens-logo.png" alt="Sapiens Logo" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div>
            <div className="dc-sidebar-brand-name">Sapiens</div>
            <div className="dc-sidebar-brand-sub">DIRECTOR CONSOLE</div>
          </div>
        </div>

        <nav className="dc-nav">
          <button
            type="button"
            className={`dc-nav-item ${activeTab === 'memos' ? 'active' : ''}`}
            onClick={() => setActiveTab('memos')}
          >
            <span className="dc-nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </span>
            <span>Memos & Approvals</span>
          </button>

          <button
            type="button"
            className={`dc-nav-item ${activeTab === 'circulars' ? 'active' : ''}`}
            onClick={() => setActiveTab('circulars')}
          >
            <span className="dc-nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            </span>
            <span>Circulars</span>
          </button>

          <button
            type="button"
            className={`dc-nav-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <span className="dc-nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </span>
            <span>Activity feed</span>
          </button>
        </nav>

        <div className="dc-signout">
          <button type="button" className="dc-signout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dc-main">
        <div className="dc-content">
          {/* ==================== TAB: CIRCULARS ==================== */}
          {activeTab === 'circulars' && (
            <>
              <div className="dc-page-header">
                <div>
                  <div className="dc-page-eyebrow">DIRECTOR'S VOICE</div>
                  <h1 className="dc-page-title">Circulars</h1>
                  <p className="dc-page-subtitle">
                    Compose and broadcast circulars to Campus Heads, Cluster Managers, Regional Heads or departments.
                  </p>
                </div>

                <button type="button" className="dc-btn-primary" onClick={() => setShowCircularModal(true)}>
                  <span style={{ fontSize: 16 }}>+</span> Generate circular
                </button>
              </div>

              {circulars.map((circ) => (
                <div key={circ.id} className="dc-card">
                  <div className="dc-card-top">
                    <h3 className="dc-card-title">{circ.title}</h3>
                    <span className="dc-card-date">{circ.timestamp}</span>
                  </div>

                  <div className="dc-tag-group">
                    <span className="dc-badge-gray">Region: {circ.region}</span>
                    <span className="dc-badge-gray">Dept: {circ.dept}</span>
                    <span className="dc-badge-gray">Campus: {circ.campus}</span>
                    <span className="dc-badge-gold">→ {circ.audience}</span>
                  </div>

                  <p className="dc-card-body">{circ.body}</p>
                </div>
              ))}
            </>
          )}

          {/* ==================== TAB: MEMOS & APPROVALS ==================== */}
          {activeTab === 'memos' && (
            <>
              <div className="dc-page-header">
                <div>
                  <div className="dc-page-eyebrow">DIRECTOR'S DESK</div>
                  <h1 className="dc-page-title">Memos & Approvals</h1>
                  <p className="dc-page-subtitle">
                    Inbound memos from Regional Heads with full approval trail.
                  </p>
                </div>

                <button type="button" className="dc-btn-primary" onClick={() => setShowMemoModal(true)}>
                  <span style={{ fontSize: 16 }}>+</span> Log incoming memo
                </button>
              </div>

              {/* 4 Stat Cards */}
              <div className="dc-stats-row">
                <div className="dc-stat-card">
                  <div className="dc-stat-label-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>Open memos</span>
                  </div>
                  <div className="dc-stat-value">{openMemosCount}</div>
                </div>

                <div className="dc-stat-card highlight">
                  <div className="dc-stat-label-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    <span>Awaiting you</span>
                  </div>
                  <div className="dc-stat-value">{awaitingCount}</div>
                </div>

                <div className="dc-stat-card">
                  <div className="dc-stat-label-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span>Purchase items</span>
                  </div>
                  <div className="dc-stat-value">{purchaseCount}</div>
                </div>

                <div className="dc-stat-card">
                  <div className="dc-stat-label-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>Completed</span>
                  </div>
                  <div className="dc-stat-value">{completedCount}</div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="dc-filter-row">
                {['Open', 'Completed', 'All'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`dc-filter-pill ${memosFilter === f ? 'active' : ''}`}
                    onClick={() => setMemosFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Memo List Cards */}
              {filteredMemos.map((memo) => (
                <div key={memo.id} className="dc-card">
                  <div className="dc-card-top">
                    <div className="dc-card-title-wrap">
                      <h3 className="dc-card-title">{memo.title}</h3>
                      {memo.isPurchase && <span className="dc-badge-purchase">Purchase</span>}
                      {memo.isHigh && <span className="dc-badge-high">HIGH</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span className={memo.status === 'With Chairperson' ? 'dc-status-chairperson' : 'dc-status-received'}>
                        {memo.status}
                      </span>
                      <span className="dc-card-date">{memo.date}</span>
                    </div>
                  </div>

                  <p className="dc-card-body">{memo.description}</p>

                  <div className="dc-card-footer-meta">
                    From <strong>{memo.from}</strong>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ==================== TAB: ACTIVITY FEED ==================== */}
          {activeTab === 'activity' && (
            <>
              <div className="dc-page-header">
                <div>
                  <div className="dc-page-eyebrow">ACROSS ALL PANELS</div>
                  <h1 className="dc-page-title">Activity feed</h1>
                  <p className="dc-page-subtitle">
                    Every action taken on memos, by every role — Director's complete oversight.
                  </p>
                </div>
              </div>

              <div className="dc-activity-timeline">
                {activities.map((act) => (
                  <div key={act.id} className="dc-activity-row">
                    <div className="dc-timeline-line" />
                    <div className="dc-timeline-dot" />

                    <div className="dc-activity-card">
                      <div className="dc-activity-card-top">
                        <div className="dc-activity-action-title">{act.action}</div>
                        <div className="dc-card-date">{act.timestamp}</div>
                      </div>

                      <div className="dc-activity-memo-line">
                        on memo · <strong>{act.memoTitle}</strong>
                      </div>

                      <div className="dc-tag-group" style={{ marginBottom: 6 }}>
                        <span className="dc-badge-dark">{act.role}</span>
                        <span className="dc-badge-high">{act.priority}</span>
                      </div>

                      {act.note && <div className="dc-activity-quote">{act.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showCircularModal && (
        <NewCircularModal
          onClose={() => setShowCircularModal(false)}
          onSubmit={handleAddCircular}
        />
      )}

      {showMemoModal && (
        <NewIncomingMemoModal
          onClose={() => setShowMemoModal(false)}
          onSubmit={handleAddMemo}
        />
      )}
    </div>
  );
}
