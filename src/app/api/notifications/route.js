import { getNotifications, markAllRead } from "@/lib/notifications";
import { requireUser } from "@/lib/session";

// The bell: latest notifications and the unread count.
export async function GET() {
  const { userId, response } = await requireUser();
  if (response) return response;
  return Response.json(await getNotifications(userId));
}

// Opening the bell marks everything as read.
export async function POST() {
  const { userId, response } = await requireUser();
  if (response) return response;
  await markAllRead(userId);
  return Response.json({ ok: true });
}
