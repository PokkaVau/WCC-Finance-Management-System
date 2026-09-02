/**
 * WCC Finance Management & Accounting System
 * Member Advances & Settlements Module
 */

class AdvancesModule {
  constructor() {
    this.searchQuery = '';
  }

  render() {
    const container = document.getElementById('advances-table-body');
    const settlementsContainer = document.getElementById('settlements-table-body');
    if (!container) return;

    let list = [...window.store.data.advances];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(a => 
        (a.memberName && a.memberName.toLowerCase().includes(q)) ||
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.activityName && a.activityName.toLowerCase().includes(q)) ||
        (a.purpose && a.purpose.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">No advance requisitions found.</td>
        </tr>
      `;
    } else {
      container.innerHTML = list.map(adv => {
        const isSettled = adv.status === 'Settled';
        return `
          <tr>
            <td><span class="code-pill">${window.escapeHTML(adv.id)}</span></td>
            <td>${window.UI.formatDate(adv.disbursementDate)}</td>
            <td><strong>${window.escapeHTML(adv.memberName)}</strong></td>
            <td>${window.escapeHTML(adv.activityName)}</td>
            <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${window.escapeHTML(adv.purpose)}</td>
            <td style="font-weight:700; color:var(--navy); font-family:var(--font-mono);">${window.UI.formatMoney(adv.advanceAmount)}</td>
            <td>${window.UI.getStatusBadge(adv.status)}</td>
            <td class="actions-cell">
              ${!isSettled ? `
                <button class="btn btn-primary btn-sm" onclick="window.advancesModule.initSettleModal('${window.escapeHTML(adv.id)}')">
                  ⚖️ Settle Advance
                </button>
              ` : `
                <span class="badge badge-paid">Reconciled</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    }

    // Render Settlements Table
    if (settlementsContainer) {
      const settlements = window.store.data.advanceSettlements || [];
      if (settlements.length === 0) {
        settlementsContainer.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No settlements completed yet.</td></tr>`;
      } else {
        settlementsContainer.innerHTML = settlements.map(s => `
          <tr>
            <td><span class="code-pill">${window.escapeHTML(s.id)}</span></td>
            <td>${window.UI.formatDate(s.settlementDate)}</td>
            <td><strong>${window.escapeHTML(s.memberName)}</strong></td>
            <td>${window.UI.formatMoney(s.advanceAmount)}</td>
            <td>${window.UI.formatMoney(s.actualExpense)}</td>
            <td style="font-weight:600; color:var(--gold-dark);">${window.escapeHTML(s.settlementAction)}</td>
            <td><span class="badge badge-paid">Closed</span></td>
          </tr>
        `).join('');
      }
    }
  }

  initSettleModal(advanceId) {
    const adv = window.store.data.advances.find(a => a.id === advanceId);
    if (!adv) return;

    document.getElementById('settle-adv-id').value = adv.id;
    document.getElementById('settle-adv-member-display').textContent = adv.memberName;
    document.getElementById('settle-adv-activity-display').textContent = adv.activityName;
    document.getElementById('settle-adv-amount-display').textContent = window.UI.formatMoney(adv.advanceAmount);
    document.getElementById('settle-adv-original-amount').value = adv.advanceAmount;

    // Reset variance display
    this.recalculateVariance();
    window.UI.openModal('modal-settle-advance');
  }

  recalculateVariance() {
    const orig = parseFloat(document.getElementById('settle-adv-original-amount')?.value || 0);
    const actual = parseFloat(document.getElementById('settle-adv-actual-spent')?.value || 0);
    const varianceEl = document.getElementById('settle-adv-variance-result');
    const refundGroup = document.getElementById('settle-refund-account-group');

    if (!varianceEl) return;

    const diff = orig - actual;
    if (diff > 0) {
      varianceEl.innerHTML = `<span style="color:var(--success); font-weight:700;">Refund Due to WCC: ${window.UI.formatMoney(diff)}</span>`;
      if (refundGroup) refundGroup.style.display = 'block';
    } else if (diff < 0) {
      varianceEl.innerHTML = `<span style="color:var(--primary); font-weight:700;">Additional Reimbursement Due to Member: ${window.UI.formatMoney(Math.abs(diff))}</span>`;
      if (refundGroup) refundGroup.style.display = 'none';
    } else {
      varianceEl.innerHTML = `<span style="color:var(--text-secondary); font-weight:700;">Exact Settlement (৳0 Balance)</span>`;
      if (refundGroup) refundGroup.style.display = 'none';
    }
  }

