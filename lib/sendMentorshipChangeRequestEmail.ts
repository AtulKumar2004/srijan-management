import nodemailer from "nodemailer";

type MentorshipChangeEmailParams = {
  adminEmail: string;
  adminName: string;
  participantName: string;
  participantEmail?: string;
  participantPhone?: string;
  volunteerName: string;
  programName: string;
  requestId: string;
};

export async function sendMentorshipChangeRequestEmail(params: MentorshipChangeEmailParams) {
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
      subject: "Approval Needed: Participant Mentor Assignment Request",
      text: `Hare Krishna ${adminName},\n\nA volunteer has requested to assign a participant to their mentorship.\n\nProgram: ${programName}\nParticipant: ${participantName}\nParticipant Email: ${participantEmail || "N/A"}\nParticipant Phone: ${participantPhone || "N/A"}\nRequested By: ${volunteerName}\n\nReview request: ${reviewLink}\n\nWith prayers,\nSrijan Youth Festival Team`,
      html: `
        <div style="margin:0;padding:0;background:#f6f7fb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #f0e0b6;border-radius:14px;overflow:hidden;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#f4d489,#efc26a);padding:22px 26px;border-bottom:1px solid #e7c57b;">
                      <div style="font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#7f3f1f;font-weight:700;">Srijan Youth Festival</div>
                      <div style="font-family:Verdana,Arial,sans-serif;font-size:13px;line-height:1.6;color:#7f3f1f;opacity:0.9;">Mentor Assignment Approval Request</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 26px 10px 26px;font-family:Verdana,Arial,sans-serif;color:#2f3441;">
                      <p style="margin:0 0 12px 0;font-size:17px;line-height:1.6;font-weight:600;color:#7f3f1f;">Hare Krishna ${adminName},</p>
                      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;">A volunteer has requested to assign an unassigned participant to their mentorship. Your approval is required.</p>
                      
                      <div style="background:#fcf9f2;border:1px solid #f3e5c8;border-radius:10px;padding:16px 18px;margin:18px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;color:#3f4452;">
                          <tr><td style="padding:4px 0;font-weight:700;color:#7f3f1f;width:130px;">Program:</td><td style="padding:4px 0;">${programName}</td></tr>
                          <tr><td style="padding:4px 0;font-weight:700;color:#7f3f1f;">Participant:</td><td style="padding:4px 0;">${participantName}</td></tr>
                          <tr><td style="padding:4px 0;font-weight:700;color:#7f3f1f;">Email:</td><td style="padding:4px 0;">${participantEmail || "N/A"}</td></tr>
                          <tr><td style="padding:4px 0;font-weight:700;color:#7f3f1f;">Phone:</td><td style="padding:4px 0;">${participantPhone || "N/A"}</td></tr>
                          <tr><td style="padding:4px 0;font-weight:700;color:#7f3f1f;">Requested By:</td><td style="padding:4px 0;">${volunteerName}</td></tr>
                        </table>
                      </div>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 10px 0;">
                        <tr>
                          <td align="center">
                            <a href="${reviewLink}" style="display:inline-block;background:#7f3f1f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">Review Approval Request</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 26px 26px 26px;font-family:Verdana,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6d7383;">
                      <p style="margin:0;">With prayers,<br><strong style="color:#7f3f1f;">Srijan Youth Festival Team</strong></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    return { ok: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("EMAIL_SEND_ERROR:", error);
    return { ok: false, error: error.message };
  }
}
