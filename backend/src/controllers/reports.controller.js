// ─────────────────────────────────────────
// Reports Controller — datos y exportación (PDF / Excel)
// ─────────────────────────────────────────

const { buildRetentionReport } = require('../services/reportData.service');
const { generatePdf, generateExcel } = require('../services/reportGenerator.service');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

// Nombre de archivo seguro con fecha (YYYY-MM-DD).
const fileName = (ext) => `reporte-retencion-${new Date().toISOString().slice(0, 10)}.${ext}`;

// ─── GET /api/reports/retention ─────────────────────────────────────────────────
// Devuelve el dataset del reporte en JSON (para previsualizar en pantalla).

const getRetentionReport = async (req, res, next) => {
  try {
    const report = await buildRetentionReport(req.user);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/reports/retention/pdf ──────────────────────────────────────────────

const exportRetentionPdf = async (req, res, next) => {
  try {
    const report = await buildRetentionReport(req.user);
    const buffer = await generatePdf(report);

    await logAction({
      tenantId: req.user.companyId ?? null,
      userId: req.user.id,
      action: 'REPORT_EXPORTED',
      resource: 'reports',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
      newValue: { formato: 'pdf' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName('pdf')}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/reports/retention/excel ────────────────────────────────────────────

const exportRetentionExcel = async (req, res, next) => {
  try {
    const report = await buildRetentionReport(req.user);
    const buffer = await generateExcel(report);

    await logAction({
      tenantId: req.user.companyId ?? null,
      userId: req.user.id,
      action: 'REPORT_EXPORTED',
      resource: 'reports',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
      newValue: { formato: 'excel' },
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName('xlsx')}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { getRetentionReport, exportRetentionPdf, exportRetentionExcel };
