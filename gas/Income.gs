/**
 * WCC Finance Management & Accounting System
 * Google Apps Script - Income Logic
 */

function gasCreateIncome(payload, user) {
  var amount = Number(payload.amount);
  if (isNaN(amount) || amount <= 0 || !isFinite(amount) || amount > 100000000) {
    throw new Error('Invalid income amount: must be a positive number up to ৳100,000,000');
  }

  var incId = generateUniqueId('WCC-INC', GAS_CONFIG.SHEETS.INCOME);
  var txnId = generateUniqueId('WCC-TXN', GAS_CONFIG.SHEETS.TRANSACTIONS);
  var now = new Date().toISOString().substring(0, 19).replace('T', ' ');

  var incRow = [
    incId,
    payload.date,
    payload.incomeType,
    payload.sourceOrDonor,
    payload.activityId || '',
    payload.activityName || 'General Fund',
    amount,
    payload.paymentMethod,
    payload.accountId || '',
    payload.accountName || '',
    payload.referenceNumber || '',
    payload.supportingDocUrl || '',
    payload.remarks || '',
    user ? user.name : 'System',
    now
  ];
  appendSheetRow(GAS_CONFIG.SHEETS.INCOME, incRow);

  var txnRow = [
    txnId,
    payload.date,
    'Income',
    payload.activityId || '',
    payload.activityName || 'General Fund',
    payload.incomeType,
    'Income received from ' + payload.sourceOrDonor,
    Number(payload.amount),
    payload.paymentMethod,
    payload.accountId || '',
    payload.accountName || '',
    '',
    payload.sourceOrDonor,
    payload.sourceOrDonor,
    payload.referenceNumber || '',
    'Paid',
    payload.supportingDocUrl || '',
    user ? user.name : 'System',
    now
  ];
  appendSheetRow(GAS_CONFIG.SHEETS.TRANSACTIONS, txnRow);

  gasLogAudit(user, 'Create Income', 'Income', incId, 'Received ৳' + payload.amount + ' from ' + payload.sourceOrDonor);

  return {
    id: incId,
    incomeId: incId,
    transactionId: txnId,
    date: payload.date,
    incomeType: payload.incomeType,
    sourceOrDonor: payload.sourceOrDonor,
    activityId: payload.activityId || null,
    activityName: payload.activityName || 'General Fund',
    amount: Number(payload.amount),
    paymentMethod: payload.paymentMethod,
    accountId: payload.accountId || null,
    accountName: payload.accountName || '',
    referenceNumber: payload.referenceNumber || '',
    supportingDocUrl: payload.supportingDocUrl || '',
    remarks: payload.remarks || '',
    createdBy: user ? user.name : 'System'
  };
}
