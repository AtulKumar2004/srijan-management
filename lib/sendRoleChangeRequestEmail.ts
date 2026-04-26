import nodemailer from "nodemailer";

type RoleChangeEmailParams = {
  adminEmail: string;
  adminName: string;
  participantName: string;
  participantEmail?: string;
  participantPhone?: string;
  volunteerName: string;
  programName: string;
  requestId: string;
};

export async function sendRoleChangeRequestEmail(params: RoleChangeEmailParams) {
  const {
    adminEmail,
    adminName,
    participantName,
    participantEmail,
    participantPhone,
    volunteerName,
    programName,
    requestId,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewLink = `${appUrl}/notifications?requestId=${requestId}`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Srijan Youth Festival" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: "Approval Needed: Participant to Volunteer Request",
      text: `Hare Krishna ${adminName},\n\nA volunteer role-change request needs your approval.\n\nProgram: ${programName}\nParticipant: ${participantName}\nParticipant Email: ${participantEmail || "N/A"}\nParticipant Phone: ${participantPhone || "N/A"}\nRequested By: ${volunteerName}\n\nReview request: ${reviewLink}\n\nWith prayers,\nSrijan Youth Festival Team`,
      html: `
        <div style="margin:0;padding:0;background:#f6f7fb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #f0e0b6;border-radius:14px;overflow:hidden;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#f4d489,#efc26a);padding:22px 26px;border-bottom:1px solid #e7c57b;">
                      <div style="font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#7f3f1f;font-weight:700;">Srijan Youth Festival</div>
                      <div style="font-family:Verdana,Arial,sans-serif;font-size:13px;line-height:1.6;color:#7f3f1f;opacity:0.9;">Role Change Approval Request</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 26px 10px 26px;font-family:Verdana,Arial,sans-serif;color:#2f3441;">
                      <p style="margin:0 0 12px 0;font-size:17px;line-height:1.6;font-weight:600;color:#7f3f1f;">Hare Krishna ${adminName},</p>
                      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;">A volunteer has requested to promote a participant to volunteer. Your approval is required.</p>
                      <div style="margin:16px 0;padding:16px;background:#fff8e8;border:1px solid #efd7a1;border-radius:12px;">
                        <p style="margin:0 0 6px 0;font-size:14px;"><strong>Program:</strong> ${programName}</p>
                        <p style="margin:0 0 6px 0;font-size:14px;"><strong>Participant:</strong> ${participantName}</p>
                        <p style="margin:0 0 6px 0;font-size:14px;"><strong>Email:</strong> ${participantEmail || "N/A"}</p>
                        <p style="margin:0 0 6px 0;font-size:14px;"><strong>Phone:</strong> ${participantPhone || "N/A"}</p>
                        <p style="margin:0;font-size:14px;"><strong>Requested By:</strong> ${volunteerName}</p>
                      </div>
                      <div style="margin:20px 0 10px 0;text-align:center;">
                        <a href="${reviewLink}" style="display:inline-block;background:#a65353;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:10px;">Review Request in Notifications</a>
                      </div>
                      <p style="margin:12px 0 0 0;font-size:13px;line-height:1.7;color:#3e4654;">Please review and take action at your earliest convenience.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 26px 24px 26px;border-top:1px solid #f1f1f1;font-family:Verdana,Arial,sans-serif;">
                      <p style="margin:0;font-size:12px;line-height:1.7;color:#7f8491;">If this request was not expected, please contact the system administrator.</p>
                      <p style="margin:8px 0 0 0;font-size:12px;line-height:1.7;color:#7f8491;">With prayers,<br />Srijan Youth Festival Team</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    console.log("Role change request email sent:", info.messageId);
    return { ok: true };
  } catch (error: any) {
    console.error("ROLE CHANGE REQUEST EMAIL ERROR:", error.message || error);
    return { ok: false, error: error.message || "Failed to send request email" };
  }
}
