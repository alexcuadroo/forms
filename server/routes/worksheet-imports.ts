import express from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { uuid } from '../../shared/forms.ts';
import { finishWorksheetImport, importWorksheet, importWorksheetMedia } from '../services/worksheet-import.ts';
import { limit } from '../storage/files.ts';

export const worksheetImports = express.Router();
worksheetImports.use((req, res, next) => {
  const secret = process.env.FORMS_IMPORT_SECRET?.trim();
  if (!secret) return res.status(404).json({ error: 'Ruta desconocida.' });
  const actual = Buffer.from(req.get('Authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: 'Credencial de integración inválida.' });
  const supplied = req.get('X-Request-ID');
  const requestId = uuid(supplied) ? supplied : randomUUID();
  const started = Date.now();
  res.set('X-Request-ID', requestId);
  res.once('finish', () => console.info('[worksheet import]', { requestId, method: req.method, status: res.statusCode, durationMs: Date.now() - started }));
  next();
});

worksheetImports.post('/', express.json({ limit: '2mb' }), async (req, res) => {
  const result = await importWorksheet(req.body);
  res.status(result.reused ? 200 : 201).json(result);
});
worksheetImports.put('/:id/media/:digest', express.raw({ type: 'application/octet-stream', limit }), async (req, res) => {
  await importWorksheetMedia(req.params.id, req.params.digest, req.body);
  res.status(204).end();
});
worksheetImports.post('/:id/complete', async (req, res) => {
  await finishWorksheetImport(req.params.id);
  res.status(204).end();
});
