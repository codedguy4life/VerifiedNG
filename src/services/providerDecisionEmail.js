// Optional transactional decision email using the same Resend account as password reset.
// The application status page remains authoritative if delivery is unavailable.
const ENDPOINT = "https://api.resend.com/emails";

async function sendProviderDecisionEmail({ recipient, name, approved, reviewerNote }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return false;

  const greeting = name ? "Hello " + name.trim().slice(0, 80) + "," : "Hello,";
  const outcome = approved
    ? "Your application to become a VerifiedNG service provider has been approved. Sign in to see your provider access."
    : "Your VerifiedNG service provider application was not approved this time. You can update your details and reapply after the waiting period.";
  // Plain text avoids treating reviewer-provided text as HTML.
  const note = String(reviewerNote || "").trim().slice(0, 500);
  const text = [
    greeting, "", outcome, "",
    "Review note:", note, "",
    "View your application status: https://verifiedng.site/app", "",
    "Provider approval is separate from community verification and is not a guarantee of service quality.",
    "If you did not apply, please contact the VerifiedNG team through the website.",
  ].join("\n");
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: approved ? "Your VerifiedNG provider application was approved" : "Update on your VerifiedNG provider application",
      text,
    }),
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) {
    const error = new Error("Provider decision email delivery returned HTTP " + response.status);
    error.code = "MAIL_HTTP_" + response.status;
    throw error;
  }
  return true;
}
module.exports = { sendProviderDecisionEmail };
