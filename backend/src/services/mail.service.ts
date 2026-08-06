import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly isConfigured = Boolean(process.env.MAIL_HOST);
  private readonly transporter = this.isConfigured
    ? nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT ?? 2525),
        secure: process.env.MAIL_SECURE === 'true',
        auth:
          process.env.MAIL_USER && process.env.MAIL_PASS
            ? {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
              }
            : undefined,
      })
    : null;

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${this.getFrontendUrl()}/verify?token=${token}`;

    if (!this.transporter) {
      console.warn(`MAIL_HOST is not configured. Verification email for ${to}: ${verifyUrl}`);
      return;
    }

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? '"AutoMinutes" <no-reply@autominutes.local>',
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
    const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${token}`;

    if (!this.transporter) {
      console.warn(`MAIL_HOST is not configured. Password reset email for ${to}: ${resetUrl}`);
      return;
    }

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? '"AutoMinutes" <no-reply@autominutes.local>',
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

  private getFrontendUrl(): string {
    return (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
  }
}