  async handleSettleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-primary');

    const actualExpenseVal = parseFloat(form.actualExpense ? form.actualExpense.value : 0) || 0;
    if (isNaN(actualExpenseVal) || actualExpenseVal < 0 || !Number.isFinite(actualExpenseVal) || actualExpenseVal > 100000000) {
      window.UI.showToast('Please enter a valid actual expense amount (Max ৳100,000,000).', 'warning');
      return;
    }

    if (window.UI.setButtonLoading(submitBtn, true, 'Settling Advance...') === false) {
      return;
    }

    const payload = {
      advanceId: form.advanceId.value,
      actualExpense: actualExpenseVal,
      refundAccountId: form.refundAccountId?.value || null,
      refundAccountName: form.refundAccountId?.selectedOptions[0]?.text || '',
      settlementDate: form.settlementDate.value,
      notes: form.notes ? form.notes.value.trim() : ''
    };

    try {
      await window.api.request('settleAdvance', payload);
      window.UI.closeModal('modal-settle-advance');
      window.UI.showToast('Advance reconciled and settled successfully!', 'success');
      this.render();
      window.dashboardModule?.render();
      if (window.app && window.app.populateSelectDropdowns) {
        window.app.populateSelectDropdowns();
      }
    } catch (err) {
      window.UI.showToast(`Settlement failed: ${err.message}`, 'error');
    } finally {
      window.UI.setButtonLoading(submitBtn, false);
    }
  }

  async handleCreateAdvanceSubmit(event) {
    event.preventDefault();
    const form = event.target;

    const memberId = form.memberId ? form.memberId.value : '';
    const activityId = form.activityId ? form.activityId.value : '';
    const accountId = form.accountId ? form.accountId.value : '';
    const advanceAmount = parseFloat(form.advanceAmount ? form.advanceAmount.value : 0);

    if (!memberId) {
      window.UI.showToast('Please select a recipient member.', 'warning');
      return;
    }
    if (!activityId) {
      window.UI.showToast('Please select a linked activity.', 'warning');
      return;
    }
    if (!accountId) {
      window.UI.showToast('Please select an account to disburse advance from.', 'warning');
      return;
    }
    if (isNaN(advanceAmount) || advanceAmount <= 0 || !Number.isFinite(advanceAmount) || advanceAmount > 100000000) {
      window.UI.showToast('Please enter a valid positive advance amount (Max ৳100,000,000).', 'warning');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-primary') || form.querySelector('.btn-navy');
    if (window.UI.setButtonLoading(submitBtn, true, 'Issuing Advance...') === false) {
      return;
    }

    const member = (window.store.data.members || []).find(m => m.id === memberId) ||
                   (window.store.data.users || []).find(u => u.id === memberId);
    const memberName = member ? member.name : (form.memberId.selectedOptions[0]?.dataset?.name || form.memberId.selectedOptions[0]?.text.split(' (')[0] || 'Member');

    const activity = (window.store.data.activities || []).find(a => a.id === activityId) ||
                     (window.store.data.projects || []).find(p => p.id === activityId);

    const account = (window.store.data.accounts || []).find(a => a.id === accountId);

    const payload = {
      memberId: memberId,
      memberName: memberName,
      activityId: activityId,
      activityName: activity ? activity.name : '',
      purpose: form.purpose ? form.purpose.value.trim() : '',
      advanceAmount: advanceAmount,
      disbursementDate: form.disbursementDate.value,
      paymentMethod: form.paymentMethod.value,
      accountId: accountId,
      accountName: account ? account.name : '',
      paymentReference: form.paymentReference ? form.paymentReference.value.trim() : '',
      notes: form.notes ? form.notes.value.trim() : ''
    };

    try {
      await window.api.request('createAdvance', payload);
      window.UI.closeModal('modal-add-advance');
      window.UI.showToast(`Advance of ৳${payload.advanceAmount} issued to ${memberName}!`, 'success');
      form.reset();
      this.render();
      window.dashboardModule?.render();
      if (window.app && window.app.populateSelectDropdowns) {
        window.app.populateSelectDropdowns();
      }
    } catch (err) {
      window.UI.showToast(`Failed to issue advance: ${err.message}`, 'error');
    } finally {
      window.UI.setButtonLoading(submitBtn, false);
    }
  }
}

window.advancesModule = new AdvancesModule();
