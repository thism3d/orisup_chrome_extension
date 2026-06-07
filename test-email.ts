import { SMTPClient, Message } from "emailjs";

async function test() {
  const client = new SMTPClient({
    user: "support@orlenbd.com",
    password: "@Nexro2026",
    host: "mail.orlenbd.com",
    port: 465,
    ssl: true,
  });
  // In emailjs, we might have to pass tls options inside a "tls" object, or maybe as root properties.
  // Wait, emailjs has a known issue where it doesn't expose TLS rejectUnauthorized easily.

  const message = new Message({
    from: "support@orlenbd.com",
    to: "support@orlenbd.com",
    subject: "Test Email",
    text: "This is a test email.",
  });

  try {
    await new Promise<void>((resolve, reject) => {
      client.send(message, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log("Success!");
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

test();
