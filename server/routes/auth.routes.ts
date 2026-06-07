import type { Express } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as storage from "../storage";
import { finalizeAuthenticatedSession } from "../lib/authSession";
import { ensureLoginSessionStillValid } from "../middleware/auth";
import { sendEmail } from "../lib/email";

const BD_PHONE_RE = /^(?:\+?88)?0?1[3-9]\d{8}$/;

const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((v) => BD_PHONE_RE.test(v.replace(/[\s\-()]/g, "")), {
      message: "Please input valid number",
    }),
  password: z.string().min(6),
  fullName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
});

const resetPasswordSchema = z.object({
  token: z.string().optional(),
  otp: z.string().optional(),
  phone: z.string().optional(),
  newPassword: z.string().min(6),
}).refine(data => data.token || (data.otp && data.phone), {
  message: "Either token or (otp + phone) is required",
});

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { email, phone: rawPhone, password, fullName } = parsed.data;
    const emailNorm = email?.trim().toLowerCase() ?? null;
    // Normalize any BD phone format → +8801XXXXXXXXX
    const phoneNorm = (() => {
      const c = rawPhone.replace(/[\s\-()]/g, "");
      const m = c.match(/^(?:\+?88)?0?(1[3-9]\d{8})$/);
      return m ? `+880${m[1]}` : c;
    })();
    if (emailNorm && (await storage.getUserByEmail(emailNorm))) {
      return res.status(400).json({ error: "Email already registered" });
    }
    if (phoneNorm && (await storage.getUserByPhone(phoneNorm))) {
      return res.status(400).json({ error: "Phone already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      email: emailNorm,
      phone: phoneNorm,
      passwordHash,
      fullName,
      role: "customer",
    });
    const platform = await storage.getPlatformSettingsMap();
    await finalizeAuthenticatedSession(req, user, platform);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        hasPassword: true,
        avatarUrl: user.avatarUrl ?? null,
        googleSub: user.googleSub ?? null,
        facebookSub: user.facebookSub ?? null,
      },
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { email, phone, password } = parsed.data;
    if (!email && !phone) return res.status(400).json({ error: "Email or phone required" });
    const user = email ? await storage.getUserByEmail(email) : await storage.getUserByPhone(phone!);
    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.role === "platform_admin") {
      return res.status(403).json({
        error: "Platform administrators cannot use the store login. Sign in at /admin/login instead.",
      });
    }
    const platform = await storage.getPlatformSettingsMap();
    await finalizeAuthenticatedSession(req, user, platform);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        hasPassword: true,
        avatarUrl: user.avatarUrl ?? null,
        googleSub: user.googleSub ?? null,
        facebookSub: user.facebookSub ?? null,
      },
    });
  });

  /** Same credentials as /api/auth/login but only for `platform_admin` (used by /admin/login). */
  app.post("/api/auth/admin/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { email, phone, password } = parsed.data;
    if (!email && !phone) return res.status(400).json({ error: "Email or phone required" });
    const user = email ? await storage.getUserByEmail(email) : await storage.getUserByPhone(phone!);
    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.role !== "platform_admin") {
      return res.status(403).json({
        error: "This sign-in is for platform administrators only. Customers and sellers should use /login.",
      });
    }
    const platform = await storage.getPlatformSettingsMap();
    await finalizeAuthenticatedSession(req, user, platform);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        hasPassword: true,
        avatarUrl: user.avatarUrl ?? null,
        googleSub: user.googleSub ?? null,
        facebookSub: user.facebookSub ?? null,
      },
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.json({ user: null });
    const ok = await ensureLoginSessionStillValid(req, res);
    if (!ok) return res.json({ user: null });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.json({ user: null });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        hasPassword: !!(user.passwordHash && user.passwordHash.length > 0),
        avatarUrl: user.avatarUrl ?? null,
        googleSub: user.googleSub ?? null,
        facebookSub: user.facebookSub ?? null,
      },
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { email, phone } = parsed.data;
    const user = email ? await storage.getUserByEmail(email) : (phone ? await storage.getUserByPhone(phone) : undefined);

    const isEmail = !!email;
    if (!user) {
      return res.status(404).json({ error: isEmail ? "No account found with this email address." : "No account found with this phone number." });
    }

    // Check if the lookup method matches their registered contact
    if (isEmail && !user.email) {
      return res.status(404).json({ error: "No account found with this email address." });
    }
    if (!isEmail && !user.phone) {
      return res.status(404).json({ error: "No account found with this phone number." });
    }

    const successMsg = isEmail
      ? "Password reset link sent to your email."
      : "OTP sent to your phone number.";

    const successResponse = { ok: true, message: successMsg, method: isEmail ? "email" : "phone" };

    const crypto = await import("crypto");

    if (isEmail) {
      // Email token flow
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.createPasswordResetToken(user.id, token, expiresAt);

      const resetLink = `${process.env.PUBLIC_SITE_URL}/reset-password?token=${token}`;
      const platform = await storage.getPlatformSettingsMap();

      const subject = platform.smtp_subject;
      const textTemplate = platform.smtp_text || "Click here to reset your password: ${resetLink}";
      const htmlTemplate = platform.smtp_html || `<p>Click here to reset your password: <a href="\${resetLink}">\${resetLink}</a></p>`;

      const text = textTemplate.replace(/\$\{resetLink\}/g, resetLink);
      const html = htmlTemplate.replace(/\$\{resetLink\}/g, resetLink);

      try {
        await sendEmail({
          to: user.email!,
          subject,
          text,
          html,
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    } else {
      // Phone OTP flow
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins for OTP

      // Store the OTP in the token column
      // To ensure no collision if 2 people request OTP at the exact same millisecond,
      // we prepend the user ID to the token internally or just use the OTP (collisions are rare for 15 min expiry, but to be 100% safe):
      // We will store it as `otp:${user.phone}:${otp}` to make it unique per phone.
      const otpToken = `otp:${user.phone}:${otp}`;
      await storage.createPasswordResetToken(user.id, otpToken, expiresAt);

      const platform = await storage.getPlatformSettingsMap();
      const apiKey = platform.bulksmsbd_api_key;
      const senderId = platform.bulksmsbd_sender_id;

      if (apiKey && senderId) {
        const formatTemplate = platform.bulksmsbd_otp_format;
        const message = formatTemplate.replace(/\$\{otp\}/g, otp);
        const url = "http://bulksmsbd.net/api/smsapi";
        // Extract exactly the last 10 digits as requested (e.g., 1714526039)
        const apiPhone = user.phone!.slice(-10);
        const body = new URLSearchParams({
          api_key: apiKey,
          senderid: senderId,
          number: apiPhone,
          message: message
        });

        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
          });
          const responseText = await resp.text();
          console.log(`[BulkSMSBD] Response Status: ${resp.status}`);
          console.log(`[BulkSMSBD] Response Body: ${responseText}`);
        } catch (error) {
          console.error("Failed to send OTP SMS:", error);
        }
      } else {
        console.warn("BulkSMSBD API Key or Sender ID not configured. OTP not sent.");
      }
    }

    res.json(successResponse);
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { token, otp, phone, newPassword } = parsed.data;

    let searchToken = token;
    if (otp && phone) {
      // Find the user by phone to construct the exact otp token stored
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired OTP." });
      }
      searchToken = `otp:${user.phone}:${otp}`;
    }

    if (!searchToken) {
      return res.status(400).json({ error: "Invalid request parameters." });
    }

    // Get and validate the token
    const tokenRow = await storage.getPasswordResetToken(searchToken);

    if (!tokenRow) {
      return res.status(400).json({ error: otp ? "Invalid or expired OTP." : "Invalid or expired reset token." });
    }

    if (tokenRow.expiresAt < new Date()) {
      // Clean up expired token
      await storage.markPasswordResetTokenUsed(searchToken);
      return res.status(400).json({ error: otp ? "OTP has expired." : "Reset token has expired." });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await storage.updateUserPassword(tokenRow.userId, newPasswordHash);

    // Mark the token as used
    await storage.markPasswordResetTokenUsed(searchToken);

    // Auto login
    const user = await storage.getUserById(tokenRow.userId);
    if (user) {
      const platform = await storage.getPlatformSettingsMap();
      await finalizeAuthenticatedSession(req, user, platform);

      res.json({
        ok: true,
        message: "Password has been reset successfully. Logging you in...",
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          hasPassword: true,
          avatarUrl: user.avatarUrl ?? null,
          googleSub: user.googleSub ?? null,
          facebookSub: user.facebookSub ?? null,
        }
      });
    } else {
      res.json({ ok: true, message: "Password has been reset successfully." });
    }
  });
}
