import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from "../context/AuthContext";
import { DollarSign, Plus, Edit, Trash2, X, Filter, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { expenseService, EXPENSE_CATEGORIES, PAYMENT_MODES } from "../services/expenseService";

const EMPTY_FORM = {
  expense_date: new Date().toISOString().split('T')[0],
  amount: '',
  category: EXPENSE_CATEGORIES[0],
  description: '',
  payment_mode: PAYMENT_MODES[0],
  paid_to: '',
  notes: '',
};

// Safe date formatter: avoids UTC-to-local shift on date-only strings
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month, day] = String(dateStr).split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

const AdminFinance = () => {
  const { authenticatedFetch, API_URL } = useAuth();

  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Added: holds total_fees_collected from /api/dashboard/admin
  const [totalFeesCollected, setTotalFeesCollected] = useState(null);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await expenseService.getSummary(authenticatedFetch, API_URL);
      setSummary(data);
    } catch (err) {
      console.error('Summary fetch error:', err);
    }
  }, [authenticatedFetch, API_URL]);

  // Added: fetch total_fees_collected from admin dashboard stats
  const fetchFeesCollected = useCallback(async () => {
    try {
      const data = await expenseService.getAdminDashboardStats(authenticatedFetch, API_URL);
      setTotalFeesCollected(parseFloat(data.total_fees_collected || 0));
    } catch (err) {
      console.error('Fees collected fetch error:', err);
      setTotalFeesCollected(0);
    }
  }, [authenticatedFetch, API_URL]);

  const fetchExpenses = useCallback(async (overrideFilters = null) => {
    try {
      const filters = overrideFilters !== null ? overrideFilters : {
        ...(filterCategory && { category: filterCategory }),
        ...(filterFrom && { date_from: filterFrom }),
        ...(filterTo && { date_to: filterTo }),
      };
      const data = await expenseService.getExpenses(authenticatedFetch, API_URL, filters);
      setExpenses(data);
    } catch (err) {
      console.error('Expenses fetch error:', err);
    }
  }, [authenticatedFetch, API_URL, filterCategory, filterFrom, filterTo]);

  const loadAll = useCallback(async (overrideFilters = null) => {
    setLoading(true);
    // Added fetchFeesCollected to the parallel load
    await Promise.all([fetchSummary(), fetchExpenses(overrideFilters), fetchFeesCollected()]);
    setLoading(false);
  }, [fetchSummary, fetchExpenses, fetchFeesCollected]);

  useEffect(() => {
    loadAll();
  }, []);

  const handleApplyFilters = () => {
    fetchExpenses();
  };

  const handleClearFilters = () => {
    setFilterCategory('');
    setFilterFrom('');
    setFilterTo('');
    fetchExpenses({});
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (expense) => {
    setEditingExpense(expense);
    setForm({
      expense_date: String(expense.expense_date).split('T')[0],
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      payment_mode: expense.payment_mode,
      paid_to: expense.paid_to || '',
      notes: expense.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        paid_to: form.paid_to || null,
        notes: form.notes || null,
      };
      if (editingExpense) {
        await expenseService.updateExpense(authenticatedFetch, API_URL, editingExpense.id, payload);
      } else {
        await expenseService.createExpense(authenticatedFetch, API_URL, payload);
      }
      setShowModal(false);
      loadAll();
    } catch (err) {
      setFormError(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Void expense: "${expense.description}" of ₹${parseFloat(expense.amount).toLocaleString('en-IN')}? This cannot be undone.`)) return;
    try {
      await expenseService.deleteExpense(authenticatedFetch, API_URL, expense.id);
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to void expense');
    }
  };

  const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  // Added: derived calculation — only computed when both values are available
  const totalExpenditure = parseFloat(summary?.month_total || 0);
  const remainingBalance = totalFeesCollected !== null ? totalFeesCollected - totalExpenditure : null;
  const isDeficit = remainingBalance !== null && remainingBalance < 0;

  if (loading) {
    return (
      <div className="data-panel glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
        Loading finance data...
      </div>
    );
  }

  return (
    <div>
      {/* Finance Overview — Remaining Balance Panel (Added) */}
      <div className="data-panel glass-panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header" style={{ marginBottom: '16px' }}>
          <h3 className="panel-title">Finance Overview</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total collected vs total expenditure (all-time vs current month)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

          {/* Total Fees Collected */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)' }}>
              <TrendingUp size={20} style={{ color: 'var(--accent-green, #10b981)' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Fees Collected</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-green, #10b981)' }}>
                ₹{totalFeesCollected !== null ? fmt(totalFeesCollected) : '—'}
              </div>
            </div>
          </div>

          {/* Total Expenditure This Month */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(251,191,36,0.12)' }}>
              <TrendingDown size={20} style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Expenditure (This Month)</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-amber)' }}>
                ₹{fmt(totalExpenditure)}
              </div>
            </div>
          </div>

          {/* Remaining Balance */}
          <div className="glass-panel" style={{
            padding: '20px',
            background: isDeficit ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: isDeficit ? '1px solid rgba(248,113,113,0.25)' : '1px solid transparent',
          }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: isDeficit ? 'rgba(248,113,113,0.12)' : 'rgba(99,102,241,0.12)' }}>
              <Wallet size={20} style={{ color: isDeficit ? '#f87171' : 'var(--accent-purple)' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Remaining Balance</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: isDeficit ? '#f87171' : 'var(--accent-purple)' }}>
                {remainingBalance !== null ? `₹${fmt(remainingBalance)}` : '—'}
              </div>
              {isDeficit && (
                <div style={{ fontSize: '10px', color: '#f87171', marginTop: '3px' }}>Expenditure exceeds collections</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Summary Cards — unchanged */}
      <div className="stats-grid">
        <div className="stat-card glass-panel accent-amber">
          <div className="stat-info">
            <span className="stat-label">Today's Expenses</span>
            <span className="stat-val">₹{fmt(summary?.today_total)}</span>
          </div>
          <div className="stat-icon-wrapper"><DollarSign size={24} /></div>
        </div>

        <div className="stat-card glass-panel accent-red">
          <div className="stat-info">
            <span className="stat-label">This Month</span>
            <span className="stat-val">₹{fmt(summary?.month_total)}</span>
          </div>
          <div className="stat-icon-wrapper"><DollarSign size={24} /></div>
        </div>

        <div className="stat-card glass-panel accent-cyan">
          <div className="stat-info">
            <span className="stat-label">Entries Today</span>
            <span className="stat-val">{summary?.today_count || 0}</span>
          </div>
          <div className="stat-icon-wrapper"><DollarSign size={24} /></div>
        </div>

        <div className="stat-card glass-panel accent-purple">
          <div className="stat-info">
            <span className="stat-label">Entries This Month</span>
            <span className="stat-val">{summary?.month_count || 0}</span>
          </div>
          <div className="stat-icon-wrapper"><DollarSign size={24} /></div>
        </div>
      </div>

      {/* Category Breakdown — unchanged */}
      {summary?.category_totals && Object.keys(summary.category_totals).length > 0 && (
        <div className="data-panel glass-panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <h3 className="panel-title">Monthly Category Breakdown</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {Object.entries(summary.category_totals).map(([cat, total]) => (
              <div key={cat} className="glass-panel" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{cat}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-amber)' }}>₹{fmt(total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Table — unchanged */}
      <div className="data-panel glass-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Expenditure Ledger</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{expenses.length} records</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Expense
          </button>
        </div>

        {/* Filters — unchanged */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Category</label>
            <select className="form-control" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>From</label>
            <input type="date" className="form-control" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>To</label>
            <input type="date" className="form-control" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleApplyFilters} style={{ alignSelf: 'flex-end' }}>
            <Filter size={14} /> Apply
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleClearFilters} style={{ alignSelf: 'flex-end' }}>
            Clear
          </button>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Paid To</th>
                <th>Entered By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{formatDate(exp.expense_date)}</td>
                  <td>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', background: 'rgba(251,191,36,0.15)', color: 'var(--accent-amber)' }}>
                      {exp.category}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</td>
                  <td><strong style={{ color: 'var(--accent-amber)' }}>₹{fmt(exp.amount)}</strong></td>
                  <td>{exp.payment_mode}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{exp.paid_to || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{exp.created_by_name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(exp)} style={{ padding: '6px' }} title="Edit">
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp)} style={{ padding: '6px' }} title="Void">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — unchanged */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '24px', color: 'var(--accent-cyan)' }}>
              {editingExpense ? 'Edit Expense Entry' : 'Record New Expense'}
            </h3>

            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-control"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-control"
                    value={form.payment_mode}
                    onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                    required
                  >
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Diesel for Bus No. 3"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Paid To / Vendor (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.paid_to}
                  onChange={(e) => setForm({ ...form, paid_to: e.target.value })}
                  placeholder="e.g. Indian Oil, TSRTC Vendor"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional remarks"
                />
              </div>

              {formError && (
                <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: '6px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinance;