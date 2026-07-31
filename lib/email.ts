import net from "node:net";
import tls from "node:tls";

type ResetEmail = {
  to: string;
  name: string;
  resetUrl: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

function encodeHeader(value: string) {
  return value.replace(/\r|\n/g, "");
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

async function sendWithSmtp({ to, name, resetUrl }: ResetEmail) {
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
  await command(socket, [
    `From: ${encodeHeader(from)}`,
    `To: ${encodeHeader(name)} <${encodeHeader(to)}>`,
    "Subject: Reset your Nexora admin password",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    `Hi ${name},`,
    "",
    "Use this link to choose a new Nexora admin password:",
    resetUrl,
    "",
    "This link expires in one hour. If you did not request it, ignore this email.",
    ".",
  ].join("\r\n"), [250]);
  await command(socket, "QUIT", [221]);
  socket.end();
}

async function sendWithResend({ to, name, resetUrl }: ResetEmail) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_replace_me") throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Nexora <receipts@example.com>",
      to,
      subject: "Reset your Nexora admin password",
      text: `Hi ${name},\n\nUse this link to choose a new Nexora admin password:\n${resetUrl}\n\nThis link expires in one hour.`,
    }),
  });
  if (!response.ok) throw new Error(`Resend failed with status ${response.status}.`);
}

export async function sendPasswordResetEmail(input: ResetEmail) {
  if (process.env.SMTP_HOST) {
    await sendWithSmtp(input);
    return;
  }

  await sendWithResend(input);
}
