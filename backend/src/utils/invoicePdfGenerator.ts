import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

function getDirname(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

/**
 * Generate a professional, clean A4 invoice PDF buffer using PDFKit.
 * Matches Xtreme Mobile Tire branding and the KT Group format.
 */
export async function generateInvoicePdf(pdfData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    const brandRed = '#DC2626';
    const darkSlate = '#0F172A';
    const grayText = '#64748B';
    const borderGray = '#E2E8F0';

    // 1. Top Header Banner
    doc.rect(40, 36, 515, 68).fill('#0B1120');

    // Logo / Brand Icon
    let logoDrawn = false;
    try {
      const currentDir = getDirname();
      const logoCandidates = [
        path.resolve(currentDir, '../assets/logo.png'),
        path.resolve(process.cwd(), 'src/assets/logo.png'),
        path.resolve(process.cwd(), 'dist/assets/logo.png'),
        path.resolve(process.cwd(), '../frontend/public/favicon.png'),
        path.resolve(process.cwd(), 'frontend/public/favicon.png'),
      ];
      const resolvedLogoPath = logoCandidates.find((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      });

      if (resolvedLogoPath) {
        // Enlarge logo to fit 72x54 prominently within the top banner
        doc.image(resolvedLogoPath, 50, 43, { fit: [72, 54], align: 'center', valign: 'center' });
        logoDrawn = true;
      }
    } catch {
      logoDrawn = false;
    }

    if (!logoDrawn) {
      // Fallback XT Badge
      doc.rect(50, 43, 54, 54).fill(brandRed);
      doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('XT', 64, 58);
    }

    // Tagline & Regional Hub Info (Cleaned: removed redundant "XTREME MOBILE TIRE" text header)
    doc.fillColor(brandRed).fontSize(8.5).font('Helvetica-Bold').text('24/7 MOBILE TIRE SERVICE & ROADSIDE DISPATCH', 135, 59);
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(
      `${pdfData.company?.hub?.address || 'Mississauga, ON Canada'} • Phone: ${pdfData.company?.hub?.phone || '+1 (416) 555-0192'}`,
      135,
      74
    );

    // 2. Invoice Meta & Status Block
    let y = 120;
    doc.fillColor(darkSlate).fontSize(20).font('Helvetica-Bold').text('INVOICE', 40, y);
    doc.fillColor(brandRed).fontSize(12).font('Helvetica-Bold').text(`#${pdfData.invoiceNumber}`, 40, y + 24);

    // Right-aligned Dates & Status
    const rightX = 360;
    doc.fillColor(grayText).fontSize(8.5).font('Helvetica').text('Issue Date:', rightX, y);
    doc.fillColor(darkSlate).font('Helvetica-Bold').text(pdfData.issueDate || 'N/A', rightX + 65, y);

    doc.fillColor(grayText).font('Helvetica').text('Due Date:', rightX, y + 14);
    doc.fillColor(darkSlate).font('Helvetica-Bold').text(pdfData.dueDate || 'N/A', rightX + 65, y + 14);

    doc.fillColor(grayText).font('Helvetica').text('Currency:', rightX, y + 28);
    doc.fillColor(darkSlate).font('Helvetica-Bold').text(pdfData.currency || 'USD', rightX + 65, y + 28);

    doc.fillColor(grayText).font('Helvetica').text('Status:', rightX, y + 42);
    const statusColor = pdfData.status === 'PAID' ? '#16A34A' : pdfData.status === 'PARTIAL' ? '#9333EA' : '#DC2626';
    doc.fillColor(statusColor).font('Helvetica-Bold').text(pdfData.status || 'UNPAID', rightX + 65, y + 42);

    // Horizontal separator
    y = 190;
    doc.rect(40, y, 515, 1).fill(borderGray);

    // 3. Billing Addresses Box
    y += 15;
    // Box for "Invoice To"
    doc.rect(40, y, 515, 80).fill('#F8FAFC');
    doc.rect(40, y, 515, 80).stroke(borderGray);

    doc.fillColor(brandRed).fontSize(8.5).font('Helvetica-Bold').text('INVOICE TO:', 55, y + 12);
    doc.fillColor(darkSlate).fontSize(11).font('Helvetica-Bold').text(pdfData.billTo?.name || 'Valued Client', 55, y + 26);
    
    doc.fillColor(grayText).fontSize(8.5).font('Helvetica');
    if (pdfData.billTo?.address) {
      doc.text(pdfData.billTo.address, 55, y + 42, { width: 280 });
    }
    const contactInfo = [pdfData.billTo?.phone, pdfData.billTo?.email].filter(Boolean).join(' | ');
    if (contactInfo) {
      doc.text(contactInfo, 55, y + 56, { width: 350 });
    }

    if (pdfData.billTo?.fleetCode) {
      doc.fillColor(grayText).fontSize(8).font('Helvetica').text('Account ID:', 400, y + 12);
      doc.fillColor(darkSlate).font('Helvetica-Bold').text(pdfData.billTo.fleetCode, 455, y + 12);
    }

    // 4. Line Items Table
    y += 105;
    // Table Header
    doc.rect(40, y, 515, 22).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
    doc.text('DESCRIPTION / SERVICE', 50, y + 6);
    doc.text('QTY', 330, y + 6, { width: 35, align: 'center' });
    doc.text('UNIT PRICE', 380, y + 6, { width: 80, align: 'right' });
    doc.text('TOTAL', 475, y + 6, { width: 70, align: 'right' });

    y += 22;

    const items = pdfData.items || [];
    items.forEach((item: any, index: number) => {
      const isAlt = index % 2 === 1;
      const rowHeight = 24;

      if (isAlt) {
        doc.rect(40, y, 515, rowHeight).fill('#F8FAFC');
      }

      doc.fillColor(darkSlate).fontSize(8.5).font('Helvetica');
      doc.text(item.details || 'Standard Mobile Tire Service', 50, y + 7, { width: 260, height: rowHeight - 6 });
      doc.text(String(item.quantity || 1), 330, y + 7, { width: 35, align: 'center' });
      doc.text(item.unitPriceFormatted || '$0.00', 380, y + 7, { width: 80, align: 'right' });
      doc.font('Helvetica-Bold').text(item.totalFormatted || '$0.00', 475, y + 7, { width: 70, align: 'right' });

      // Bottom row divider
      doc.rect(40, y + rowHeight - 1, 515, 1).fill(borderGray);
      y += rowHeight;
    });

    // 5. Summary & Remittance Section
    y += 15;
    const summaryX = 350;
    const summaryValX = 460;
    const summaryWidth = 85;

    // Subtotal
    doc.fillColor(grayText).fontSize(8.5).font('Helvetica').text('Subtotal:', summaryX, y);
    doc.fillColor(darkSlate).font('Helvetica-Bold').text(pdfData.summary?.subtotal || '$0.00', summaryValX, y, { width: summaryWidth, align: 'right' });
    y += 16;

    // Tax
    if (pdfData.summary?.tax) {
      doc.fillColor(grayText).font('Helvetica').text(`Tax (${pdfData.summary?.taxRateFormatted || ''}):`, summaryX, y);
      doc.fillColor(darkSlate).font('Helvetica-Bold').text(pdfData.summary.tax, summaryValX, y, { width: summaryWidth, align: 'right' });
      y += 16;
    }

    // Grand Total
    doc.rect(summaryX - 10, y - 2, 215, 24).fill('#F1F5F9');
    doc.fillColor(darkSlate).fontSize(9.5).font('Helvetica-Bold').text('Total Amount:', summaryX, y + 4);
    doc.fillColor(brandRed).fontSize(10).font('Helvetica-Bold').text(pdfData.summary?.grandTotal || '$0.00', summaryValX, y + 4, { width: summaryWidth, align: 'right' });
    y += 30;

    // Balance Due
    doc.rect(summaryX - 10, y - 2, 215, 24).fill(brandRed);
    doc.fillColor('#FFFFFF').fontSize(9.5).font('Helvetica-Bold').text('Balance Due:', summaryX, y + 4);
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(pdfData.summary?.balanceDue || '$0.00', summaryValX, y + 4, { width: summaryWidth, align: 'right' });

    // Payment instructions on the left
    const notesY = y - 60;
    doc.fillColor(darkSlate).fontSize(8.5).font('Helvetica-Bold').text('Remittance & Payment Details:', 40, notesY);
    doc.fillColor(grayText).fontSize(8).font('Helvetica').text(
      `Electronic Transfer / Direct Deposit:\n${pdfData.company?.paymentEmail || 'payments@xtrememobiletire.com'}\nAll invoices subject to standard Net terms.`,
      40,
      notesY + 14,
      { width: 270 }
    );

    // 6. Footer
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(
      'Xtreme Mobile Tire Inc. • Emergency Roadside & Commercial Fleet Services • 24/7 Dispatch Bay',
      40,
      780,
      { width: 515, align: 'center' }
    );

    doc.end();
  });
}
