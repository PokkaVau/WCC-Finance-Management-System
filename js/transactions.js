/**
 * WCC Finance Management & Accounting System
 * Transactions Module
 */

class TransactionsModule {
  constructor() {
    this.filterType = 'all';
    this.searchQuery = '';
  }

  render() {
    const container = document.getElementById('transactions-table-body');
    if (!container) return;

    let list = [...window.store.data.transactions];

    // Filter by type
    if (this.filterType !== 'all') {
      list = list.filter(t => t.type.toLowerCase() === this.filterType.toLowerCase());
    }

    // Filter by search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(t => 
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.activityName && t.activityName.toLowerCase().includes(q)) ||
        (t.accountName && t.accountName.toLowerCase().includes(q)) ||
        (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
        (t.vendorOrMember && t.vendorOrMember.toLowerCase().includes(q)) ||
        (t.paidBy && t.paidBy.toLowerCase().includes(q)) ||
        (t.receivedFrom && t.receivedFrom.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5">
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-title">No transactions found</div>
              <div class="empty-state-desc">Try clearing filters or recording a new income or expense.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = list.map(t => {
      const isIncome = t.type === 'Income';
      const amountClass = isIncome ? 'text-success' : 'text-danger';
      const amountPrefix = isIncome ? '+' : '-';
      const party = t.vendorOrMember || t.paidBy || t.receivedFrom || '-';

      return `
        <tr>
          <td><span class="code-pill">${window.escapeHTML(t.id)}</span></td>
          <td>${window.UI.formatDate(t.date)}</td>
          <td>
            <span class="badge ${isIncome ? 'badge-approved' : 'badge-draft'}">${window.escapeHTML(t.type)}</span>
          </td>
          <td>
            <div style="font-weight:600; color:var(--text-primary);">${window.escapeHTML(t.activityName || 'General Fund')}</div>
            <div style="font-size:11.5px; color:var(--text-tertiary);">${window.escapeHTML(t.category)}</div>
          </td>
          <td>
            <div style="max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${window.escapeHTML(t.description || '')}">
              ${window.escapeHTML(t.description || '-')}
            </div>
          </td>
          <td>${window.escapeHTML(party)}</td>
          <td style="font-weight:700; font-family:var(--font-mono);" class="${amountClass}">
            ${amountPrefix}${window.UI.formatMoney(t.amount)}
          </td>
          <td>${window.UI.getStatusBadge(t.status)}</td>
        </tr>
      `;
    }).join('');
  }

  setFilter(type) {
    this.filterType = type;
    this.render();
  }

  search(q) {
    this.searchQuery = q;
    this.render();
  }
}

window.transactionsModule = new TransactionsModule();
