import { Router } from 'express';
import protect from '../../middleware/authMiddleware.js';
import { executionStatus, getBatch, getOne, history, run, start, submit } from './codingController.js';

const router = Router();
router.use(protect);
router.post('/start', start);
router.get('/execution-status', executionStatus);
router.get('/history', history);
router.get('/batch/:batchId', getBatch);
router.get('/:id', getOne);
router.post('/:id/run', run);
router.post('/:id/submit', submit);

export default router;
