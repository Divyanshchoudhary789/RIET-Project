import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RefreshCw, FilePlus2, X } from 'lucide-react';
import api from '../../utils/api';
import { formatDate, formatCurrency, getErrorMessage, getStatusClass, getPriorityClass } from '../../utils/helpers';
import ApprovalJourney from '../../components/ApprovalJourney';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

// Entities that can change the approval chain or requirement status
const CHAIN_ENTITIES = ['requirement', 'workProposal', 'assessment', 'notesheet', 'memo', 'purchaseOrder'];

const RequirementsList = () => {
  const navigate = useNavigate();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [selected, setSelected]             = useState(null);
  const [chain, setChain]                   = useState(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  // Silent re-fetch flag — shows a subtle indicator instead of full spinner
  const [chainRefreshing, setChainRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]             = useState('');

  // Keep a stable ref to the currently open requirement id
  // so the socket handler can access it without stale closure
  const openReqIdRef = useRef(null);

  // ── List fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const r = await api.get('/api/requirements', { params });
      const data = r.data.data;
      setItems(Array.isArray(data) ? data : (data?.requirements || []));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Re-fetch list when any upstream document changes (status badge updates)
  useSocketEvent('dashboard:refresh', (payload) => {
    if (CHAIN_ENTITIES.includes(payload?.entity)) load();
  });

  // ── Chain fetch (used on open and on silent refresh) ─────────────────────
  const fetchChain = useCallback(async (reqId, { silent = false } = {}) => {
    if (silent) {
      setChainRefreshing(true);
    } else {
      setDetailLoading(true);
      setChain(null);
    }
    try {
      const [detailRes, chainRes] = await Promise.all([
        api.get(`/api/requirements/${reqId}`),
        api.get(`/api/requirements/${reqId}/chain`),
      ]);
      const fullDoc   = detailRes.data.data;
      const chainData = chainRes.data.data;

      // Always update the selected doc so status badge in drawer is fresh
      setSelected(fullDoc);

      // Also patch the status in the table row without re-fetching the full list
      setItems((prev) =>
        prev.map((it) =>
          it._id === reqId ? { ...it, status: fullDoc.status } : it
        )
      );

      const chainHasData =
        chainData && (chainData.workProposal || chainData.assessment ||
                      chainData.notesheet   || chainData.memo        ||
                      chainData.purchaseOrder);
      setChain(chainHasData ? chainData : null);
    } catch {
      // on silent refresh keep existing data; on initial open keep list-row data
    } finally {
      setDetailLoading(false);
      setChainRefreshing(false);
    }
  }, []);

  // ── Open drawer ────────────────────────────────────────────────────────────
  const openDetail = (req) => {
    openReqIdRef.current = req._id;
    setDrawerOpen(true);
    setSelected(req);  // show list data immediately (no blank drawer)
    fetchChain(req._id);
  };

  // ── Socket: silently refresh chain while drawer is open ───────────────────
  useSocketEvent('dashboard:refresh', (payload) => {
    if (
      CHAIN_ENTITIES.includes(payload?.entity) &&
      openReqIdRef.current &&
      drawerOpen
    ) {
      fetchChain(openReqIdRef.current, { silent: true });
    }
  });

  // ── Close drawer ───────────────────────────────────────────────────────────
  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
    setChain(null);
    openReqIdRef.current = null;
  };

  const filtered = items.filter(
    (it) =>
      !search ||
      (it.description || it.justification)?.toLowerCase().includes(search.toLowerCase()) ||
      it.title?.toLowerCase().includes(search.toLowerCase()) ||
      it.priority?.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">My Campus</span>
          <h1 className="page-title">Requirements</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/center-head/new-requirement')}>
          <FilePlus2 size={16} /> New Requirement
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="table-panel">
        <div className="table-panel-header">
          <span className="table-panel-title">All Requirements</span>
          <div className="table-filters">
            <input
              className="search-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="forwarded">Forwarded</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-title">No requirements found</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Items</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title || r.description || r.justification}>
                      {r.title || r.description || r.justification || '—'}
                    </td>
                    <td>{r.items?.length ?? 0}</td>
                    <td><span className={`badge ${getPriorityClass(r.priority)}`}>{r.priority}</span></td>
                    <td><span className={`badge ${getStatusClass(r.status)}`}>{r.status}</span></td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openDetail(r)}
                          disabled={detailLoading}
                        >
                          <Eye size={14} /> View
                        </button>
                        {r.status === 'rejected' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/center-head/requirements/${r._id}/resubmit`)}
                          >
                            <RefreshCw size={14} /> Resubmit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Requirement Drawer ─────────────────────────────────────────────── */}
      {drawerOpen && selected && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">

            {/* Header */}
            <div className="drawer-header">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="drawer-title">{selected.title || 'Requirement Details'}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Ref: {selected.referenceNumber || selected._id}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Subtle live-refresh indicator — visible only during silent re-fetch */}
                {chainRefreshing && (
                  <span
                    title="Updating…"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}
                  >
                    <span className="spinner spinner-sm" />
                    Updating…
                  </span>
                )}
                <button className="modal-close" onClick={closeDrawer} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="drawer-body">
              {/* Status + Priority */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {selected.status && (
                  <span className={`badge ${getStatusClass(selected.status)}`}>{selected.status}</span>
                )}
                {selected.priority && (
                  <span className={`badge ${getPriorityClass(selected.priority)}`}>{selected.priority}</span>
                )}
              </div>

              {/* Title */}
              {selected.title && (
                <div style={{ marginBottom: 16 }}>
                  <div className="drawer-section-title">Title</div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 600, margin: 0 }}>
                    {selected.title}
                  </p>
                </div>
              )}

              {/* Description */}
              {(selected.description || selected.justification) && (
                <div style={{ marginBottom: 16 }}>
                  <div className="drawer-section-title">Description</div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {selected.description || selected.justification}
                  </p>
                </div>
              )}

              {/* Items */}
              {selected.items?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="drawer-section-title">Items ({selected.items.length})</div>
                  <table className="table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr><th>Item</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Line Total</th></tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={item._id || i}>
                          <td style={{ fontWeight: 500 }}>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit || '—'}</td>
                          <td>{formatCurrency(item.price || 0)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency((item.quantity || 0) * (item.price || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>Estimated Total</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                          {formatCurrency(selected.items.reduce((a, it) => a + (it.quantity || 0) * (it.price || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Meta */}
              <div className="meta-grid" style={{ marginBottom: 24 }}>
                {selected.createdBy?.name && (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Author</span>
                    <span className="drawer-field-value">{selected.createdBy.name}</span>
                  </div>
                )}
                {selected.campusRef?.name && (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Campus</span>
                    <span className="drawer-field-value">{selected.campusRef.name}</span>
                  </div>
                )}
                {selected.createdAt && (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Created Date</span>
                    <span className="drawer-field-value">{formatDate(selected.createdAt)}</span>
                  </div>
                )}
              </div>

              {/* ── Approval Journey ── */}
              <div className="drawer-section-title">Approval Journey</div>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <span className="spinner" />
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
                    Loading journey…
                  </div>
                </div>
              ) : (
                <ApprovalJourney
                  chain={chain}
                  requirementTimeline={selected.timeline || []}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RequirementsList;
