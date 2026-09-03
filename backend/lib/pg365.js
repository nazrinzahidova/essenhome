const API_URL = (process.env.PG365_API_URL || 'https://api.poctgoyercini.com').replace(/\/$/, '');

// PG365 sənədində göstərilən mesaj məqsədləri.
const MESSAGE_PURPOSE = Object.freeze({
  OTP: 'INF', // Doğrulama və giriş kodu
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Text: `Essen Home giris kodunuz: ${code}. Kod 5 deqiqe etibarlidir.`,
        Purpose: MESSAGE_PURPOSE.OTP,
        Options: {
          ...(settings.originator ? { Originator: settings.originator } : {}),
          Encoding: 'LATIN',
          SmsType: 'SMS',
          ReportLabel: 'Essen Home OTP'
        },
        Receivers: [{ Receiver: receiver }]
      }),
      signal: AbortSignal.timeout(15000)
    }
  );

  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  const accepted = payload?.Result?.ReceiversAccepted?.[0];
  if (!response.ok || Number(payload?.Status) !== 200 || !accepted) {
    const error = new Error(payload?.Description || payload?.Result?.ReceiversRejected?.[0]?.ErrorMessage || 'SMS göndərilmədi');
    error.code = 'PG365_SEND_FAILED';
    error.status = response.status;
    throw error;
  }
  return { providerId: String(accepted.id), mocked: false };
}

module.exports = { sendOtpSms, config, MESSAGE_PURPOSE };
