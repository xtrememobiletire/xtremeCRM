import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env.js';

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

    const subject = `Invoice #${invoiceNumber} from Xtreme Mobile Tire`;

    // Polite, clean, professional HTML body with official Xtreme branding
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoiceNumber} from Xtreme Mobile Tire</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .email-container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); }
    .header-table { width: 100%; background-color: #0b1120; border-bottom: 4px solid #dc2626; padding: 24px 32px; }
    .logo-img { width: 44px; height: 44px; border-radius: 10px; display: block; border: 1px solid rgba(255, 255, 255, 0.15); background-color: rgba(255, 255, 255, 0.05); }
    .brand-title { color: #ffffff; font-size: 19px; font-weight: 800; letter-spacing: 0.5px; margin: 0; line-height: 1.2; }
    .brand-title span { color: #ef4444; }
    .brand-subtitle { color: #94a3b8; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.75px; font-weight: 600; }
    .content { padding: 32px 32px 24px 32px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .intro-p { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0; }
    .summary-card { width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #dc2626; border-radius: 8px; margin: 20px 0 24px 0; }
    .summary-cell { padding: 10px 16px; font-size: 13px; color: #64748b; }
    .summary-val { padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right; }
    .summary-total { border-top: 1px solid #cbd5e1; background-color: #f1f5f9; }
    .summary-total-label { padding: 12px 16px; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .summary-total-val { padding: 12px 16px; font-size: 16px; font-weight: 900; color: #dc2626; text-align: right; }
    .attachment-badge { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .attachment-text { font-size: 13px; color: #1e40af; line-height: 1.5; margin: 0; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer strong { color: #334155; }
    .footer a { color: #dc2626; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <div class="email-container">
          <!-- Header with Xtreme Logo -->
          <table role="presentation" class="header-table" cellpadding="0" cellspacing="0">
            <tr>
              <td width="54" valign="middle">
                <img src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426897/xtreme/frontend/favicon_png.png" alt="Xtreme Logo" class="logo-img" width="44" height="44" />
              </td>
              <td valign="middle" style="padding-left: 12px;">
                <h1 class="brand-title">XTREME <span>MOBILE TIRE</span></h1>
                <p class="brand-subtitle">24/7 Mobile Tire Service & Roadside Dispatch</p>
              </td>
            </tr>
          </table>

          <!-- Main Content -->
          <div class="content">
            <div class="greeting">Dear ${clientName},</div>
            <p class="intro-p">
              Thank you for trusting Xtreme Mobile Tire with your vehicle and fleet service. Please find attached your itemized commercial invoice statement <strong>#${invoiceNumber}</strong>.
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
                <td class="summary-total-label">Balance Due:</td>
                <td class="summary-total-val">${balanceDue}</td>
              </tr>
            </table>

            <!-- Attachment Note -->
            <div class="attachment-badge">
              <p class="attachment-text">
                📎 <strong>PDF Invoice Attached:</strong> A printable, fully itemized PDF copy (<strong>Invoice-${invoiceNumber}.pdf</strong>) is attached to this email for your accounting and fleet records.
              </p>
            </div>

            <p class="intro-p" style="margin-bottom: 0;">
              If you have any questions regarding this invoice, need remittance details, or require immediate roadside assistance, our dispatch operations desk is available 24 hours a day, 7 days a week.
            </p>
          </div>

          <!-- Professional Footer -->
          <div class="footer">
            <strong>Xtreme Mobile Tire Inc.</strong><br>
            Toll-Free Dispatch: +1 (804) 326-5442 (US) | +1 (437) 375-5674 (CA) | +44 1630 234331 (UK)<br>
            Direct Support: <a href="mailto:info@xtrememobiletire.com">info@xtrememobiletire.com</a> | <a href="https://xtrememobiletire.com">xtrememobiletire.com</a><br>
            <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 8px;">
              This transmission may contain confidential commercial invoice records. If you received this in error, please notify the sender.
            </span>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"${config.SMTP.FROM_NAME}" <${config.SMTP.FROM_EMAIL}>`,
      replyTo: (config.SMTP as any).REPLY_TO || 'info@xtrememobiletire.com',
      to,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log(`[SMTP] Invoice email #${invoiceNumber} successfully sent to ${to}. MessageId: ${info.messageId}`);
    return { messageId: info.messageId };
  }
}

export const mailService = new MailService();
export default mailService;
