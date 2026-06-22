import { AuditLog } from '../models/index.js';

export const auditLog = (action, entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode < 400 && req.user) {
      AuditLog.create({
        organizationId: req.user.organizationId,
        userId: req.user._id,
        action,
        entityType,
        entityId: body?.data?._id || req.params.id,
        changes: req.body,
        metadata: { method: req.method, path: req.originalUrl },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).catch(console.error);
    }
    return originalJson(body);
  };

  next();
};
