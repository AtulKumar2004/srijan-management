import axios from "axios";

export async function sendSmsOtp(phone: string, code: string) {
  console.log("== MSG91 OTP SEND START ==");
  console.log("Phone:", phone);
  console.log("OTP:", code);

  const url = "https://control.msg91.com/api/v5/otp";
  const payload = { mobile: phone, otp: code };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        authkey: process.env.MSG91_AUTH_KEY!,
        "Content-Type": "application/json",
      },
    });

    console.log("MSG91 Response:", res.data);
    console.log("== MSG91 OTP SEND END ==");
    return { ok: true, data: res.data };

  } catch (err: any) {
    console.log("== MSG91 OTP ERROR ==");
    console.log(err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}
