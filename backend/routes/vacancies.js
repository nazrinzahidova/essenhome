const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminCheck');
const { validateVacancy, publicWhere, publicSelect, publicOrder, renderVacancies } = require('../lib/vacancies');
const { vacancyPath } = require('../lib/vacancyPaths');
const { renderVacancyList, renderVacancyDetail, renderVacancyUnavailable, renderVacanciesSitemap } = require('../lib/vacancySeo');

function failure(res, error) {
  if (error.code === 'P2025') return res.status(404).json({ message: 'Vakansiya tapılmadı.' });
  console.error('Vacancy operation failed:', error.code || error.name);
  return res.status(503).json({ message: 'Əməliyyat alınmadı. Yenidən cəhd edin.' });
}

function createVacanciesAdminRouter(db) {
  const router = express.Router();
  router.use(auth, admin, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.param('id', (req, res, next, value) => {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return res.status(400).json({ message: 'Vakansiya düzgün deyil.' });
    req.vacancyId = Number(value); next();
  });
  router.get('/', async (_req, res) => {
    try { res.json(await db.vacancy.findMany({ orderBy: publicOrder })); }
    catch (error) { failure(res, error); }
  });
  router.post('/', async (req, res) => {
    let data;
    try { data = validateVacancy(req.body); }
    catch (error) { return res.status(400).json({ message: error.message }); }
    if (data.status === 'published') data.publishedAt = new Date();
    try { res.status(201).json(await db.vacancy.create({ data })); }
    catch (error) { failure(res, error); }
  });
  router.patch('/:id', async (req, res) => {
    try {
      const old = await db.vacancy.findUnique({ where: { id: req.vacancyId } });
      if (!old) return res.status(404).json({ message: 'Vakansiya tapılmadı.' });
      let data;
      try { data = validateVacancy(req.body, old); }
      catch (error) { return res.status(400).json({ message: error.message }); }
      if (!old.publishedAt && old.status === 'published') data.publishedAt = old.createdAt;
      else if (!old.publishedAt && data.status === 'published') data.publishedAt = new Date();
      res.json(await db.vacancy.update({ where: { id: req.vacancyId }, data }));
    } catch (error) { failure(res, error); }
  });
  // Archiving is reversible from the admin status selector.
  router.delete('/:id', async (req, res) => {
    try {
      const old = await db.vacancy.findUnique({ where: { id: req.vacancyId } });
      if (!old) return res.status(404).json({ message: 'Vakansiya tapılmadı.' });
      const data = { status:'archived' };
      if (!old.publishedAt && old.status === 'published') data.publishedAt = old.createdAt;
      res.json(await db.vacancy.update({ where: { id: req.vacancyId }, data }));
    }
    catch (error) { failure(res, error); }
  });
  return router;
}

function createVacancyPagesRouter(db) {
  const router = express.Router();
  const template = () => fs.readFileSync(path.join(__dirname, '../../frontend/vakansiyalar.html'), 'utf8');
  router.get('/vakansiyalar', (_req, res) => res.redirect(301, '/vakansiyalar.html'));
  router.get('/vakansiyalar.html', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const rows = await db.vacancy.findMany({ where: publicWhere(), select: publicSelect, orderBy: publicOrder });
      res.type('html').send(renderVacancyList(template(), rows));
    } catch (error) {
      console.error('Vacancy page failed:', error.code || error.name);
      res.status(503).set('X-Robots-Tag', 'noindex').type('html').send(renderVacancies(template(), [], true));
    }
  });
  router.get('/sitemap-vacancies.xml', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const rows = await db.vacancy.findMany({ where: publicWhere(), select: { id:true, title:true, updatedAt:true, createdAt:true, publishedAt:true }, orderBy:publicOrder });
      res.type('application/xml').send(renderVacanciesSitemap(rows));
    } catch (error) {
      console.error('Vacancies sitemap failed:', error.code || error.name);
      res.status(503).set('X-Robots-Tag','noindex').send('Səhifə müvəqqəti əlçatan deyil.');
    }
  });
  router.get(/^\/vakansiyalar\/([1-9]\d*)(?:\/[^/]+)?\/?$/, async (req, res) => {
    res.set('Cache-Control','no-store');
    const id = Number(req.params[0]);
    const notFound = () => res.status(404).set('X-Robots-Tag','noindex').type('html').send(renderVacancyUnavailable(template()));
    if (!Number.isSafeInteger(id) || id > 2147483647) return notFound();
    try {
      const item = await db.vacancy.findUnique({ where:{ id } });
      if (!item || item.status !== 'published' || (item.deadline && new Date(item.deadline) < new Date())) return notFound();
      const canonicalPath = vacancyPath(item);
      if (req.path !== canonicalPath) return res.redirect(301, canonicalPath);
      res.type('html').send(renderVacancyDetail(template(),item));
    } catch (error) {
      console.error('Vacancy detail failed:', error.code || error.name);
      res.status(503).set('X-Robots-Tag','noindex').type('html').send(renderVacancyUnavailable(template(),true));
    }
  });
  return router;
}

module.exports = { createVacanciesAdminRouter, createVacancyPagesRouter };
