import net from "node:net";
import tls from "node:tls";

type ResetEmail = {
  to: string;
  name: string;
  code: string;
};

type VerificationEmail = {
  to: string;
  name: string;
  code: string;
};

type ContactEmail = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type EmailMessage = {
  to: string;
  name: string;
  subject: string;
  text: string;
  html?: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

function encodeHeader(value: string) {
  return value.replace(/\r|\n/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function codeEmailHtml({ title, name, intro, code, outro }: { title: string; name: string; intro: string; code: string; outro: string }) {
  return [
    '<div style="margin:0;background:#f7f5f0;padding:32px;font-family:Arial,sans-serif;color:#161713">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dedbd2;border-radius:16px;padding:32px">',
    '<div style="font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#667200">NEXORA</div>',
    `<h1 style="margin:18px 0 10px;font-size:30px;line-height:1.05;color:#161713">${escapeHtml(title)}</h1>`,
    `<p style="font-size:15px;line-height:1.6;color:#606258">Bonjour ${escapeHtml(name)},</p>`,
    `<p style="font-size:15px;line-height:1.6;color:#606258">${escapeHtml(intro)}</p>`,
    `<div style="margin:28px 0;padding:22px;border-radius:14px;background:#101418;color:#d8ff55;text-align:center;font-size:42px;font-weight:900;letter-spacing:.28em">${escapeHtml(code)}</div>`,
    `<p style="font-size:13px;line-height:1.6;color:#777b70">${escapeHtml(outro)}</p>`,
    "</div>",
    "</div>",
  ].join("");
}

function waitFor(socket: SmtpSocket, expected: number[]) {
  return new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const response = chunk.toString("utf8");
      const lines = response.trim().split(/\r?\n/);
      const last = lines[lines.length - 1] ?? "";
      const code = Number(last.slice(0, 3));
      if (last[3] === "-") return;
      socket.off("data", onData);
      if (expected.includes(code)) resolve();
      else reject(new Error(`SMTP failed: ${response.trim()}`));
    };
    socket.on("data", onData);
  });
}

async function command(socket: SmtpSocket, value: string, expected: number[]) {
  socket.write(`${value}\r\n`);
  await waitFor(socket, expected);
}

function connectSmtp(host: string, port: number, secure: boolean) {
  return new Promise<SmtpSocket>((resolve, reject) => {
    const socket = secure ? tls.connect(port, host) : net.createConnection(port, host);
    socket.once("connect", () => resolve(socket));
    socket.once("secureConnect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function sendWithSmtp({ to, name, subject, text, html }: EmailMessage) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) throw new Error("SMTP is not configured.");

  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const from = process.env.EMAIL_FROM ?? `Nexora <${user}>`;
  const fromAddress = from.match(/<(.+)>/)?.[1] ?? user;
  const socket = await connectSmtp(host, port, secure);

  await waitFor(socket, [220]);
  await command(socket, "EHLO nexora.local", [250]);
  await command(socket, "AUTH LOGIN", [334]);
  await command(socket, Buffer.from(user).toString("base64"), [334]);
  await command(socket, Buffer.from(password).toString("base64"), [235]);
  await command(socket, `MAIL FROM:<${fromAddress}>`, [250]);
  await command(socket, `RCPT TO:<${to}>`, [250, 251]);
  await command(socket, "DATA", [354]);
  const boundary = `nexora-${Date.now().toString(36)}`;
  const body = html
    ? [
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      text,
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
      `--${boundary}--`,
    ]
    : [
      "Content-Type: text/plain; charset=utf-8",
      "",
      text,
    ];

  await command(socket, [
    `From: ${encodeHeader(from)}`,
    `To: ${encodeHeader(name)} <${encodeHeader(to)}>`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    ...body,
    ".",
  ].join("\r\n"), [250]);
  await command(socket, "QUIT", [221]);
  socket.end();
}

async function sendWithResend({ to, subject, text, html }: EmailMessage) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_replace_me") throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Nexora <receipts@example.com>",
      to,
      subject,
      text,
      html,
    }),
  });
  if (!response.ok) throw new Error(`Resend failed with status ${response.status}.`);
}

async function sendEmail(input: EmailMessage) {
  if (process.env.SMTP_HOST) {
    await sendWithSmtp(input);
    return;
  }

  await sendWithResend(input);
}

export async function sendPasswordResetEmail({ to, name, code }: ResetEmail) {
  await sendEmail({
    to,
    name,
    subject: "Code de réinitialisation Nexora",
    text: [
      `Bonjour ${name},`,
      "",
      "Votre code pour changer le mot de passe Nexora est :",
      code,
      "",
      "Ce code expire dans 10 minutes. Si vous n'avez rien demandé, ignorez cet email.",
    ].join("\r\n"),
    html: codeEmailHtml({
      title: "Code de reinitialisation Nexora",
      name,
      intro: "Votre code pour changer le mot de passe Nexora est :",
      code,
      outro: "Ce code expire dans 10 minutes. Si vous n avez rien demande, ignorez cet email.",
    }),
  });
}

export async function sendEmailVerification({ to, name, code }: VerificationEmail) {
  await sendEmail({
    to,
    name,
    subject: "Code de vérification Nexora",
    text: [
      `Bonjour ${name},`,
      "",
      "Votre code pour vérifier votre compte Nexora est :",
      code,
      "",
      "Ce code expire dans 10 minutes. Si vous n'avez pas créé ce compte, ignorez cet email.",
    ].join("\r\n"),
    html: codeEmailHtml({
      title: "Code de verification Nexora",
      name,
      intro: "Votre code pour verifier votre compte Nexora est :",
      code,
      outro: "Ce code expire dans 10 minutes. Si vous n avez pas cree ce compte, ignorez cet email.",
    }),
  });
}

export async function sendContactMessageEmail({ name, email, subject, message }: ContactEmail) {
  await sendEmail({
    to: process.env.CONTACT_TO_EMAIL ?? process.env.SMTP_USER ?? "Nizarelkarni@gmail.com",
    name: "Nexora Admin",
    subject: `Nouveau contact Nexora: ${subject}`,
    text: [
      `Nom: ${name}`,
      `Email: ${email}`,
      `Sujet: ${subject}`,
      "",
      message,
    ].join("\r\n"),
  });
}







