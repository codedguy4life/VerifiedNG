// Send transactional password-reset emails over HTTPS rather than SMTP.
// Render Free blocks outbound SMTP ports. Never expose the API key to the frontend.
const SEND_ENDPOINT = "https://api.resend.com/emails";

async function sendPasswordResetEmail({ recipient, resetLink }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    const error = new Error("Password reset email provider is not configured");
    error.code = "MAIL_NOT_CONFIGURED";
    throw error;
  }
  const response = await fetch(SEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: "Reset your VerifiedNG password",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2>Reset your VerifiedNG password</h2>
        <p>Use the button below to change your password. The link expires after one hour.</p>
        <a href="${resetLink}" style="display:inline-block;background:#087044;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a>
        <p style="color:#52635a;font-size:13px">If you did not request a password reset, ignore this email.</p>
      </div>`,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const error = new Error("Email provider returned HTTP " + response.status);
    error.code = "MAIL_HTTP_" + response.status;
    throw error;
  }
}

module.exports = { sendPasswordResetEmail };
