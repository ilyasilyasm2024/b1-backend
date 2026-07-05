const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (to, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"B1 Prüfungsvorbereitung" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Bestätige deine E-Mail-Adresse ✓',
    html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #111827 0%, #374151 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">B1 Prüfungsvorbereitung</h1>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 13px;">Zertifikat B1 neu</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <!-- Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 56px; height: 56px; background-color: #ecfdf5; border-radius: 50%; line-height: 56px; text-align: center;">
                  <span style="font-size: 24px;">✉️</span>
                </div>
              </div>

              <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">Willkommen an Bord!</h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Du bist nur einen Klick davon entfernt, deine B1-Prüfungsvorbereitung zu starten. Bestätige deine E-Mail-Adresse, um loszulegen.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 8px; letter-spacing: 0.3px;">
                  E-Mail bestätigen →
                </a>
              </div>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">

              <!-- Link fallback -->
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 11px; text-align: center;">
                Button funktioniert nicht? Kopiere diesen Link:
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 11px; text-align: center; word-break: break-all;">
                <a href="${verificationUrl}" style="color: #4f46e5; text-decoration: underline;">${verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px;">
                      ⏱ Dieser Link läuft in 24 Stunden ab.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      Du hast kein Konto erstellt? Dann ignoriere diese E-Mail einfach.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} B1 Prüfungsvorbereitung. Alle Rechte vorbehalten.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
};

const sendResetPasswordEmail = async (to, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"B1 Prüfungsvorbereitung" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Passwort zurücksetzen',
    html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #111827 0%, #374151 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">B1 Prüfungsvorbereitung</h1>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 13px;">Zertifikat B1 neu</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 56px; height: 56px; background-color: #fef3c7; border-radius: 50%; line-height: 56px; text-align: center;">
                  <span style="font-size: 24px;">🔑</span>
                </div>
              </div>

              <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">Passwort zurücksetzen</h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein neues Passwort festzulegen.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 8px; letter-spacing: 0.3px;">
                  Neues Passwort festlegen →
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">

              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 11px; text-align: center;">
                Button funktioniert nicht? Kopiere diesen Link:
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 11px; text-align: center; word-break: break-all;">
                <a href="${resetUrl}" style="color: #4f46e5; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px;">
                      ⏱ Dieser Link läuft in 1 Stunde ab.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      Du hast kein Zurücksetzen angefordert? Dann ignoriere diese E-Mail — dein Passwort bleibt unverändert.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} B1 Prüfungsvorbereitung. Alle Rechte vorbehalten.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
};

module.exports = { sendVerificationEmail, sendResetPasswordEmail };
