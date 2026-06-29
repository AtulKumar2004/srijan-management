import nodemailer from "nodemailer";

export async function sendOutreachFollowupEmail(email: string, volunteerName: string, adminName: string, followUpDate: string, count: number) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("Email credentials not set, skipping outreach followup email broadcast.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false, // TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Srijan Youth Festival" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `New Outreach Followups Assigned (${followUpDate})`,
      text: `Hare Krishna ${volunteerName},\n\nYou have been assigned ${count} outreach contacts for followup on ${followUpDate} by Admin ${adminName}.\n\nPlease log in to the portal and navigate to Outreach Followups to complete your assigned calls.\n\nWith prayers,\nSrijan Youth Festival Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff8e8; border-radius: 10px; border: 1px solid #d49c37;">
          <h2 style="color: #7f3f1f; margin-top: 0;">Hare Krishna ${volunteerName},</h2>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">You have been assigned <strong>${count} outreach contacts</strong> for followup on <strong>${followUpDate}</strong> by Admin <strong>${adminName}</strong>.</p>
          <p style="font-size: 15px; color: #555; line-height: 1.5;">Please log in to your dashboard and open the <strong>Outreach Followups</strong> page to start contacting your assigned participants.</p>
          <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e7c57b; font-size: 13px; color: #7f3f1f; font-weight: bold;">
            Srijan Youth Festival Team
          </div>
        </div>
      `,
    });
    console.log("Outreach followup assignment email sent to:", email);
  } catch (err) {
    console.error("Failed to send outreach followup email to", email, err);
  }
}
