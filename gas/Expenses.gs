/**
 * WCC Finance Management & Accounting System
 * Google Apps Script - Expense Logic
 */

function gasCreateExpense(payload, user) {
  var amount = Number(payload.amount);
  if (isNaN(amount) || amount <= 0 || !isFinite(amount) || amount > 100000000) {
    throw new Error('Invalid expense amount: must be a positive number up to ৳100,000,000');
  }

  var expId = generateUniqueId('WCC-EXP', GAS_CONFIG.SHEETS.EXPENSES);
  var txnId = generateUniqueId('WCC-TXN', GAS_CONFIG.SHEETS.TRANSACTIONS);
  var now = new Date().toISOString().substring(0, 19).replace('T', ' ');

  var isPersonal = !!payload.isMemberPersonalExpense;
  var status = isPersonal ? 'Pending Reimbursement' : 'Paid';
  var reimId = '';

  // If Member Personal Expense, automatically generate Reimbursement Record
  if (isPersonal) {
    reimId = generateUniqueId('WCC-REIM', GAS_CONFIG.SHEETS.REIMBURSEMENTS);
    var reimRow = [
      reimId,
      payload.memberId || '',
      payload.paidBy || '',
      expId,
      payload.activityId || '',
      payload.activityName || '',
      payload.category || '',
      payload.description || '',
      amount,
      payload.date || now.substring(0, 10),
      'Submitted',
      '',
      'Pending',
      '',
      '',
      payload.attachmentUrl || '',
      'Auto-created from Personal Expense entry'
    ];
    appendSheetRow(GAS_CONFIG.SHEETS.REIMBURSEMENTS, reimRow);
  }

  var expRow = [
    expId,
    payload.date,
    payload.activityId,
    payload.activityName,
    payload.category,
    payload.description,
    amount,
    payload.paymentMethod,
    payload.accountId || '',
    payload.accountName || (isPersonal ? 'Pending Reimbursement' : ''),
    payload.paidBy,
    payload.vendorOrMember || '',
    payload.referenceNumber || '',
    payload.attachmentUrl || '',
    status,
    isPersonal ? 'TRUE' : 'FALSE',
    reimId,
    payload.settledFromAdvanceId || '',
    user ? user.name : 'System',
    now,
    payload.remarks || ''
  ];
  appendSheetRow(GAS_CONFIG.SHEETS.EXPENSES, expRow);

  // Mirror into central Transactions ledger
  var txnRow = [
    txnId,
    payload.date,
    'Expense',
    payload.activityId,
    payload.activityName,
    payload.category,
    payload.description,
    Number(payload.amount),
    payload.paymentMethod,
    payload.accountId || '',
    payload.accountName || (isPersonal ? 'Pending Reimbursement' : ''),
    payload.paidBy,
    '',
    payload.vendorOrMember || '',
    payload.referenceNumber || '',
    status,
    payload.attachmentUrl || '',
    user ? user.name : 'System',
    now
  ];
  appendSheetRow(GAS_CONFIG.SHEETS.TRANSACTIONS, txnRow);

  gasLogAudit(user, 'Create Expense', 'Expenses', expId, 'Recorded expense of ৳' + payload.amount + ' for ' + payload.activityName);

  return {
    id: expId,
    expenseId: expId,
    transactionId: txnId,
    reimbursementId: reimId,
    date: payload.date,
    activityId: payload.activityId,
    activityName: payload.activityName,
    category: payload.category,
    description: payload.description,
    amount: Number(payload.amount),
    paymentMethod: payload.paymentMethod,
    accountId: payload.accountId || null,
    accountName: payload.accountName || (isPersonal ? 'Pending Reimbursement' : ''),
    paidBy: payload.paidBy,
    vendorOrMember: payload.vendorOrMember || '',
    referenceNumber: payload.referenceNumber || '',
    attachmentUrl: payload.attachmentUrl || '',
    status: status,
    isMemberPersonalExpense: isPersonal,
    settledFromAdvanceId: payload.settledFromAdvanceId || '',
    createdBy: user ? user.name : 'System',
    remarks: payload.remarks || ''
  };
}
