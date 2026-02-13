// Faz 2 — Email Service (Mailcow SMTP)
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: false }
    });
  }
  return transporter;
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#1a1a2e;">Typesettr'a Hoş Geldiniz!</h2>
      <p>Merhaba ${name},</p>
      <p>Email adresinizi doğrulamak için aşağıdaki butona tıklayın:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${verifyUrl}" style="background:#4f46e5;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Email Adresimi Doğrula
        </a>
      </div>
      <p style="color:#666;font-size:14px;">Bu link 24 saat geçerlidir.</p>
      <p style="color:#666;font-size:14px;">Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelin.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="color:#999;font-size:12px;">Typesettr — Profesyonel Kitap Dizgi Platformu</p>
    </div>
  `;

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Typesettr — Email Adresinizi Doğrulayın',
      html
    });
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}: ${error.message}`);
    throw error;
  }
}

async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#1a1a2e;">Şifre Sıfırlama</h2>
      <p>Merhaba ${name},</p>
      <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Şifremi Sıfırla
        </a>
      </div>
      <p style="color:#666;font-size:14px;">Bu link 1 saat geçerlidir.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="color:#999;font-size:12px;">Typesettr — Profesyonel Kitap Dizgi Platformu</p>
    </div>
  `;

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Typesettr — Şifre Sıfırlama',
      html
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
    throw error;
  }
}

async function sendProjectCompletedEmail(email, name, projectName, downloadUrl) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#1a1a2e;">Dizgi Tamamlandı! ✅</h2>
      <p>Merhaba ${name},</p>
      <p><strong>"${projectName}"</strong> kitabınızın dizgisi başarıyla tamamlandı.</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${downloadUrl}" style="background:#059669;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;">
          PDF'i İndir
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="color:#999;font-size:12px;">Typesettr — Profesyonel Kitap Dizgi Platformu</p>
    </div>
  `;

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Typesettr — "${projectName}" Dizgisi Tamamlandı`,
      html
    });
    logger.info(`Completion email sent to ${email} for project ${projectName}`);
  } catch (error) {
    logger.error(`Failed to send completion email: ${error.message}`);
  }
}

module.exports = { generateVerificationToken, sendVerificationEmail, sendPasswordResetEmail, sendProjectCompletedEmail };
