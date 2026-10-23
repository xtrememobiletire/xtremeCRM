import nodemailer, { type Transporter } from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

function getDirname(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

class MailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP.HOST,
        port: config.SMTP.PORT,
        secure: config.SMTP.SECURE,
        auth: {
          user: config.SMTP.USER,
          pass: config.SMTP.PASS,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Verify SMTP connection status.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log(`[SMTP] Successfully connected to ${config.SMTP.HOST} as ${config.SMTP.USER}`);
      return true;
    } catch (err: any) {
      console.error(`[SMTP] Connection verification failed:`, err.message);
      return false;
    }
  }

  /**
   * Send an invoice email to a client with an attached PDF and polite professional greeting.
   */
  async sendInvoiceEmail(params: {
    to: string;
    clientName?: string;
    invoiceNumber: string;
    issueDate?: string;
    dueDate?: string;
    currency?: string;
    balanceDue?: string;
    pdfBuffer: Buffer;
  }): Promise<{ messageId: string }> {
    const {
      to,
      clientName = 'Valued Client',
      invoiceNumber,
      issueDate = new Date().toISOString().split('T')[0],
      dueDate = 'Upon receipt',
      balanceDue = '$0.00',
      pdfBuffer,
    } = params;

    const transporter = this.getTransporter();

    const subject = `Your Invoice #${invoiceNumber} - Xtreme Mobile Tire`;

    // Only attach the official itemized invoice PDF
    const attachments: any[] = [
      {
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ];

    // Plain text alternative (prevents spam filters from penalizing HTML-only emails)
    const text = [
      `Dear ${clientName},`,
      '',
      `Thank you for choosing Xtreme Mobile Tire. Please find attached your invoice #${invoiceNumber}.`,
      '',
      `Invoice: #${invoiceNumber}`,
      `Issue Date: ${issueDate}`,
      `Payment Due: ${dueDate}`,
      `Balance Due: ${balanceDue}`,
      '',
      `Xtreme Mobile Tire Inc.`,
      `Toll-Free Dispatch: +1 (804) 326-5442 (US) | +1 (437) 375-5674 (CA) | +44 1630 234331 (UK)`,
      `Email: info@xtrememobiletire.com`,
      `Web: https://xtrememobiletire.com`,
    ].join('\n');

    // Clean, elegant, minimalist HTML body with user's Cloudinary logo
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoiceNumber} - Xtreme Mobile Tire</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05); }
    .content { padding: 32px 32px 28px 32px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .intro-p { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0; }
    .summary-card { width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #dc2626; border-radius: 8px; margin: 20px 0 10px 0; }
    .summary-cell { padding: 10px 16px; font-size: 13px; color: #64748b; }
    .summary-val { padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right; }
    .summary-total { border-top: 1px solid #cbd5e1; background-color: #f1f5f9; }
    .summary-total-label { padding: 12px 16px; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .summary-total-val { padding: 12px 16px; font-size: 16px; font-weight: 900; color: #dc2626; text-align: right; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer strong { color: #334155; }
    .footer a { color: #dc2626; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <div class="email-container">
          <!-- Minimalist Header with Official Cloudinary Logo -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1120; border-bottom: 3px solid #dc2626; padding: 22px 0;">
            <tr>
              <td align="center" valign="middle">
                <img src="https://res.cloudinary.com/ebjikx52/image/upload/f_png,w_280/v1792426904/xtreme/frontend/logo_webp.webp" alt="Xtreme Mobile Tire" width="135" style="display: block; width: 135px; max-width: 135px; height: auto; margin: 0 auto; border: 0;" />
              </td>
            </tr>
          </table>

          <!-- Main Content -->
          <div class="content">
            <div class="greeting">Dear ${clientName},</div>
            <p class="intro-p">
              Thank you for trusting Xtreme Mobile Tire with your vehicle and fleet service. Please find attached your invoice <strong>#${invoiceNumber}</strong>.
            </p>

            <!-- Invoice Summary Box -->
            <table role="presentation" class="summary-card" cellpadding="0" cellspacing="0">
              <tr>
                <td class="summary-cell">Invoice Number:</td>
                <td class="summary-val">#${invoiceNumber}</td>
              </tr>
              <tr>
                <td class="summary-cell">Issue Date:</td>
                <td class="summary-val">${issueDate}</td>
              </tr>
              <tr>
                <td class="summary-cell">Payment Due:</td>
                <td class="summary-val">${dueDate}</td>
              </tr>
              <tr class="summary-total">
                <td class="summary-total-label">BALANCE DUE:</td>
                <td class="summary-total-val">${balanceDue}</td>
              </tr>
            </table>
          </div>

          <!-- Clean Footer -->
          <div class="footer">
            <strong>Xtreme Mobile Tire Inc.</strong><br>
            Toll-Free Dispatch: +1 (804) 326-5442 (US) | +1 (437) 375-5674 (CA) | +44 1630 234331 (UK)<br>
            Direct Support: <a href="mailto:info@xtrememobiletire.com">info@xtrememobiletire.com</a> | <a href="https://xtrememobiletire.com">xtrememobiletire.com</a>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const senderEmail = config.SMTP.FROM_EMAIL || config.SMTP.USER;
    const isGmailSender = senderEmail.toLowerCase().endsWith('@gmail.com');
    // Align reply-to with sender for Gmail accounts to prevent anti-spoofing flags
    const replyTo = isGmailSender ? senderEmail : ((config.SMTP as any).REPLY_TO || senderEmail);

    const info = await transporter.sendMail({
      from: `"${config.SMTP.FROM_NAME}" <${senderEmail}>`,
      replyTo,
      to,
      subject,
      text,
      html,
      attachments,
      headers: {
        'X-Entity-Ref-ID': `invoice-${invoiceNumber}`,
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });

    console.log(`[SMTP] Invoice email #${invoiceNumber} successfully sent to ${to}. MessageId: ${info.messageId}`);
    return { messageId: info.messageId };
  }
}

export const mailService = new MailService();
export default mailService;
