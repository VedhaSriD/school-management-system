export const expenseService = {
  async getSummary(authenticatedFetch, API_URL) {
    const res = await authenticatedFetch(`${API_URL}/api/expenses/summary`);
    if (!res.ok) throw new Error('Failed to fetch expense summary');
    return res.json();
  },

  async getExpenses(authenticatedFetch, API_URL, filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    const url = `${API_URL}/api/expenses/?${params.toString()}`;
    const res = await authenticatedFetch(url);
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return res.json();
  },

  async createExpense(authenticatedFetch, API_URL, data) {
    const res = await authenticatedFetch(`${API_URL}/api/expenses/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create expense');
    }
    return res.json();
  },

  async updateExpense(authenticatedFetch, API_URL, id, data) {
    const res = await authenticatedFetch(`${API_URL}/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update expense');
    }
    return res.json();
  },

  async deleteExpense(authenticatedFetch, API_URL, id) {
    const res = await authenticatedFetch(`${API_URL}/api/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to void expense');
    return res.json();
  },

  // Added: fetches total_fees_collected from the existing admin dashboard endpoint
  async getAdminDashboardStats(authenticatedFetch, API_URL) {
    const res = await authenticatedFetch(`${API_URL}/api/dashboard/admin`);
    if (!res.ok) throw new Error('Failed to fetch admin dashboard stats');
    return res.json();
  },
};

export const EXPENSE_CATEGORIES = [
  'Bus Diesel', 'Bus Maintenance', 'Stationery', 'Electricity',
  'Water', 'Internet', 'Salary', 'Repair', 'Printing', 'Event', 'Miscellaneous',
];

export const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque'];