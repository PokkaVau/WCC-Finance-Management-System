/**
 * WCC Finance Management & Accounting System
 * Expense Management Module
 */

class ExpensesModule {
  constructor() {
    this.searchQuery = '';
    this.categoryFilter = 'all';
  }

  render() {
    const container = document.getElementById('expenses-table-body');
    if (!container) return;

    let list = [...window.store.data.expenses];

    if (this.categoryFilter !== 'all') {
      list = list.filter(e => e.category === this.categoryFilter);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(e => 
        (e.id && e.id.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.activityName && e.activityName.toLowerCase().includes(q)) ||
        (e.paidBy && e.paidBy.toLowerCase().includes(q)) ||
        (e.vendorOrMember && e.vendorOrMember.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5">
            <div class="empty-state">
              <div class="empty-state-icon">💸</div>
              <div class="empty-state-title">No expenses recorded</div>
              <div class="empty-state-desc">Record a new expense using the "+ Add Expense" button above.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = list.map(e => `
      <tr>
        <td><span class="code-pill">${window.escapeHTML(e.id)}</span></td>
        <td>${window.UI.formatDate(e.date)}</td>
        <td>
          <div style="font-weight:600;">${window.escapeHTML(e.activityName)}</div>
          <div style="font-size:11.5px; color:var(--text-tertiary);">${window.escapeHTML(e.category)}</div>
        </td>
        <td>
          <div style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${window.escapeHTML(e.description)}">
            ${window.escapeHTML(e.description)}
          </div>
        </td>
        <td>
          <div>${window.escapeHTML(e.paidBy || '-')}</div>
          ${e.isMemberPersonalExpense ? '<span class="badge badge-warning" style="font-size:10px;">Personal Payment</span>' : ''}
        </td>
        <td>${window.escapeHTML(e.paymentMethod || '-')}</td>
        <td style="font-weight:700; color:var(--primary); font-family:var(--font-mono);">
          ${window.UI.formatMoney(e.amount)}
        </td>
        <td>${window.UI.getStatusBadge(e.status)}</td>
      </tr>
    `).join('');
  }

  async handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;

    const activityId = form.activityId.value;
    const isPersonal = form.isMemberPersonalExpense ? form.isMemberPersonalExpense.checked : false;
    const paidByMemberInput = form.paidByMember;
    const paidByMemberName = paidByMemberInput ? paidByMemberInput.value.trim() : '';

    const amountVal = parseFloat(form.amount.value);
    if (isNaN(amountVal) || amountVal <= 0 || !Number.isFinite(amountVal) || amountVal > 100000000) {
      window.UI.showToast('Please enter a valid positive expense amount (Max ৳100,000,000).', 'warning');
      return;
    }

    // Check if the entered name matches any existing member
    let memberId = '';
    if (paidByMemberName && window.store.data.members) {
      const matchedMember = window.store.data.members.find(m => 
        (m.name && m.name.toLowerCase() === paidByMemberName.toLowerCase()) ||
        (m.id && m.id.toLowerCase() === paidByMemberName.toLowerCase())
      );
      if (matchedMember) {
        memberId = matchedMember.id;
      }
    }

    const accountId = form.accountId ? form.accountId.value : '';

    if (!activityId) {
      window.UI.showToast('Please select a linked activity or project.', 'warning');
      return;
    }
    if (isPersonal && !paidByMemberName) {
      window.UI.showToast('Please enter the name of the person who paid personal money.', 'warning');
      return;
    }
    if (!isPersonal && !accountId) {
      window.UI.showToast('Please select an account/vault to deduct payment from.', 'warning');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-primary');
    if (window.UI.setButtonLoading(submitBtn, true, 'Recording Expense...') === false) {
      return; // Prevent multi-clicks
    }

    const activity = (window.store.data.activities || []).find(a => a.id === activityId) ||
                     (window.store.data.projects || []).find(p => p.id === activityId);
    const account = (window.store.data.accounts || []).find(a => a.id === accountId);

    const payload = {
      date: form.date.value,
      activityId: activityId,
      activityName: activity ? activity.name : 'General Fund',
      category: form.category.value,
      description: form.description.value.trim(),
      amount: amountVal,
      paymentMethod: isPersonal ? `Personal Payment (${paidByMemberName})` : form.paymentMethod.value,
      accountId: isPersonal ? null : accountId,
      accountName: isPersonal ? 'Pending Reimbursement' : (account ? account.name : ''),
      paidBy: isPersonal ? paidByMemberName : 'WCC Direct',
      memberId: isPersonal ? (memberId || null) : null,
      vendorOrMember: form.vendorOrMember.value.trim() || (isPersonal ? paidByMemberName : 'General Supplier'),
      referenceNumber: form.referenceNumber.value.trim(),
      remarks: form.remarks.value.trim(),
      isMemberPersonalExpense: isPersonal
    };

    try {
      // Check if file attached
      const fileInput = form.querySelector('input[type="file"]');
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const uploadRes = await window.api.uploadFile(file, { activityId });
        payload.attachmentUrl = uploadRes.driveUrl;
        payload.attachmentName = uploadRes.fileName;
      }

      await window.api.request('createExpense', payload);
      window.UI.closeModal('modal-add-expense');
      window.UI.showToast('Expense recorded successfully!', 'success');
      form.reset();

      // Reset personal payment toggle UI
      const memberPaidGroup = document.getElementById('group-paid-by-member');
      const accountGroup = document.getElementById('group-expense-account');
      if (memberPaidGroup) memberPaidGroup.style.display = 'none';
      if (accountGroup) accountGroup.style.display = 'block';

      this.render();
      window.dashboardModule?.render();
      window.transactionsModule?.render();
      if (window.app && window.app.populateSelectDropdowns) {
        window.app.populateSelectDropdowns();
      }
    } catch (err) {
      window.UI.showToast(`Failed to record expense: ${err.message}`, 'error');
    } finally {
      window.UI.setButtonLoading(submitBtn, false);
    }
  }
}

window.expensesModule = new ExpensesModule();
