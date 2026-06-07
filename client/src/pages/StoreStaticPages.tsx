import { useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Divider,
  Grid,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { Link } from "wouter";
import { ContentPageRenderer } from "@/components/store/ContentPageRenderer";
import { useStorefrontContact } from "@/hooks/useStorefrontContact";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";

/* ------------------------------------------------------------- Simple wrappers */

export function AboutPage() {
  return <ContentPageRenderer slug="about" canonicalPath="/about" />;
}

export function FaqPage() {
  return <ContentPageRenderer slug="faq" canonicalPath="/faq" />;
}

export function PrivacyPolicyPage() {
  return <ContentPageRenderer slug="privacy" canonicalPath="/privacy" />;
}

export function TermsPage() {
  return <ContentPageRenderer slug="terms" canonicalPath="/terms" />;
}

export function ReturnsPolicyPage() {
  return <ContentPageRenderer slug="returns" canonicalPath="/returns" />;
}

export function PaymentLicensesPage() {
  return <ContentPageRenderer slug="payments" canonicalPath="/payments" />;
}

export function WarrantyPage() {
  return <ContentPageRenderer slug="warranty" canonicalPath="/warranty" />;
}

/* ------------------------------------------------------------- Contact page */

function ContactInfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        p: 2.5,
        height: "100%",
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
        boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ display: "block", fontWeight: 800, letterSpacing: 0.08, mb: 1.25 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function ContactPage() {
  const { text } = useStorefrontLanguage();
  const contact = useStorefrontContact();
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const showMap = Boolean(contact.mapsEmbedUrl?.trim());

  const extraBelow = (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <Grid container spacing={2.5} alignItems="stretch">
        <Grid item xs={12} sm={4}>
          <ContactInfoCard title={text("Phone", "ফোন")}>
            {contact.supportPhoneDisplay ? (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <PhoneOutlinedIcon sx={{ fontSize: 22, color: "primary.main", flexShrink: 0 }} />
                <MuiLink href={contact.supportPhoneTel} fontWeight={700} underline="hover" sx={{ wordBreak: "break-word" }}>
                  {contact.supportPhoneDisplay}
                </MuiLink>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
          </ContactInfoCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <ContactInfoCard title={text("Email", "ইমেইল")}>
            {contact.supportEmail ? (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <EmailOutlinedIcon sx={{ fontSize: 22, color: "primary.main", flexShrink: 0 }} />
                <MuiLink href={`mailto:${contact.supportEmail}`} fontWeight={700} underline="hover" sx={{ wordBreak: "break-all" }}>
                  {contact.supportEmail}
                </MuiLink>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
          </ContactInfoCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <ContactInfoCard title={text("Office", "অফিস")}>
            {contact.addressBlock ? (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <PlaceOutlinedIcon sx={{ fontSize: 22, color: "primary.main", flexShrink: 0, mt: 0.1 }} />
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.7, whiteSpace: "pre-line" }}>
                  {contact.addressBlock}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
          </ContactInfoCard>
        </Grid>
      </Grid>
      {showMap ? (
        <Box>
          <Typography component="h2" variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            {text("On the map", "মানচিত্রে")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 640 }}>
            {text("Tap open in Google Maps for directions in the app.", "দিকনির্দেশনার জন্য ম্যাপ খুলুন।")}
          </Typography>
          <Box
            sx={{
              width: "100%",
              maxWidth: 720,
              borderRadius: 2.5,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 12px 40px rgba(11,11,11,0.08)",
              mb: 1.5,
              "& > iframe": { display: "block", width: "100%", border: 0, height: { xs: 280, sm: 360 } },
            }}
          >
            <iframe title="Map" src={contact.mapsEmbedUrl!} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </Box>
          {contact.mapsOpenUrl ? (
            <MuiLink
              href={contact.mapsOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              fontWeight={700}
              sx={{ display: "inline-block" }}
            >
              {text("Open in Google Maps", "গুগল ম্যাপে খুলুন")}
            </MuiLink>
          ) : null}
        </Box>
      ) : null}
      <Divider />
      <Typography component="h2" variant="h6" fontWeight={800}>
        {text("Send a message", "বার্তা পাঠান")}
      </Typography>
      {sent ? (
        <Typography fontWeight={700} color="primary" sx={{ py: 1 }}>
          {text(
            "Thanks — we have received your message. Our team will get back to you soon.",
            "ধন্যবাদ—শীঘ্রই জবাব।",
          )}
        </Typography>
      ) : (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) setSent(true);
          }}
          noValidate
        >
          <Stack spacing={2} sx={{ maxWidth: 520 }}>
            <TextField
              label={text("Your name", "আপনার নাম")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              size="small"
              sx={{ bgcolor: "background.paper" }}
            />
            <TextField
              label={text("Email", "ইমেইল")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              size="small"
              sx={{ bgcolor: "background.paper" }}
            />
            <TextField
              label={text("Message", "বার্তা")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              fullWidth
              multiline
              minRows={4}
              sx={{ bgcolor: "background.paper" }}
            />
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 800 }}>
                {text("Submit", "পাঠান")}
              </Button>
              <MuiLink component={Link} href="/faq" underline="hover" fontWeight={700}>
                {text("Help & FAQ", "সহায়তা ও প্রশ্নোত্তর")}
              </MuiLink>
            </Stack>
          </Stack>
        </Box>
      )}
    </Stack>
  );

  return (
    <ContentPageRenderer slug="contact" canonicalPath="/contact" extraBelow={extraBelow} />
  );
}
