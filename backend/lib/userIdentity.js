const userCode = id => `EH-${String(id).padStart(6, '0')}`;
const fullName = user => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.name || '';
module.exports = { userCode, fullName };
