# Airfrost Engineering Solutions

## Contact form email

The contact form validates the email address in the browser and again in the
Vercel serverless function at `api/contact.js`. The function sends inquiries to
`ronniemuworozi@gmail.com` through Resend. The API key must only be configured
as a server-side environment variable; never add it to `airfrost.html`.

1. In Resend, create or rotate an API key.
2. In Vercel project settings, add `RESEND_API_KEY` for the environments where
   the site is deployed.
3. Install dependencies with `npm install` and deploy the project to Vercel.
4. With Resend's `onboarding@resend.dev` sender, follow Resend's test-sending
   recipient restrictions. For production delivery to arbitrary recipients,
   verify a domain in Resend and update the `from` address in `api/contact.js`.

Copy `.env.example` to `.env` only for local testing and set the key there.
Do not commit `.env`.
