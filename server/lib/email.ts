import { Message, SMTPClient } from "emailjs";
import * as storage from "../storage";

// Ignore TLS cert altname mismatches which are common on cPanel/shared SMTP hosting
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function getSmtpClient() {
  const platform = await storage.getPlatformSettingsMap();

  const host = platform.smtp_host;
  const port = parseInt(platform.smtp_port, 10);
  const user = platform.smtp_user;
  const pass = platform.smtp_pass;
  const secure = port === 465;

  return new SMTPClient({
    user,
    password: pass,
    host,
    port,
    ssl: secure,
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const smtp = await getSmtpClient();
  const platform = await storage.getPlatformSettingsMap();

  const fromName = platform.smtp_from;
  const fromEmail = platform.smtp_user;
  const from = `"${fromName}" <${fromEmail}>`;

  const message = new Message({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    attachment: options.html
      ? [{ data: options.html, alternative: true }]
      : undefined,
  });

  await new Promise<void>((resolve, reject) => {
    smtp.send(message, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
