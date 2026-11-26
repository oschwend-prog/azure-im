// Vercel serverless function: contact form -> email to info@azure-im.com via Resend.
//
// Environment variables (Vercel > Project > Settings > Environment Variables):
//   RESEND_API_KEY  required. Without it the endpoint answers 503 and the page asks
//                   visitors to email info@azure-im.com directly.
//   CONTACT_TO      optional, default info@azure-im.com
//   CONTACT_FROM    optional, default "azure IM website <onboarding@resend.dev>".
//                   The default sender only delivers to the address the Resend account
//                   was opened with; verify azure-im.com in Resend to send from your own domain.

const MAX = { name: 200, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_FILL_MS = 2500; // humans take longer than this to fill the form

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return send(res, 400, { error: "Sorry, the message could not be read. Please email info@azure-im.com." });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();

  // Spam traps: filled honeypot or an instant submit. Pretend success so bots learn nothing.
  if (String(body.website || "") !== "" || Number(body.elapsed || 0) < MIN_FILL_MS) {
    return send(res, 200, { ok: true });
  }

  if (!name || !email || !message) {
    return send(res, 400, { error: "Please fill in your name, email and message." });
  }
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) {
    return send(res, 400, { error: "That message is too long. Please shorten it or email info@azure-im.com." });
  }
  if (!EMAIL_RE.test(email)) {
    return send(res, 400, { error: "Please check your email address." });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return send(res, 503, { error: "The form is not available right now. Please email info@azure-im.com." });
  }

  const to = process.env.CONTACT_TO || "info@azure-im.com";
  const from = process.env.CONTACT_FROM || "azure IM website <onboarding@resend.dev>";
  const cleanName = name.replace(/[\r\n]+/g, " ");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: "Website enquiry from " + cleanName,
        text: "Name: " + cleanName + "\nEmail: " + email + "\n\n" + message + "\n\n(Sent from the contact form on azure-im.com)"
      })
    });
    if (!r.ok) {
      console.error("Resend error", r.status, await r.text());
      return send(res, 502, { error: "Sorry, the message could not be sent. Please email info@azure-im.com." });
    }
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("Resend request failed", e);
    return send(res, 502, { error: "Sorry, the message could not be sent. Please email info@azure-im.com." });
  }
};
