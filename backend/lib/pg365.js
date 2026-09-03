const https = require('https');
const fs = require('fs');
const path = require('path');

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

const PG365_CA = fs.readFileSync(path.join(__dirname, 'certs', 'globalsign-root-r6.pem'), 'utf8');
const agent = new https.Agent({
  ca: PG365_CA,
  rejectUnauthorized: true,
  keepAlive: true,
  maxSockets: 3,
  timeout: 20000
});

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(new URL(url), {
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      agent,
      rejectUnauthorized: true
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
    request.setTimeout(15000, () => {
      const error = new Error('PG365 request timeout');
      error.code = 'PG365_TIMEOUT';
      request.destroy(error);
    });
    request.on('error', reject);
    request.end(body);
  });
}

function isRetryable(error) {
  return ['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ETIMEDOUT', 'PG365_TIMEOUT'].includes(error?.code);
}

async function postJsonWithRetry(url, headers, body) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await postJson(url, headers, body);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  throw lastError;
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
  const result = await postJsonWithRetry(
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
