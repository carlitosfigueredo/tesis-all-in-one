/**
 * reportGenerator.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Convierte el dataset del reporte (reportData.service) en archivos descargables:
 *   - PDF  (pdfkit)  → informe ejecutivo con secciones y tablas.
 *   - Excel (exceljs) → libro con varias hojas para análisis.
 *
 * Ambos generadores devuelven un Buffer para que el controlador lo mande como
 * descarga sin escribir a disco.
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const fmtGs = (n) => `Gs. ${Number(n || 0).toLocaleString('es-PY')}`;
const fmtFecha = (d) => new Date(d).toLocaleString('es-PY');

// ─── PDF ───────────────────────────────────────────────────────────────────────

/**
 * Genera el informe en PDF y lo devuelve como Buffer.
 * @param {object} report - salida de buildRetentionReport
 * @returns {Promise<Buffer>}
 */
const generatePdf = (report) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const azul = '#2563eb';
      const gris = '#6b7280';

      // ── Encabezado ──
      doc.fillColor(azul).fontSize(20).text('Reporte de Retención de Talento', { align: 'left' });
      doc.moveDown(0.3);
      doc.fillColor(gris).fontSize(10)
        .text(`Empresa: ${report.empresa}`)
        .text(`Generado por: ${report.generadoPor}`)
        .text(`Fecha: ${fmtFecha(report.generadoEn)}`);
      doc.moveDown(1);

      // ── Resumen ejecutivo ──
      const r = report.resumen;
      doc.fillColor('#111827').fontSize(14).text('Resumen ejecutivo');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#111827');
      const resumenLineas = [
        ['Total de empleados', String(r.total)],
        ['En riesgo (crítico + alto)', `${r.en_riesgo}`],
        ['Riesgo crítico', String(r.criticos)],
        ['Riesgo alto', String(r.altos)],
        ['Riesgo medio', String(r.medios)],
        ['Riesgo bajo', String(r.bajos)],
        ['Riesgo promedio', `${r.riesgo_promedio}%`],
        ['Salario promedio', fmtGs(r.salario_promedio)],
        ['Tasa de deserción real', `${r.tasa_desercion_real}%`],
      ];
      resumenLineas.forEach(([k, v]) => {
        doc.font('Helvetica-Bold').text(`${k}: `, { continued: true })
          .font('Helvetica').text(v);
      });
      doc.moveDown(1);

      // ── Helper de tabla simple ──
      const tabla = (titulo, columnas, filas) => {
        if (doc.y > 680) doc.addPage();
        doc.font('Helvetica-Bold').fillColor('#111827').fontSize(13).text(titulo);
        doc.moveDown(0.4);
        doc.fontSize(9).fillColor('#374151');
        const startX = doc.x;
        const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columnas.length;

        // Encabezado
        doc.font('Helvetica-Bold');
        columnas.forEach((c, i) => {
          doc.text(c, startX + i * colW, doc.y, { width: colW, continued: i < columnas.length - 1 });
        });
        doc.moveDown(0.3);
        doc.font('Helvetica');

        filas.forEach((fila) => {
          if (doc.y > 760) doc.addPage();
          const y = doc.y;
          fila.forEach((cell, i) => {
            doc.text(String(cell), startX + i * colW, y, { width: colW, continued: i < fila.length - 1 });
          });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.8);
      };

      // ── Riesgo por rol / seniority / modalidad ──
      tabla('Riesgo por rol tecnológico', ['Rol', 'Empleados', 'Riesgo prom.'],
        report.por_rol.map((x) => [x.grupo, x.count, `${x.riesgo_promedio}%`]));
      tabla('Riesgo por seniority', ['Seniority', 'Empleados', 'Riesgo prom.'],
        report.por_seniority.map((x) => [x.grupo, x.count, `${x.riesgo_promedio}%`]));
      tabla('Riesgo por modalidad', ['Modalidad', 'Empleados', 'Riesgo prom.'],
        report.por_modalidad.map((x) => [x.grupo, x.count, `${x.riesgo_promedio}%`]));

      // ── Top empleados en riesgo ──
      tabla('Empleados con mayor riesgo', ['Código', 'Nombre', 'Rol', 'Riesgo', 'Nivel'],
        report.top_riesgo.map((e) => [e.codigo, e.nombre, e.rol, `${e.riesgo_pct}%`, e.nivel]));

      // ── Estrategias de retención ──
      const es = report.estrategias;
      tabla('Estrategias de retención', ['Estado', 'Cantidad'], [
        ['Sugeridas', es.SUGERIDA],
        ['En curso', es.EN_CURSO],
        ['Completadas', es.COMPLETADA],
        ['Descartadas', es.DESCARTADA],
      ]);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

// ─── Excel ───────────────────────────────────────────────────────────────────

/**
 * Genera el libro Excel y lo devuelve como Buffer.
 * @param {object} report - salida de buildRetentionReport
 * @returns {Promise<Buffer>}
 */
const generateExcel = async (report) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema BI - Retención de Talento';
  wb.created = new Date();

  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
  };
  const applyHeader = (row) => {
    row.eachCell((cell) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
    });
  };

  // Hoja 1: Resumen
  const s1 = wb.addWorksheet('Resumen');
  s1.columns = [{ header: 'Métrica', key: 'k', width: 32 }, { header: 'Valor', key: 'v', width: 24 }];
  applyHeader(s1.getRow(1));
  const r = report.resumen;
  s1.addRows([
    { k: 'Empresa', v: report.empresa },
    { k: 'Generado por', v: report.generadoPor },
    { k: 'Fecha', v: fmtFecha(report.generadoEn) },
    { k: 'Total de empleados', v: r.total },
    { k: 'En riesgo (crítico + alto)', v: r.en_riesgo },
    { k: 'Riesgo crítico', v: r.criticos },
    { k: 'Riesgo alto', v: r.altos },
    { k: 'Riesgo medio', v: r.medios },
    { k: 'Riesgo bajo', v: r.bajos },
    { k: 'Riesgo promedio (%)', v: r.riesgo_promedio },
    { k: 'Salario promedio (Gs.)', v: r.salario_promedio },
    { k: 'Tasa de deserción real (%)', v: r.tasa_desercion_real },
  ]);

  // Hojas de segmentación
  const hojaGrupo = (nombre, filas) => {
    const s = wb.addWorksheet(nombre);
    s.columns = [
      { header: 'Grupo', key: 'grupo', width: 22 },
      { header: 'Empleados', key: 'count', width: 14 },
      { header: 'Riesgo promedio (%)', key: 'riesgo', width: 20 },
    ];
    applyHeader(s.getRow(1));
    filas.forEach((x) => s.addRow({ grupo: x.grupo, count: x.count, riesgo: x.riesgo_promedio }));
  };
  hojaGrupo('Por rol', report.por_rol);
  hojaGrupo('Por seniority', report.por_seniority);
  hojaGrupo('Por modalidad', report.por_modalidad);

  // Hoja: Top riesgo
  const s5 = wb.addWorksheet('Top riesgo');
  s5.columns = [
    { header: 'Código', key: 'codigo', width: 16 },
    { header: 'Nombre', key: 'nombre', width: 28 },
    { header: 'Rol', key: 'rol', width: 16 },
    { header: 'Seniority', key: 'seniority', width: 16 },
    { header: 'Riesgo (%)', key: 'riesgo', width: 12 },
    { header: 'Nivel', key: 'nivel', width: 12 },
  ];
  applyHeader(s5.getRow(1));
  report.top_riesgo.forEach((e) =>
    s5.addRow({ codigo: e.codigo, nombre: e.nombre, rol: e.rol, seniority: e.seniority, riesgo: e.riesgo_pct, nivel: e.nivel })
  );

  // Hoja: Estrategias
  const s6 = wb.addWorksheet('Estrategias');
  s6.columns = [{ header: 'Estado', key: 'estado', width: 22 }, { header: 'Cantidad', key: 'cant', width: 14 }];
  applyHeader(s6.getRow(1));
  const es = report.estrategias;
  s6.addRows([
    { estado: 'Sugeridas', cant: es.SUGERIDA },
    { estado: 'En curso', cant: es.EN_CURSO },
    { estado: 'Completadas', cant: es.COMPLETADA },
    { estado: 'Descartadas', cant: es.DESCARTADA },
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

module.exports = { generatePdf, generateExcel };
