import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/contact.js";

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    end(body) {
      this.body = body;
      return this;
    },
  };
}

test("contact endpoint only accepts POST requests", async () => {
  const response = createResponse();

  await handler({ method: "GET" }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
});

test("contact endpoint rejects malformed email addresses", async () => {
  const response = createResponse();

  await handler(
    {
      method: "POST",
      body: {
        name: "Sample Customer",
        email: "not-an-email",
        message: "Air conditioning installation",
      },
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.match(JSON.parse(response.body).error, /valid name, email address/);
});

test("contact endpoint rejects a missing or malformed request body", async () => {
  const response = createResponse();

  await handler({ method: "POST", body: null }, response);

  assert.equal(response.statusCode, 400);
});

test("contact endpoint silently accepts honeypot submissions without sending", async () => {
  const response = createResponse();

  await handler(
    {
      method: "POST",
      body: {
        website: "automated spam",
        name: "Bot",
        email: "bot@example.com",
        message: "Please contact me.",
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { success: true });
});

test("valid inquiries report a clear configuration error when the API key is absent", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const response = createResponse();
    await handler(
      {
        method: "POST",
        body: {
          name: "Sample Customer",
          email: "customer@example.com",
          message: "Air conditioning installation",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 500);
    assert.match(JSON.parse(response.body).error, /temporarily unavailable/);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  }
});

test("valid inquiries are forwarded to Resend with the customer's email as reply-to", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFetch = globalThis.fetch;
  let resendRequest;
  process.env.RESEND_API_KEY = "test-key";
  globalThis.fetch = async (url, options) => {
    resendRequest = {
      url: String(url),
      body: JSON.parse(options.body),
    };
    return new Response(JSON.stringify({ id: "email_test_123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = createResponse();
    await handler(
      {
        method: "POST",
        body: {
          name: "Sample Customer",
          email: "customer@example.com",
          message: "Air conditioning maintenance",
          website: "",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { success: true });
    assert.equal(resendRequest.url, "https://api.resend.com/emails");
    assert.equal(resendRequest.body.to[0], "ronniemuworozi@gmail.com");
    assert.equal(resendRequest.body.reply_to, "customer@example.com");
    assert.match(resendRequest.body.text, /Air conditioning maintenance/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  }
});
