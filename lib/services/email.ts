export type SendEmailRequest = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(request: SendEmailRequest): Promise<void> {
  // Replace with your email adapter (Postmark, Resend, SES, etc.).
  console.info("[email] simulated send", { to: request.to, subject: request.subject });
}
