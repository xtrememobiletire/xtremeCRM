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
    subject?: string;
    senderName?: string;
    pdfBuffer: Buffer;
  }): Promise<{ messageId: string }> {
    const {
      to,
      clientName = 'Valued Client',
      invoiceNumber,
      issueDate = new Date().toISOString().split('T')[0],
      dueDate = 'Upon receipt',
      balanceDue = '$0.00',
      subject: customSubject,
      pdfBuffer,
    } = params;

    const transporter = this.getTransporter();

    const subject = customSubject || `Xtreme Mobile Tire - Invoice #${invoiceNumber}`;

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
      `Thank you for trusting Xtreme Mobile Tire with your vehicle and fleet service. Please find attached your invoice #${invoiceNumber}.`,
      '',
      `Best regards,`,
      `Xtreme Mobile Tire Team`,
    ].join('\n');

    // Clean, elegant, minimalist professional HTML body
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05); }
    .content { padding: 36px 32px 36px 32px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
    .intro-p { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px 0; }
    .signoff { font-size: 14px; line-height: 1.6; color: #334155; margin: 0; }
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
                <img src="https://res.cloudinary.com/ebjikx52/image/upload/f_png,q_auto/v1792426904/xtreme/frontend/logo_webp.png" alt="Xtreme Mobile Tire" width="160" style="display: block; width: 160px; max-width: 160px; height: auto; margin: 0 auto; border: 0;" />
              </td>
            </tr>
          </table>

          <!-- Main Content: Clean Professional Text -->
          <div class="content">
            <div class="greeting">Dear ${clientName},</div>
            <p class="intro-p">
              Thank you for trusting Xtreme Mobile Tire with your vehicle and fleet service. Please find attached your invoice <strong>#${invoiceNumber}</strong>.
            </p>
            <p class="signoff">
              Best regards,<br>
              <strong>Xtreme Mobile Tire Team</strong>
            </p>
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

    const rawFromName = (params.senderName || config.SMTP.FROM_NAME || '').trim();
    const isGenericSystemName =
      !rawFromName ||
      /mail\s*delivery|subsystem|daemon|dokploy|mailer/i.test(rawFromName);

    const senderDisplayName = isGenericSystemName
      ? 'Xtreme Mobile Tire - Billing & Invoices'
      : rawFromName;

    const info = await transporter.sendMail({
      from: {
        name: senderDisplayName,
        address: senderEmail,
      },
      sender: senderEmail,
      replyTo: {
        name: 'Xtreme Mobile Tire Billing Support',
        address: replyTo,
      },
      to,
      subject,
      text,
      html,
      attachments,
      headers: {
        'X-Entity-Ref-ID': `invoice-${invoiceNumber}`,
      },
    });

    console.log(`[SMTP] Invoice email #${invoiceNumber} successfully sent to ${to}. MessageId: ${info.messageId}`);
    return { messageId: info.messageId };
  }
}

export const mailService = new MailService();
export default mailService;
