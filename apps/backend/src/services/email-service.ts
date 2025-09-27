import nodemailer from "nodemailer";

export class EmailService {
  /**
   * Send bulk email to multiple recipients
   */
  static async sendBulkEmail(
    emails: string[],
    subject: string,
    htmlContent: string
  ): Promise<void> {
    if (emails.length === 0) {
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: emails.join(', '),
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
  }
}