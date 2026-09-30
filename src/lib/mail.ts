export type SubmissionNotice = {
  kind: string;
  name: string;
  email: string;
  message: string;
  projectType: string;
  preferredTime: string;
};

export async function sendSubmissionNotice(
  notice: SubmissionNotice,
): Promise<{ delivered: boolean }> {
  const driver = (process.env.RITZY_EMAIL_DRIVER || "off").trim();
  if (driver === "" || driver === "off") return { delivered: false };
  if (driver !== "webhook") {
    console.error("Email driver is not set up. The note was saved on the shop desk.");
    return { delivered: false };
  }
  const url = process.env.RITZY_EMAIL_WEBHOOK_URL?.trim();
  if (!url) {
    console.error("Email webhook URL is missing. The note was saved on the shop desk.");
    return { delivered: false };
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: process.env.RITZY_NOTIFY_EMAIL?.trim() ?? "",
        kind: notice.kind,
        name: notice.name,
        email: notice.email,
        message: notice.message,
        projectType: notice.projectType,
        preferredTime: notice.preferredTime,
      }),
    });
    if (!response.ok) {
      console.error("Email webhook did not accept the note. The note was saved on the shop desk.");
      return { delivered: false };
    }
    return { delivered: true };
  } catch {
    console.error("Email webhook failed. The note was saved on the shop desk.");
    return { delivered: false };
  }
}
