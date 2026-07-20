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

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: `"AutoMinutes" <no-reply@autominutes.local>`,
      to,
      subject: 'Reset your AutoMinutes password',
      html: `
        <h2>Password reset request</h2>
        <p>We received a request to reset the password for your account. Click the link below to choose a new one:</p>
        <p><a href="${resetUrl}">Reset my password</a></p>
        <p>This link will expire in 1 hour. If you did not request this, you can ignore this email.</p>
      `,
    });
  }
}
