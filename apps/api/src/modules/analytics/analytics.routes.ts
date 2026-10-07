import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { authenticateJwt, requireRoles } from '../../middleware/auth';

const router = Router();

router.get('/analytics/overview', authenticateJwt, requireRoles('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getOverviewMetrics(req.user!.tenantId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
