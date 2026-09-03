const https = require('https');

const API_URL = (process.env.PG365_API_URL || 'https://api.poctgoyercini.com').replace(/\/$/, '');

const MESSAGE_PURPOSE = Object.freeze({
  OTP: 'INF',
  SERVICE: 'INF',
  ADVERTISING: 'ADV'
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

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(new URL(url), {
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      // Exception is scoped only to PG365; TLS remains enabled everywhere else.
      rejectUnauthorized: false
    }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        let payload = null;
        try { payload = JSON.parse(raw); } catch {}
        resolve({ statusCode: response.statusCode || 0, payload });
      });
    });
    request.setTimeout(15000, () => request.destroy(new Error('PG365 request timeout')));
    request.on('error', reject);
    request.end(body);
  });
}

async function sendOtpSms(receiver, code) {
  const settings = config();
  if (settings.mock) return { providerId: 'mock-' + Date.now(), mocked: true };
  if (!settings.publicKey || !settings.privateKey) {
    const error = new Error('PG365 açarları konfiqurasiya edilməyib');
    error.code = 'PG365_NOT_CONFIGURED';
    throw error;
  }

  const body = JSON.stringify({
    Text: 'Essen Home giris kodunuz: ' + code + '. Kod 5 deqiqe etibarlidir.',
    Purpose: MESSAGE_PURPOSE.OTP,
    Options: {
      ...(settings.originator ? { Originator: settings.originator } : {}),
      Encoding: 'LATIN',
      SmsType: 'SMS',
      ReportLabel: 'Essen Home OTP'
    },
    Receivers: [{ Receiver: receiver }]
  });
  const result = await postJson(
    settings.apiUrl + '/gateway/api/sms/v1/message/send?publicKey=' + encodeURIComponent(settings.publicKey),
    { Authorization: 'Bearer ' + settings.privateKey, 'Content-Type': 'application/json' },
    body
  );
  const payload = result.payload;
  const accepted = payload?.Result?.ReceiversAccepted?.[0];
  if (result.statusCode < 200 || result.statusCode >= 300 || Number(payload?.Status) !== 200 || !accepted) {
    const error = new Error(payload?.Description || payload?.Result?.ReceiversRejected?.[0]?.ErrorMessage || 'SMS göndərilmədi');
    error.code = 'PG365_SEND_FAILED';
    error.status = result.statusCode;
    throw error;
  }
  return { providerId: String(accepted.id), mocked: false };
}

module.exports = { sendOtpSms, config, MESSAGE_PURPOSE };
