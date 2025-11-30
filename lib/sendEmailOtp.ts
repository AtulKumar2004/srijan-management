import nodemailer from "nodemailer";

export async function sendEmailOtp(email: string, code: string) {
  try {
    console.log("Sending EMAIL OTP to:", email, "Code:", code);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false, // TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Youth Program" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <div style="font-family: Arial; padding: 10px;">
          <h2>Your OTP Verification Code</h2>
          <p style="font-size: 20px; font-weight: bold">${code}</p>
          <p>This OTP will expire in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });

    console.log("Email Sent:", info.messageId);
    return { ok: true };

  } catch (error: any) {
    console.error("EMAIL OTP ERROR:", error.message);
    return { ok: false, error: error.message };
  }
}
