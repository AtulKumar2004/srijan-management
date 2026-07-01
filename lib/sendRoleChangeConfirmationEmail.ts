import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/getAppUrl";

export async function sendRoleChangeConfirmationEmail(email: string, name: string, oldRole: string, newRole: string) {
  if (!email) return;
  const appUrl = getAppUrl();

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

    const formatRole = (r: string) => r ? r.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "User";

    const formattedOldRole = formatRole(oldRole);
    const formattedNewRole = formatRole(newRole);

    const mailOptions = {
      from: `"Temple Management System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Role Updated to ${formattedNewRole} - Temple Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #A65353; text-align: center;">Account Role Update Notification</h2>
          <p>Hare Krishna ${name},</p>
          <p>This is to confirm that your account role on the Temple Management platform has been updated.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Previous Role:</strong> ${formattedOldRole}</p>
            <p style="margin: 5px 0;"><strong>New Assigned Role:</strong> <span style="color: #A65353; font-weight: bold;">${formattedNewRole}</span></p>
          </div>
          <p>You can log into the platform using the button below to access your dashboard and specific features assigned to your new role:</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${appUrl}" style="background-color: #A65353; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; display: inline-block;">Access Temple Management Portal</a>
          </div>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">If you believe this role change was made in error or have any questions, please reach out to your administrator.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
          <p style="font-size: 0.8em; color: #999; text-align: center;">Temple Management System</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Role change confirmation email sent to ${email} (${oldRole} -> ${newRole})`);
  } catch (error) {
    console.error("Error sending role change confirmation email:", error);
  }
}
