/**
 * WCC Finance Management & Accounting System
 * Google Apps Script - Activities Logic
 */

function gasCreateActivity(payload, user) {
  var actId = generateUniqueId('WCC-ACT', GAS_CONFIG.SHEETS.ACTIVITIES);
  var now = new Date().toISOString().substring(0, 10);

  var actRow = [
    actId,
    payload.name,
    payload.type,
    payload.startDate,
    payload.endDate || '',
    payload.location || 'Dhaka',
    payload.description || '',
    Number(payload.budget || 0),
    0,
    payload.responsiblePerson || '',
    'Active',
    now,
    payload.notes || ''
  ];
  appendSheetRow(GAS_CONFIG.SHEETS.ACTIVITIES, actRow);

  gasLogAudit(user, 'Create Activity', 'Activities', actId, 'Created activity "' + payload.name + '" with budget ৳' + payload.budget);

  return {
    id: actId,
    activityId: actId,
    name: payload.name,
    type: payload.type,
    startDate: payload.startDate,
    endDate: payload.endDate || '',
    location: payload.location || 'Dhaka',
    description: payload.description || '',
    budget: Number(payload.budget || 0),
    actualExpense: 0,
    responsiblePerson: payload.responsiblePerson || '',
    status: 'Active',
    createdDate: now,
    notes: payload.notes || ''
  };
}

function gasCloseActivity(payload, user) {
  var sheet = getSheet(GAS_CONFIG.SHEETS.ACTIVITIES);
  var data = sheet.getDataRange().getValues();
  var actId = payload.activityId;
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === actId) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === -1) throw new Error('Activity ID not found: ' + actId);

  // Update Status column (Index 11 -> Column K) to 'Completed'
  sheet.getRange(foundRow, 11).setValue('Completed');

  gasLogAudit(user, 'Close Activity', 'Activities', actId, 'Activity marked as Completed and locked');

  return { activityId: actId, status: 'Completed' };
}
