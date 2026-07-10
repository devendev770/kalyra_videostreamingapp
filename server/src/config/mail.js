import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Kalyra <noreply@kalyra.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email failed to ${to}:`, error);
    throw error;
  }
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  return sendEmail({
    to: email,
    subject: 'Verify your Kalyra account',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to Kalyra 🎬</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; line-height: 1.6;">Thanks for signing up! Please verify your email address to get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Verify Email</a>
          <p style="font-size: 13px; color: #888; margin-top: 20px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        </div>
      </div>
    `,
  });
};

/**
 * Send password reset OTP
 */
export const sendPasswordResetOTP = async (email, otp) => {
  return sendEmail({
    to: email,
    subject: 'Kalyra Password Reset OTP',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ef4444, #f97316); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Password Reset 🔐</h1>
        </div>
        <div style="padding: 30px; text-align: center;">
          <p style="font-size: 16px;">Use this OTP to reset your password:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">${otp}</div>
          <p style="font-size: 13px; color: #888;">This OTP expires in 10 minutes.</p>
        </div>
      </div>
    `,
  });
};

/**
 * Send notification email
 */
export const sendNotificationEmail = async (email, title, message) => {
  return sendEmail({
    to: email,
    subject: `Kalyra: ${title}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; border-radius: 12px; padding: 30px;">
        <h2 style="color: #8b5cf6;">${title}</h2>
        <p style="font-size: 16px; line-height: 1.6;">${message}</p>
        <a href="${process.env.CLIENT_URL}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Open Kalyra</a>
      </div>
    `,
  });
};

export default transporter;
