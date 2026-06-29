import nodemailer from "nodemailer";

export async function sendInviteEmail(email: string, name: string, defaultPassword: string, role: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000');
  const loginLink = `${appUrl}/login`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"Temple Management System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to the Temple Management System - ${role} Account Created`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #A65353; text-align: center;">Welcome to the Temple Management System</h2>
          <p>Hare Krishna ${name},</p>
          <p>Your account has been created on the Temple Management platform as a <strong>${role}</strong>.</p>
          <p>You can now log in and access your dashboard. Below are your default login credentials:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${defaultPassword}</p>
          </div>
          <p>We highly recommend changing your password after you log in for the first time.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${loginLink}" style="background-color: #A65353; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; display: inline-block;">Log in to your account</a>
          </div>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">If you have any questions, please contact your administrator.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
          <p style="font-size: 0.8em; color: #999; text-align: center;">Temple Management System</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invite email sent to ${email}`);
  } catch (error) {
    console.error("Error sending invite email:", error);
  }
}
