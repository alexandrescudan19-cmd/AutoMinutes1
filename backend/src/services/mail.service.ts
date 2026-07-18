import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 2525),
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${token}`;

    await this.transporter.sendMail({
      from: '"AutoMinutes" <no-reply@autominutes.local>',
      to,
      subject: 'Verify your AutoMinutes account',
      html: `
            <h2>Welcome to AutoMinutes!</h2>
            <p>Click the link below to verify your account:</p>
            <p><a href="${verifyUrl}">Verify my account</a></p>
            <p>If you did not create an account, you can ignore this email.</>
        `,
    });
  }
}
