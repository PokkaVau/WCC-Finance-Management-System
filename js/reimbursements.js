/**
 * WCC Finance Management & Accounting System
 * Member Reimbursement Module
 */

class ReimbursementsModule {
  constructor() {
    this.searchQuery = '';
    this.activeReimbursementToPay = null;
  }

  render() {
    const container = document.getElementById('reimbursements-table-body');
    if (!container) return;

    let list = [...window.store.data.reimbursements];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r => 
        (r.memberName && r.memberName.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.activityName && r.activityName.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5">
            <div class="empty-state">
              <div class="empty-state-icon">💳</div>
              <div class="empty-state-title">No pending reimbursements</div>
              <div class="empty-state-desc">All member personal expense claims have been settled.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = list.map(r => {
      const isPaid = r.approvalStatus === 'Paid';
      return `
        <tr>
          <td><span class="code-pill">${window.escapeHTML(r.id)}</span></td>
          <td>${window.UI.formatDate(r.requestDate)}</td>
          <td><strong>${window.escapeHTML(r.memberName)}</strong></td>
          <td>
            <div style="font-weight:600;">${window.escapeHTML(r.activityName)}</div>
            <div style="font-size:11.5px; color:var(--text-tertiary);">${window.escapeHTML(r.category)} &bull; ${window.escapeHTML(r.expenseId)}</div>
          </td>
          <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${window.escapeHTML(r.description)}
          </td>
          <td style="font-weight:700; color:var(--gold-dark); font-family:var(--font-mono);">
            ${window.UI.formatMoney(r.amount)}
          </td>
          <td>${window.UI.getStatusBadge(r.approvalStatus)}</td>
          <td class="actions-cell">
            ${!isPaid ? `
              <button class="btn btn-primary btn-sm" onclick="window.reimbursementsModule.initPayModal('${window.escapeHTML(r.id)}')">
                Disburse Pay
              </button>
            ` : `
              <span style="font-size:11.5px; color:var(--text-tertiary);">Paid on ${window.UI.formatDate(r.paymentDate)}</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  initPayModal(reimbursementId) {
    const reim = window.store.data.reimbursements.find(r => r.id === reimbursementId);
    if (!reim) return;

    this.activeReimbursementToPay = reim;
    const modal = document.getElementById('modal-pay-reimbursement');
    if (!modal) return;

    document.getElementById('pay-reim-id').value = reim.id;
    document.getElementById('pay-reim-member-name').textContent = reim.memberName;
    document.getElementById('pay-reim-amount-display').textContent = window.UI.formatMoney(reim.amount);
    document.getElementById('pay-reim-activity-display').textContent = reim.activityName;

    window.UI.openModal('modal-pay-reimbursement');
  }

  async handlePaySubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-primary');

    if (window.UI.setButtonLoading(submitBtn, true, 'Disbursing...') === false) {
      return;
    }

    const payload = {
      reimbursementId: form.reimbursementId.value,
      paymentMethod: form.paymentMethod.value,
      paymentAccountId: form.accountId.value,
      paymentDate: form.paymentDate.value,
      paymentReference: form.paymentReference.value
    };

    try {
      await window.api.request('disburseReimbursement', payload);
      window.UI.closeModal('modal-pay-reimbursement');
      window.UI.showToast('Reimbursement disbursed successfully!', 'success');
      this.render();
      window.expensesModule?.render();
      window.transactionsModule?.render();
      window.dashboardModule?.render();
      if (window.app && window.app.populateSelectDropdowns) {
        window.app.populateSelectDropdowns();
      }
    } catch (err) {
      window.UI.showToast(`Payment failed: ${err.message}`, 'error');
    } finally {
      window.UI.setButtonLoading(submitBtn, false);
    }
  }
}

window.reimbursementsModule = new ReimbursementsModule();
