const API_URL = (process.env.PG365_API_URL || 'https://api.poctgoyercini.com').replace(/\/$/, '');


// PG365 sənədində göstərilən mesaj məqsədləri.
const MESSAGE_PURPOSE = Object.freeze({
  OTP: 'INF', // OTP xidmət/məlumatlandırma mesajıdır
  SERVICE: 'INF', // Servis / məlumatlandırma mesajı
  ADVERTISING: 'ADV' // Reklam mesajı
});


function config() {
  return {
    apiUrl: API_URL,
    publicKey: process.env.PG365_PUBLIC_KEY,
    privateKey: process.env.PG365_PRIVATE_KEY,
    originator: process.env.PG365_ORIGINATOR || undefined,
    mock: process.env.PG365_MOCK === 'true'
  };
}


async function sendOtpSms(receiver, code) {
  const settings = config();
  if (settings.mock) {
    return { providerId: `mock-${Date.now()}`, mocked: true };
  }
  if (!settings.publicKey || !settings.privateKey) {
    const error = new Error('PG365 açarları konfiqurasiya edilməyib');
    error.code = 'PG365_NOT_CONFIGURED';
    throw error;
  }


  const response = await fetch(
    `${settings.apiUrl}/gateway/api/sms/v1/message/send?publicKey=${encodeURIComponent(settings.publicKey)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.privateKey}`,
