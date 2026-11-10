const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminCheck');
const { validateVacancy, publicWhere, publicSelect, publicOrder, renderVacancies } = require('../lib/vacancies');

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
      res.json(await db.vacancy.update({ where: { id: req.vacancyId }, data }));
    } catch (error) { failure(res, error); }
  });
  // Archiving is reversible from the admin status selector.
  router.delete('/:id', async (req, res) => {
    try { res.json(await db.vacancy.update({ where: { id: req.vacancyId }, data: { status: 'archived' } })); }
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
      res.type('html').send(renderVacancies(template(), rows));
    } catch (error) {
      console.error('Vacancy page failed:', error.code || error.name);
      res.status(503).set('X-Robots-Tag', 'noindex').type('html').send(renderVacancies(template(), [], true));
    }
  });
  return router;
}

module.exports = { createVacanciesAdminRouter, createVacancyPagesRouter };
