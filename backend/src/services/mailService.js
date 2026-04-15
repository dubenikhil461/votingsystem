const nodemailer = require("nodemailer");

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendOtpEmail(to, otp) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV OTP] ${to} => ${otp}`);
    return { mocked: true };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "QuickVote OTP Verification",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });
  return { mocked: false };
}

module.exports = { sendOtpEmail };
