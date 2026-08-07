import { Router } from 'express';
import protect from '../../middleware/authMiddleware.js';
import { deleteProfile, getProfile, reanalyzeProfile, upload } from './resumeController.js';
import uploadResume from './uploadMiddleware.js';

const router = Router();

router.post('/upload', protect, uploadResume.single('resume'), upload);
router.get('/profile', protect, getProfile);
router.post('/reanalyze', protect, reanalyzeProfile);
router.delete('/profile', protect, deleteProfile);

export default router;

