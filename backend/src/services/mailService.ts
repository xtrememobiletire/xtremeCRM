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

    // Polite, clean, professional HTML body
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { background-color: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background-color: #0b1120; padding: 24px 32px; border-bottom: 3px solid #dc2626; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .message { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
    .summary-box { background-color: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; border-left: 4px solid #dc2626; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .summary-row:last-child { margin-bottom: 0; padding-top: 8px; border-top: 1px solid #cbd5e1; font-weight: bold; font-size: 14px; color: #0f172a; }
    .summary-label { color: #64748b; }
    .summary-value { font-weight: 600; color: #0f172a; }
    .footer { padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; }
    .footer a { color: #dc2626; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>XTREME MOBILE TIRE</h1>
      <p>24/7 Mobile Tire Service & Roadside Commercial Dispatch</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${clientName},</div>
      <div class="message">
        Please find attached your official invoice <strong>#${invoiceNumber}</strong> for recent commercial mobile tire and roadside services.
      </div>

      <div class="summary-box">
        <div class="summary-row">
          <span class="summary-label">Invoice Number:</span>
          <span class="summary-value">#${invoiceNumber}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Issue Date:</span>
          <span class="summary-value">${issueDate}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Due Date:</span>
          <span class="summary-value">${dueDate}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Balance Due:</span>
          <span class="summary-value" style="color: #dc2626;">${balanceDue}</span>
        </div>
      </div>

      <div class="message">
        A full, itemized copy of this invoice has been generated and attached to this email as a PDF document for your records and accounts payable department.
      </div>
      <div class="message" style="margin-bottom: 0;">
        Thank you for choosing Xtreme Mobile Tire. If you have any questions regarding this invoice or require roadside assistance, please contact our dispatch desk at any time.
      </div>
    </div>
    <div class="footer">
      <strong>Xtreme Mobile Tire Inc.</strong><br>
      Toll-Free Dispatch: +1 (804) 326-5442 (US) | +1 (437) 375-5674 (CA) | +44 1630 234331 (UK)<br>
      Email: <a href="mailto:info@xtrememobiletire.com">info@xtrememobiletire.com</a>
    </div>
  </div>
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
