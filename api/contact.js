import { Resend } from "resend";

const recipient = "ronniemuworozi@gmail.com";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendJson(res, 400, { error: "Invalid form submission." });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return sendJson(res, 200, { success: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const message =
    typeof body.message === "string" ? body.message.trim() : "";

  if (
    name.length < 2 ||
    name.length > 120 ||
    email.length > 254 ||
    !emailPattern.test(email) ||
    message.length < 5 ||
    message.length > 2000
  ) {
    return sendJson(res, 400, {
      error: "Enter a valid name, email address, and inquiry.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Contact form is not configured: RESEND_API_KEY is missing.");
    return sendJson(res, 500, {
      error: "The contact form is temporarily unavailable. Please try again later.",
    });
  }

  const resend = new Resend(apiKey);
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");
  const subjectName = name.replace(/[\r\n]/g, " ").slice(0, 120);

  try {
    const { error } = await resend.emails.send({
      from: "Airfrost Website <onboarding@resend.dev>",
      to: [recipient],
      replyTo: email,
      subject: `Website inquiry from ${subjectName}`,
      html: `
        <h2>New Airfrost website inquiry</h2>
        <p><strong>Name / organization:</strong> ${safeName}</p>
        <p><strong>Reply-to email:</strong> ${safeEmail}</p>
        <p><strong>Required engineering service:</strong></p>
        <p>${safeMessage}</p>
      `,
      text: [
        "New Airfrost website inquiry",
        `Name / organization: ${name}`,
        `Reply-to email: ${email}`,
        "Required engineering service:",
        message,
      ].join("\n"),
    });

    if (error) {
      console.error("Resend rejected a contact form email:", error);
      return sendJson(res, 502, {
        error: "We could not send your inquiry. Please try again later.",
      });
    }

    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error("Resend contact email request failed:", error);
    return sendJson(res, 502, {
      error: "We could not send your inquiry. Please try again later.",
    });
  }
}
