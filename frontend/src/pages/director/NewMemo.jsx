import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Award,
  Sparkles,
  Calendar,
  Building2,
  Edit3,
  ChevronDown,
  Check,
  PlusCircle,
} from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatCurrency, formatDate } from '../../utils/helpers';
import '../../styles/pages.css';

const NewMemo = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedNotesheetId = location.state?.notesheetId;
  const resubmitMemoId = location.state?.resubmitMemoId;

  const [notesheets, setNotesheets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [existingMemo, setExistingMemo] = useState(null);

  const [activeNotesheetDetail, setActiveNotesheetDetail] = useState(null);
  const [loadingNotesheetDetail, setLoadingNotesheetDetail] = useState(false);

  const [isCustomVendor, setIsCustomVendor] = useState(false);
  const [customVendorInput, setCustomVendorInput] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    notesheetRef: preselectedNotesheetId || '',
    summary: '',
    recommendedVendor: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Click outside to close vendor dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setVendorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load available notesheets & existing memo if resubmitting
  useEffect(() => {
    const load = async () => {
      try {
        const [ns1, ns2, ns3] = await Promise.all([
          api.get('/api/notesheets?status=submitted&limit=100'),
          api.get('/api/notesheets?status=revised&limit=100'),
          api.get('/api/notesheets?status=forwarded&limit=100'),
        ]);
        const extract = (r) => {
          const d = r.data.data;
          return Array.isArray(d) ? d : d?.notesheets || [];
        };
        const allNs = [...extract(ns1), ...extract(ns2), ...extract(ns3)];
        const seen = new Set();
        const deduplicated = allNs.filter((n) => {
          if (seen.has(n._id)) return false;
          seen.add(n._id);
          return true;
        });

        setNotesheets(deduplicated);

        if (resubmitMemoId) {
          const memoRes = await api.get(`/api/memos/${resubmitMemoId}`);
          const m = memoRes.data.data;
          setExistingMemo(m);
          setForm({
            notesheetRef: m.notesheetRef?._id || m.notesheetRef || '',
            summary: m.summary || '',
            recommendedVendor: m.recommendedVendor || '',
          });
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [resubmitMemoId]);

  // Fetch full details of selected notesheet (including quotations)
  useEffect(() => {
    if (!form.notesheetRef) {
      setActiveNotesheetDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setLoadingNotesheetDetail(true);
      try {
        const res = await api.get(`/api/notesheets/${form.notesheetRef}`);
        const detail = res.data.data;
        setActiveNotesheetDetail(detail);

        // If vendor not set yet and quotations exist, auto-suggest lowest quote
        if (detail?.quotations?.length > 0) {
          const sorted = [...detail.quotations].sort((a, b) => (a.amount || 0) - (b.amount || 0));
          if (sorted[0]?.vendorName) {
            setForm((prev) => {
              if (!prev.recommendedVendor) {
                return { ...prev, recommendedVendor: sorted[0].vendorName };
              }
              return prev;
            });
            setIsCustomVendor(false);
          }
        }
      } catch (err) {
        console.error('Failed to load notesheet details:', err);
      } finally {
        setLoadingNotesheetDetail(false);
      }
    };

    fetchDetail();
  }, [form.notesheetRef]);

  // Find lowest quote amount
  const lowestAmount = useMemo(() => {
    if (!activeNotesheetDetail?.quotations?.length) return null;
    return Math.min(...activeNotesheetDetail.quotations.map((q) => q.amount || Infinity));
  }, [activeNotesheetDetail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.notesheetRef) {
      setError('Select a notesheet.');
      return;
    }

    const finalVendor = isCustomVendor ? customVendorInput.trim() : form.recommendedVendor.trim();

    if (!form.summary.trim()) {
      setError('Summary is required.');
      return;
    }

    setLoading(true);
    try {
      if (resubmitMemoId) {
        await api.post(`/api/memos/${resubmitMemoId}/resubmit`, {
          summary: form.summary.trim(),
          recommendedVendor: finalVendor || undefined,
        });
      } else {
        await api.post('/api/memos', {
          notesheetRef: form.notesheetRef,
          summary: form.summary.trim(),
          recommendedVendor: finalVendor || undefined,
        });
      }
      navigate('/director/memos');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  if (loadingData) {
    return (
      <div className="page-loader">
        <span className="spinner" />
      </div>
    );
  }

  const currentVendorName = isCustomVendor ? customVendorInput : form.recommendedVendor;

  return (
    <div className="form-page" style={{ maxWidth: 860, margin: '0 auto', padding: '16px' }}>
      <div className="page-header">
        <div className="page-heading">
          <button
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: 13,
              marginBottom: 4,
            }}
            onClick={() => navigate('/director/memos')}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">{resubmitMemoId ? 'Resubmit Memo' : 'New Memo'}</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {existingMemo?.timeline?.findLast?.((t) => t.action === 'Rejected')?.note && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>Rejection reason:</strong>{' '}
          {existingMemo.timeline.findLast((t) => t.action === 'Rejected').note}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Memo Details</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Notesheet Selection */}
            <div className="form-field">
              <label className="form-label required">Notesheet</label>
              <select
                className="form-select"
                value={form.notesheetRef}
                onChange={(e) => {
                  set('notesheetRef', e.target.value);
                  setIsCustomVendor(false);
                  setCustomVendorInput('');
                }}
                disabled={!!resubmitMemoId}
              >
                <option value="">Select a notesheet…</option>
                {notesheets.map((ns) => (
                  <option key={ns._id} value={ns._id}>
                    {ns.referenceNumber || ns._id?.slice(-8)}
                    {ns.assessmentRef?.workProposalRef?.title
                      ? ` — ${ns.assessmentRef.workProposalRef.title}`
                      : ''}
                    {ns.quotations?.length ? ` (${ns.quotations.length} Vendor Quotes)` : ''}
                    {ns.status && ns.status !== 'submitted' ? ` [${ns.status}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Selection Section */}
            {form.notesheetRef && (
              <div
                style={{
                  background: 'var(--color-bg-surface, #f8fafc)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '16px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Building2 size={18} color="#0284c7" />
                      Recommended Vendor (From Notesheet Quotations)
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                      Choose a vendor from the submitted quotes or enter a custom vendor name
                    </p>
                  </div>

                  {activeNotesheetDetail && (
                    <span className="badge badge-submitted" style={{ fontFamily: 'var(--font-mono)' }}>
                      {activeNotesheetDetail.referenceNumber ||
                        `NS-${activeNotesheetDetail._id?.slice(-8).toUpperCase()}`}
                    </span>
                  )}
                </div>

                {loadingNotesheetDetail ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <span className="spinner spinner-sm" /> Loading quotations…
                  </div>
                ) : activeNotesheetDetail?.quotations?.length > 0 ? (
                  <div>
                    {/* Interactive Vendor Quotation Cards with Sky Blue Selection */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 14,
                        marginBottom: 16,
                      }}
                    >
                      {activeNotesheetDetail.quotations.map((q, idx) => {
                        const isSelected = !isCustomVendor && form.recommendedVendor === q.vendorName;
                        const isLowest = q.amount === lowestAmount;

                        return (
                          <div
                            key={q._id || idx}
                            onClick={() => {
                              setIsCustomVendor(false);
                              set('recommendedVendor', q.vendorName);
                            }}
                            style={{
                              border: isSelected
                                ? '2px solid #0284c7'
                                : '1px solid var(--color-border, #e2e8f0)',
                              borderRadius: 'var(--radius-md, 10px)',
                              padding: 16,
                              background: isSelected ? '#e0f2fe' : 'var(--color-bg-card, #ffffff)',
                              color: isSelected ? '#0f172a' : 'var(--color-text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              position: 'relative',
                              boxShadow: isSelected ? '0 4px 14px rgba(2, 132, 199, 0.15)' : 'none',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 15,
                                  color: isSelected ? '#0369a1' : 'var(--color-text-primary)',
                                }}
                              >
                                {q.vendorName}
                              </span>
                              {isSelected && <CheckCircle2 size={18} color="#0284c7" />}
                            </div>

                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: isSelected ? '#0284c7' : 'var(--color-success, #16a34a)',
                                marginBottom: 8,
                              }}
                            >
                              {formatCurrency(q.amount)}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                gap: 6,
                                flexWrap: 'wrap',
                                marginBottom: 8,
                              }}
                            >
                              {isLowest && (
                                <span
                                  style={{
                                    background: isSelected ? '#bae6fd' : '#dcfce7',
                                    color: isSelected ? '#0369a1' : '#166534',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: 12,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Award size={12} /> Lowest Quote
                                </span>
                              )}
                              {isSelected && (
                                <span
                                  style={{
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: 12,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  Selected
                                </span>
                              )}
                            </div>

                            {q.validity && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: isSelected ? '#0369a1' : 'var(--color-text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginBottom: 6,
                                }}
                              >
                                <Calendar size={12} /> Valid: {formatDate(q.validity)}
                              </div>
                            )}

                            {q.itemBreakdown && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: isSelected ? '#0f172a' : 'var(--color-text-secondary)',
                                  background: isSelected ? '#ffffff' : 'var(--color-bg-surface, #f8fafc)',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  marginTop: 6,
                                  border: isSelected ? '1px solid #7dd3fc' : '1px solid var(--color-border)',
                                }}
                              >
                                {q.itemBreakdown}
                              </div>
                            )}

                            {q.attachmentUrl && (
                              <a
                                href={q.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: 12,
                                  color: isSelected ? '#0369a1' : 'var(--color-primary)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginTop: 8,
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                }}
                              >
                                <ExternalLink size={12} /> View Quote File
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Animated Vendor Dropdown Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        {/* Custom Dropdown Trigger */}
                        <div
                          ref={dropdownRef}
                          style={{ position: 'relative', flex: 1, minWidth: 260 }}
                        >
                          <div
                            onClick={() => setVendorDropdownOpen((prev) => !prev)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              background: vendorDropdownOpen
                                ? '#f0f9ff'
                                : 'var(--color-bg-card, #ffffff)',
                              border: vendorDropdownOpen
                                ? '2px solid #0284c7'
                                : '1px solid var(--color-border, #cbd5e1)',
                              borderRadius: 'var(--radius-md, 10px)',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.2s ease',
                              boxShadow: vendorDropdownOpen
                                ? '0 0 0 3px rgba(2, 132, 199, 0.15)'
                                : 'none',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                overflow: 'hidden',
                              }}
                            >
                              {isCustomVendor ? (
                                <>
                                  <Edit3 size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, color: '#0369a1', fontSize: 14 }}>
                                    Custom: {customVendorInput || 'Enter custom vendor name…'}
                                  </span>
                                </>
                              ) : form.recommendedVendor ? (
                                (() => {
                                  const selectedQ = activeNotesheetDetail.quotations.find(
                                    (q) => q.vendorName === form.recommendedVendor
                                  );
                                  const isLowest = selectedQ && selectedQ.amount === lowestAmount;

                                  return (
                                    <>
                                      <Building2
                                        size={16}
                                        color="#0284c7"
                                        style={{ flexShrink: 0 }}
                                      />
                                      <span
                                        style={{
                                          fontWeight: 600,
                                          color: 'var(--color-text-primary)',
                                          fontSize: 14,
                                        }}
                                      >
                                        {form.recommendedVendor}
                                      </span>
                                      {selectedQ && (
                                        <span
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: '#0284c7',
                                            background: '#e0f2fe',
                                            padding: '2px 8px',
                                            borderRadius: 12,
                                          }}
                                        >
                                          {formatCurrency(selectedQ.amount)}
                                        </span>
                                      )}
                                      {isLowest && (
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#166534',
                                            background: '#dcfce7',
                                            padding: '2px 6px',
                                            borderRadius: 10,
                                          }}
                                        >
                                          ★ Lowest
                                        </span>
                                      )}
                                    </>
                                  );
                                })()
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                                  -- Select Recommended Vendor --
                                </span>
                              )}
                            </div>

                            <ChevronDown
                              size={18}
                              color="var(--color-text-muted)"
                              style={{
                                transform: vendorDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            />
                          </div>

                          {/* Custom Dropdown Popup Panel */}
                          {vendorDropdownOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                left: 0,
                                right: 0,
                                zIndex: 999,
                                background: 'var(--color-bg-card, #ffffff)',
                                border: '1px solid var(--color-border, #e2e8f0)',
                                borderRadius: 12,
                                padding: 6,
                                boxShadow:
                                  '0 12px 36px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05)',
                                maxHeight: 280,
                                overflowY: 'auto',
                              }}
                            >
                              {activeNotesheetDetail.quotations.map((q, idx) => {
                                const isSelected =
                                  !isCustomVendor && form.recommendedVendor === q.vendorName;
                                const isLowest = q.amount === lowestAmount;

                                return (
                                  <div
                                    key={q._id || idx}
                                    onClick={() => {
                                      setIsCustomVendor(false);
                                      set('recommendedVendor', q.vendorName);
                                      setVendorDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      borderRadius: 8,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justify: 'space-between',
                                      cursor: 'pointer',
                                      background: isSelected ? '#e0f2fe' : 'transparent',
                                      color: isSelected ? '#0369a1' : 'var(--color-text-primary)',
                                      transition: 'background 0.15s ease',
                                      marginBottom: 2,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) e.currentTarget.style.background = '#f0f9ff';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected)
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <div
                                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                                    >
                                      <Building2
                                        size={16}
                                        color={isSelected ? '#0284c7' : 'var(--color-text-muted)'}
                                      />
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                                          {q.vendorName}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 12,
                                            color: isSelected
                                              ? '#0284c7'
                                              : 'var(--color-success, #16a34a)',
                                            fontWeight: 700,
                                          }}
                                        >
                                          {formatCurrency(q.amount)}
                                        </div>
                                      </div>
                                    </div>

                                    <div
                                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                      {isLowest && (
                                        <span
                                          style={{
                                            background: isSelected ? '#bae6fd' : '#dcfce7',
                                            color: isSelected ? '#0369a1' : '#166534',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: 10,
                                          }}
                                        >
                                          ★ Lowest Quote
                                        </span>
                                      )}
                                      {isSelected && <Check size={16} color="#0284c7" />}
                                    </div>
                                  </div>
                                );
                              })}

                              <div
                                onClick={() => {
                                  setIsCustomVendor(true);
                                  setVendorDropdownOpen(false);
                                }}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  cursor: 'pointer',
                                  borderTop: '1px solid var(--color-border, #e2e8f0)',
                                  marginTop: 4,
                                  background: isCustomVendor ? '#f0f9ff' : 'transparent',
                                  color: '#0369a1',
                                  fontWeight: 600,
                                  fontSize: 13,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isCustomVendor)
                                    e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isCustomVendor)
                                    e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <PlusCircle size={16} color="#0284c7" />
                                <span>Other / Enter Custom Vendor Name…</span>
                                {isCustomVendor && (
                                  <Check size={16} color="#0284c7" style={{ marginLeft: 'auto' }} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {currentVendorName && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{
                              fontSize: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '10px 14px',
                              borderColor: 'var(--color-border)',
                              height: 42,
                            }}
                            onClick={() => {
                              const selectedQ = activeNotesheetDetail.quotations.find(
                                (q) => q.vendorName === currentVendorName
                              );
                              const proposalTitle =
                                activeNotesheetDetail?.assessmentRef?.workProposalRef?.title ||
                                'proposal';
                              const nsRef =
                                activeNotesheetDetail.referenceNumber ||
                                `NS-${activeNotesheetDetail._id?.slice(-8).toUpperCase()}`;

                              const template =
                                `Recommended approval for vendor "${currentVendorName}"` +
                                (selectedQ
                                  ? ` with quoted amount of ${formatCurrency(selectedQ.amount)}`
                                  : '') +
                                ` regarding "${proposalTitle}". Notesheet reference ${nsRef} containing vendor comparison has been reviewed and verified.`;

                              set('summary', template);
                            }}
                          >
                            <Sparkles size={14} color="#0284c7" /> Auto-fill Summary
                          </button>
                        )}
                      </div>

                      {/* Explicit Custom Vendor Name Input Field (Shown when 'Other' selected) */}
                      {isCustomVendor && (
                        <div
                          style={{
                            background: '#f0f9ff',
                            border: '1px solid #7dd3fc',
                            borderRadius: 'var(--radius-md, 8px)',
                            padding: 14,
                            marginTop: 4,
                          }}
                        >
                          <label
                            className="form-label required"
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#0369a1',
                              marginBottom: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Edit3 size={14} /> Enter Custom Vendor Name
                          </label>
                          <input
                            className="form-input"
                            placeholder="e.g. Apex Industrial Supplies Pvt Ltd"
                            value={customVendorInput}
                            onChange={(e) => setCustomVendorInput(e.target.value)}
                            autoFocus
                          />
                          <p style={{ fontSize: 11, color: '#0369a1', margin: '6px 0 0 0' }}>
                            Specify vendor name if recommending an unlisted or custom vendor
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-muted)',
                      padding: 12,
                      background: 'var(--color-bg-card)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    No vendor quotations attached to this notesheet. Enter recommended vendor manually:
                    <input
                      className="form-input"
                      style={{ marginTop: 8 }}
                      placeholder="Vendor name (optional)"
                      value={customVendorInput || form.recommendedVendor}
                      onChange={(e) => {
                        setIsCustomVendor(true);
                        setCustomVendorInput(e.target.value);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Summary Textarea */}
            <div className="form-field">
              <label className="form-label required">Memo Summary</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Provide a detailed summary and justification for this memo..."
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/director/memos')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner spinner-sm" /> Saving…
              </>
            ) : resubmitMemoId ? (
              'Resubmit Memo'
            ) : (
              'Create Memo'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewMemo;
