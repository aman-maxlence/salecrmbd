/** Shared HTML shell every onboarding email uses - keeps the templates below to just their own content. */
export function emailLayout({ title, heading, bodyHtml, ctaLabel, ctaUrl }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2430;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f5f7fa;padding:24px 0;">
    <tr><td align="center">
      <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
        <tr><td style="background-color:#2563eb;padding:32px 30px;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:32px 30px;">
          ${bodyHtml}
          ${ctaUrl ? `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:24px;">
            <tr><td align="center">
              <a href="${ctaUrl}" style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${ctaLabel}</a>
            </td></tr>
          </table>` : ''}
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Sale CRM by Maxlence - this is an automated email, please don't reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
