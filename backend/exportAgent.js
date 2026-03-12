// ============================================================
// agents/exportAgent.js — CSV + Excel spreadsheet export
// ============================================================
const XLSX   = require('xlsx');
const path   = require('path');
const fs     = require('fs');
const { logger } = require('../utils/logger');

const EXPORT_DIR = process.env.EXPORT_DIR || path.join(__dirname, '../exports');

const COLUMNS = [
  { key: 'full_name',           header: 'Full Name'             },
  { key: 'title',               header: 'Title'                 },
  { key: 'company',             header: 'Company'               },
  { key: 'linkedin_url',        header: 'LinkedIn URL'          },
  { key: 'email_professional',  header: 'Professional Email'    },
  { key: 'email_generic',       header: 'Generic Email'         },
  { key: 'phone',               header: 'Phone'                 },
  { key: 'company_website',     header: 'Website'               },
  { key: 'industry',            header: 'Industry'              },
  { key: 'company_size',        header: 'Company Size'          },
  { key: 'location',            header: 'Location'              },
  { key: 'google_rating',       header: 'Google Rating'         },
  { key: 'review_count',        header: 'Review Count'          },
  { key: 'google_address',      header: 'Google Address'        },
  { key: 'google_phone',        header: 'Google Phone'          },
  { key: 'industry_avg_rating', header: 'Industry Avg Rating'   },
  { key: 'revenue_loss_pct',    header: 'Est. Revenue Loss %'   },
  { key: 'revenue_loss_est',    header: 'Est. Revenue Loss $'   },
  { key: 'lead_score',          header: 'Lead Score'            },
  { key: 'score_value',         header: 'Score Value'           },
];

function buildRows(leads) {
  return leads.map(lead =>
    COLUMNS.reduce((row, col) => {
      row[col.header] = lead[col.key] ?? '';
      return row;
    }, {})
  );
}

function exportCsv(leads, searchId) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const rows = buildRows(leads);
  const wb   = XLSX.utils.book_new();
  const ws   = XLSX.utils.json_to_sheet(rows, { header: COLUMNS.map(c => c.header) });

  // Column widths
  ws['!cols'] = COLUMNS.map(c => ({ wch: Math.max(c.header.length + 4, 18) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const filename = `leads_${searchId}_${Date.now()}.csv`;
  const filepath  = path.join(EXPORT_DIR, filename);
  XLSX.writeFile(wb, filepath, { bookType: 'csv' });
  logger.info(`CSV exported: ${filename}`);
  return filepath;
}

function exportExcel(leads, searchId) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const rows = buildRows(leads);
  const wb   = XLSX.utils.book_new();
  const ws   = XLSX.utils.json_to_sheet(rows, { header: COLUMNS.map(c => c.header) });

  // Styling helpers
  ws['!cols']  = COLUMNS.map(c => ({ wch: Math.max(c.header.length + 4, 18) }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }; // freeze header row

  // Conditional color: mark hot leads red (manual post-process)
  leads.forEach((lead, i) => {
    if (lead.lead_score === 'hot') {
      const cell = XLSX.utils.encode_cell({ r: i + 1, c: COLUMNS.findIndex(c => c.key === 'lead_score') });
      if (ws[cell]) {
        ws[cell].s = { font: { bold: true, color: { rgb: 'CC0000' } } };
      }
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Summary sheet
  const hot   = leads.filter(l => l.lead_score === 'hot').length;
  const warm  = leads.filter(l => l.lead_score === 'warm').length;
  const cold  = leads.filter(l => l.lead_score === 'cold').length;
  const withEmail = leads.filter(l => l.email_professional).length;
  const avgRating = leads.filter(l => l.google_rating).reduce((s, l) => s + l.google_rating, 0) /
                    (leads.filter(l => l.google_rating).length || 1);

  const summary = [
    { Metric: 'Total Leads',        Value: leads.length },
    { Metric: 'Hot Leads',          Value: hot },
    { Metric: 'Warm Leads',         Value: warm },
    { Metric: 'Cold Leads',         Value: cold },
    { Metric: 'Leads with Email',   Value: withEmail },
    { Metric: 'Email Rate %',       Value: `${Math.round(withEmail / leads.length * 100)}%` },
    { Metric: 'Avg Google Rating',  Value: Math.round(avgRating * 10) / 10 },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summary);
  ws2['!cols'] = [{ wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const filename = `leads_${searchId}_${Date.now()}.xlsx`;
  const filepath  = path.join(EXPORT_DIR, filename);
  XLSX.writeFile(wb, filepath, { bookType: 'xlsx' });
  logger.info(`Excel exported: ${filename}`);
  return filepath;
}

module.exports = { exportCsv, exportExcel };
