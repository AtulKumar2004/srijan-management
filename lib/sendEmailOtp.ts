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
      from: `"Srijan Youth Festival" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Verification Code",
      text: `Hare Krishna.\n\nYour one-time verification code is: ${code}\n\nThis code is valid for 10 minutes. Please do not share it with anyone.\n\nWith prayers,\nSrijan Youth Festival Team`,
      html: `
        <div style="margin:0;padding:0;background:#f6f7fb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #f0e0b6;border-radius:14px;overflow:hidden;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#f4d489,#efc26a);padding:22px 26px;border-bottom:1px solid #e7c57b;">
                      <div style="font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#7f3f1f;font-weight:700;">Srijan Youth Festival</div>
                      <div style="font-family:Verdana,Arial,sans-serif;font-size:13px;line-height:1.6;color:#7f3f1f;opacity:0.9;">Verification for your devotional journey</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 26px 16px 26px;font-family:Verdana,Arial,sans-serif;color:#2f3441;">
                      <p style="margin:0 0 12px 0;font-size:17px;line-height:1.6;font-weight:600;color:#7f3f1f;">Hare Krishna,</p>
                      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;">Please use the one-time password below to verify your account.</p>

                      <div style="margin:18px 0 18px 0;padding:18px 14px;background:#fff8e8;border:1px dashed #d49c37;border-radius:12px;text-align:center;">
                        <div style="font-size:12px;letter-spacing:1px;color:#7f3f1f;text-transform:uppercase;margin-bottom:8px;">Your Verification Code</div>
                        <div style="font-size:34px;line-height:1.1;font-weight:700;letter-spacing:6px;color:#a65353;">${code}</div>
                      </div>

                      <p style="margin:0 0 10px 0;font-size:14px;line-height:1.7;color:#3e4654;">
                        This code is valid for <strong>10 minutes</strong>. For your safety, please do not share it with anyone.
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#3e4654;">
                        May your service and sadhana be ever blessed.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 26px 24px 26px;border-top:1px solid #f1f1f1;font-family:Verdana,Arial,sans-serif;">
                      <p style="margin:0;font-size:12px;line-height:1.7;color:#7f8491;">
                        If you did not request this OTP, you can safely ignore this email.
                      </p>
                      <p style="margin:8px 0 0 0;font-size:12px;line-height:1.7;color:#7f8491;">
                        With prayers,<br />Srijan Youth Festival Team
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
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
