const BRAND = {
  primary: "#0F172A",
  accent: "#6366F1",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#475569",
  border: "#E2E8F0"
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderButton(label, href) {
  if (!label || !href) {
    return "";
  }
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
      <tr>
        <td style="border-radius: 12px; background: ${BRAND.accent};">
          <a href="${escapeHtml(href)}" style="display: inline-block; padding: 14px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
  `;
}

function renderBaseEmail({ heading, intro, bodyHtml, buttonLabel, buttonUrl, footerNote }) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(heading)}</title>
    </head>
    <body style="margin: 0; padding: 0; background: ${BRAND.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${BRAND.text};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${BRAND.background};">
        <tr>
          <td align="center" style="padding: 32px 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 640px;">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <div style="display: inline-block; background: ${BRAND.primary}; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 0.04em; padding: 14px 24px; border-radius: 18px;">Onnonn</div>
                </td>
              </tr>
              <tr>
                <td style="background: ${BRAND.card}; border: 1px solid ${BRAND.border}; border-radius: 24px; padding: 36px 32px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);">
                  <h1 style="margin: 0 0 14px; font-size: 30px; line-height: 1.2; color: ${BRAND.primary};">${escapeHtml(heading)}</h1>
                  <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.7; color: ${BRAND.muted};">${escapeHtml(intro)}</p>
                  <div style="font-size: 16px; line-height: 1.75; color: ${BRAND.text};">
                    ${bodyHtml}
                  </div>
                  ${renderButton(buttonLabel, buttonUrl)}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 12px 0; text-align: center; font-size: 13px; line-height: 1.7; color: ${BRAND.muted};">
                  <div>Onnonn, Inc.</div>
                  <div>${escapeHtml(footerNote || "You’re receiving this email because you have an Onnonn account or activity related to your workspace. Reply if you need help, or update your preferences if you no longer want product emails.")}</div>
                  <div style="margin-top: 8px;">Unsubscribe note: transactional emails may still be sent for account security and service updates.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

module.exports = { renderBaseEmail, escapeHtml };
