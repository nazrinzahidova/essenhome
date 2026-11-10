const { vacancyPath } = require('./vacancyPaths');
const textFields = {
  title: [160, 'Vəzifə adı'], department: [120, 'Bölmə'], location: [160, 'İş yeri'],
  employmentType: [80, 'İş qrafiki'], salary: [120, 'Əməkhaqqı'], description: [6000, 'Vəzifə haqqında'],
  requirements: [4000, 'Tələblər'], benefits: [4000, 'İş şəraiti'], additionalNote: [4000, 'Əlavə qeyd'],
  contactEmail: [254, 'Müraciət e-poçtu'], contactPhone: [40, 'WhatsApp nömrəsi']
};
const statuses = ['draft', 'published', 'closed', 'archived'];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function deadlineValue(value) {
  if (value === '' || value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Son müraciət tarixini düzgün seçin.');
  const check = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(check.getTime()) || check.toISOString().slice(0, 10) !== value) throw Error('Son müraciət tarixini düzgün seçin.');
  // The selected day remains open until midnight in Azerbaijan (UTC+04:00).
  return new Date(value + 'T23:59:59.999+04:00');
}

function validateVacancy(body, existing, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('Elan məlumatları düzgün deyil.');
  const data = {};
  for (const [field, [max, label]] of Object.entries(textFields)) {
    if (body[field] === undefined) { if (!existing) data[field] = ''; continue; }
    if (typeof body[field] !== 'string' || body[field].trim().length > max || body[field].includes('\u0000')) throw Error(`${label} sahəsi maksimum ${max} simvol olmalıdır.`);
    data[field] = body[field].trim();
  }
  if (data.contactEmail && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(data.contactEmail)) throw Error('Müraciət e-poçtunu düzgün yazın.');
  if (data.contactPhone) {
    let phone = data.contactPhone.replace(/[\s()\-]/g, '').replace(/^\+/, '');
    if (/^0\d{9}$/.test(phone)) phone = '994' + phone.slice(1);
    if (!/^[1-9]\d{7,14}$/.test(phone)) throw Error('WhatsApp nömrəsini ölkə kodu ilə yazın. Məsələn: +994 10 123 45 67.');
    data.contactPhone = phone;
  }
  if (body.status !== undefined) {
    if (!statuses.includes(body.status)) throw Error('Elanın statusu düzgün deyil.');
    data.status = body.status;
  } else if (!existing) data.status = 'draft';
  if (body.position !== undefined) {
    if (!Number.isInteger(body.position) || body.position < 0 || body.position > 100000) throw Error('Sıra 0–100000 arası tam ədəd olmalıdır.');
    data.position = body.position;
  } else if (!existing) data.position = 1000;
  if (body.deadline !== undefined) data.deadline = deadlineValue(body.deadline);
  else if (!existing) data.deadline = null;
  const next = { ...existing, ...data };
  if (!next.title) throw Error('Vəzifə adını yazın.');
  if (next.status === 'published') {
    if (!next.location || !next.description) throw Error('Yayımlamaq üçün iş yerini və vəzifə haqqında məlumatı yazın.');
    if (!next.contactEmail && !next.contactPhone) throw Error('Yayımlamaq üçün müraciət e-poçtu və ya WhatsApp nömrəsi əlavə edin.');
    if (next.deadline && new Date(next.deadline) < now) throw Error('Son müraciət tarixi keçib. Tarixi yeniləyin və ya elanı bağlayın.');
  }
  return data;
}

const publicWhere = (now = new Date()) => ({ status: 'published', OR: [{ deadline: null }, { deadline: { gte: now } }] });
const publicSelect = Object.fromEntries(['id', ...Object.keys(textFields), 'deadline', 'publishedAt', 'createdAt', 'updatedAt'].map(key => [key, true]));
const publicOrder = [{ position: 'asc' }, { id: 'desc' }];

function renderVacancyBody(item, detail = false) {
  const e = escapeHtml;
  const paragraphs = [['Vəzifə haqqında', item.description], ['Tələblər', item.requirements], ['İş şəraiti', item.benefits]]
    .filter(([, text]) => text).map(([label, text]) => `<section><h3>${label}</h3><p class="vacancy-copy">${e(text)}</p></section>`).join('');
  const date = item.deadline ? new Intl.DateTimeFormat('az-AZ', { timeZone: 'Asia/Baku', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(item.deadline)) : '';
  const posted = item.publishedAt || item.createdAt;
  const facts = [...(detail ? [['İş yeri', item.location], ['İş qrafiki', item.employmentType], ['Elan tarixi', posted ? new Intl.DateTimeFormat('az-AZ', { timeZone:'Asia/Baku', day:'2-digit', month:'long', year:'numeric' }).format(new Date(posted)) : '']] : []), ['Əməkhaqqı', item.salary], ['Son müraciət tarixi', date]].filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${e(value)}</dd></div>`).join('');
  const subject = encodeURIComponent(item.title + ' — vakansiyaya müraciət');
  const links = [];
  const note = item.additionalNote ? `<div class="vacancy-note"><p class="vacancy-copy">${e(item.additionalNote)}</p></div>` : '';
  if (item.contactEmail) links.push(`<a class="apply-button" href="mailto:${e(encodeURIComponent(item.contactEmail))}?subject=${subject}"><i class="fa-regular fa-envelope" aria-hidden="true"></i>CV-ni e-poçtla göndər</a>`);
  if (item.contactPhone) links.push(`<a class="apply-button ${item.contactEmail ? 'secondary' : ''}" href="https://wa.me/${e(item.contactPhone)}?text=${encodeURIComponent('Salam! ' + item.title + ' vakansiyasına müraciət etmək istəyirəm.')}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i>WhatsApp ilə müraciət</a>`);
  return `<div class="job-detail">${paragraphs}${facts ? `<dl class="job-facts">${facts}</dl>` : ''}${note}<div class="application-actions">${links.join('')}</div></div>`;
}

function renderVacancy(item) {
  const meta = [item.department, item.location, item.employmentType].filter(Boolean).map(escapeHtml).join(' · ');
  return `<details class="vacancy" id="vakansiya-${Number(item.id)}"><summary><span class="job-main"><span class="job-symbol"><i class="fa-solid fa-briefcase" aria-hidden="true"></i></span><span><strong><a href="${vacancyPath(item)}">${escapeHtml(item.title)}</a></strong><small>${meta}</small></span></span><span class="job-more">Ətraflı bax<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span></summary>${renderVacancyBody(item)}</details>`;
}

function renderVacancies(template, rows, error = false) {
  const content = error
    ? '<div class="empty-jobs" role="alert"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><h2>Vakansiyalar yüklənmədi</h2><p>Bir az sonra yenidən cəhd edin.</p><a href="/vakansiyalar.html">Yenilə</a></div>'
    : rows.length ? `<div class="vacancy-list">${rows.map(renderVacancy).join('')}</div>`
      : '<div class="empty-jobs"><i class="fa-solid fa-briefcase" aria-hidden="true"></i><h2>Hazırda aktiv vakansiya yoxdur</h2><p>Yeni iş imkanları bu səhifədə yayımlanacaq.</p></div>';
  return template.replace('<!-- VACANCY_CONTENT -->', () => content);
}

module.exports = { validateVacancy, deadlineValue, publicWhere, publicSelect, publicOrder, renderVacancies, renderVacancyBody, escapeHtml };
