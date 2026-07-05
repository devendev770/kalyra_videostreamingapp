import { Router } from 'express';
import { getDashboard, getUsers, toggleUserBan, changeUserRole, getAdminVideos, removeVideo, getReports, resolveReport, createReport, getAuditLogs, getAdminAnalytics, getCredentials, updateCredentials } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { reportSchema } from '../validators/index.js';

const router = Router();
router.post('/reports', authenticate, validate(reportSchema), createReport);

// Admin-only routes
router.use(authenticate, authorize('admin'));
router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.post('/users/:id/ban', toggleUserBan);
router.put('/users/:id/role', changeUserRole);
router.get('/videos', getAdminVideos);
router.delete('/videos/:id', removeVideo);
router.get('/reports', getReports);
router.put('/reports/:id', resolveReport);
router.get('/audit-logs', getAuditLogs);
router.get('/analytics', getAdminAnalytics);
router.get('/credentials', getCredentials);
router.put('/credentials', updateCredentials);

export default router;
