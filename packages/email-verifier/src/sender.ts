import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface OutreachEmail {
  to: string;
  subject: string;
  bodyText: string;
}

export class LocalOutreachSender {
  private transporter: nodemailer.Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport(config);
  }

  /**
   * Sends emails with humanized drip delays (45-120 seconds between sends) to prevent spam flagging
   */
  public async sendWithDripDelay(emails: OutreachEmail[], minDelaySec: number = 45, maxDelaySec: number = 120) {
    console.log(`[Cold Outreach Engine] Starting drip campaign for ${emails.length} contacts...`);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      try {
        await this.transporter.sendMail({
          from: this.transporter.options.from || (this.transporter as any).options?.auth?.user,
          to: email.to,
          subject: email.subject,
          text: email.bodyText
        });
        console.log(`[Outreach] Sent email ${i + 1}/${emails.length} to ${email.to}`);
      } catch (err: any) {
        console.error(`[Outreach Error] Failed sending to ${email.to}:`, err.message);
      }

      if (i < emails.length - 1) {
        const delayMs = Math.floor(Math.random() * (maxDelaySec - minDelaySec + 1) + minDelaySec) * 1000;
        console.log(`[Outreach Drip Delay] Pausing ${Math.round(delayMs / 1000)}s before next send...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
}
