import { ENV } from '../config/env.js';
import { validateEmail, escapeHtml, sanitizeString } from '../utils/inputValidator.js';

let cachedSender = null;

async function getValidSender() {
  if (cachedSender) return cachedSender;

  const configuredEmail = ENV.BREVO_SENDER_EMAIL;
  const configuredName = ENV.BREVO_SENDER_NAME || 'StockPulse';

  try {
    const res = await fetch('https://api.brevo.com/v3/senders', {
      headers: {
        accept: 'application/json',
        'api-key': ENV.BREVO_API_KEY,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const senders = data.senders || [];
      const activeSenders = senders.filter((s) => s.active);

      const match = activeSenders.find(
        (s) => s.email?.toLowerCase() === configuredEmail?.toLowerCase()
      );

      if (match) {
        cachedSender = {
          name: configuredName || match.name,
          email: match.email,
        };
        return cachedSender;
      }

      if (activeSenders.length > 0) {
        console.warn(
          `⚠️ [Brevo] Configured sender "${configuredEmail}" is not verified in Brevo. Using verified sender: ${activeSenders[0].email}`
        );
        cachedSender = {
          name: configuredName || activeSenders[0].name || 'StockPulse',
          email: activeSenders[0].email,
        };
        return cachedSender;
      }
    }
  } catch (err) {
    console.error('⚠️ [Brevo] Could not fetch senders list:', err.message);
  }

  return {
    name: configuredName,
    email: configuredEmail || 'pixelstockapp@gmail.com',
  };
}

export const sendVerificationEmail = async ({ email, name, token }) => {
  // Validate recipient email
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new Error(`Invalid recipient email: ${emailValidation.error}`);
  }
  const cleanEmail = emailValidation.value;

  if (!token || typeof token !== 'string') {
    throw new Error('Verification token is required and must be a valid string.');
  }

  const safeToken = encodeURIComponent(token.trim());
  const verificationUrl = `${ENV.CLIENT_URL}/verify-email?token=${safeToken}`;
  const safeVerificationUrl = escapeHtml(verificationUrl);
  const safeName = escapeHtml(sanitizeString(name || '', 70)) || 'there';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your StockPulse account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1117; color: #f4f5f7;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f1117; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #181b26; border: 1px solid #272b3b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 20px; text-align: center; border-bottom: 1px solid #272b3b;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; background: linear-gradient(135deg, #3b82f6, #6366f1); border-radius: 14px; margin-bottom: 14px;">
                <span style="font-size: 26px; font-weight: 800; color: #ffffff;">⚡</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">
                StockPulse
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
                Account Verification
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #ffffff;">
                Verify your email address
              </h2>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Hi <strong style="color: #ffffff;">${safeName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Thank you for creating an account with StockPulse. To prevent automated spam and protect your workspace, we require email validation before you can proceed to identity onboarding and activate your workspace.
              </p>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeVerificationUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #ffffff; color: #09090b; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 14px rgba(255,255,255,0.15);">
                      Verify Email & Continue Onboarding →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 8px; font-size: 12px; color: #94a3b8;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #60a5fa; background: #0f1117; padding: 12px 14px; border-radius: 8px; border: 1px solid #272b3b;">
                <a href="${safeVerificationUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: none;">${safeVerificationUrl}</a>
              </p>

              <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 12px 14px; margin-top: 20px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #fbbf24;">
                  ⏳ This link is valid for <strong>24 hours</strong>. If you did not request this registration, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #12141d; border-top: 1px solid #272b3b; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © ${new Date().getFullYear()} StockPulse Inc. All rights reserved.
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">
                Automated security transmission • Please do not reply directly to this email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  // Validate Brevo API key
  if (!ENV.BREVO_API_KEY || ENV.BREVO_API_KEY.includes('your_brevo_api_key')) {
    throw new Error('Brevo API key is not configured in server/.env (BREVO_API_KEY)');
  }

  const sender = await getValidSender();

  // Call Brevo transactional email API with strict sanitized inputs
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': ENV.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [
        {
          email: cleanEmail,
          name: sanitizeString(name || cleanEmail, 70),
        },
      ],
      subject: 'Verify your email address - StockPulse',
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedErr = {};
    try {
      parsedErr = JSON.parse(errorText);
    } catch {
      parsedErr = { message: errorText };
    }
    console.error('❌ [Brevo] Failed to send email via Brevo API:', parsedErr);

    const errorMsg =
      parsedErr.message ||
      `Brevo API responded with status ${response.status} (${response.statusText})`;

    throw new Error(errorMsg);
  }

  const data = await response.json();
  console.log(`✅ [Brevo] Verification email dispatched to ${email} (MessageId: ${data.messageId || 'ok'})`);
  return { success: true, messageId: data.messageId, verificationUrl };
};
