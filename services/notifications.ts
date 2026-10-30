import { prisma } from "@/services/prisma";
import type { Role } from "@/types/inventory";

type NotificationPayload = {
  subject: string;
  message: string;
  entity?: string;
  entityId?: string;
};

const EVO_URL = process.env.NEXT_PUBLIC_EVO_URL;
const EVO_KEY = process.env.NEXT_PUBLIC_EVO_APIKEY;
const EVO_INSTANCE = process.env.NEXT_PUBLIC_EVO_INSTANCE;

/** 0812… / 812… → 62812…; anything already international is kept. */
export function normalizePhone(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

async function sendEvolution(phone: string, text: string) {
  if (!EVO_URL || !EVO_KEY || !EVO_INSTANCE) {
    throw new Error("WhatsApp gateway belum dikonfigurasi.");
  }
  const response = await fetch(
    `${EVO_URL.replace(/\/$/, "")}/message/sendText/${EVO_INSTANCE}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number: phone, text }),
      signal: AbortSignal.timeout(6000),
    },
  );
  if (!response.ok) {
    throw new Error(`Gateway WhatsApp menolak pesan (${response.status}).`);
  }
}

async function deliver(
  target: { id?: string; name: string; phone: string | null; role?: string },
  payload: NotificationPayload,
) {
  const phone = normalizePhone(target.phone);
  let status = "SKIPPED";
  let error: string | null = phone ? null : "Nomor WhatsApp belum diisi.";

  if (phone) {
    try {
      await sendEvolution(phone, payload.message);
      status = "SENT";
    } catch (cause) {
      status = "FAILED";
      error = cause instanceof Error ? cause.message : "Pengiriman gagal.";
    }
  }

  await prisma.notification
    .create({
      data: {
        target: phone ?? "—",
        targetName: target.name,
        role: target.role ?? null,
        subject: payload.subject,
        message: payload.message,
        status,
        error,
        entity: payload.entity ?? null,
        entityId: payload.entityId ?? null,
      },
    })
    .catch(() => undefined);
}

/**
 * Notifikasi tidak pernah melempar: approval/stok tetap jalan walau gateway mati.
 * Panggil setelah transaksi DB supaya kegagalan WA tidak membatalkan data.
 */
export async function notifyRoles(
  roles: Role[],
  payload: NotificationPayload,
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, banned: { not: true } },
    select: { id: true, name: true, phone: true, role: true },
  });
  await Promise.all(users.map((user) => deliver(user, payload)));
}

export async function notifyUser(
  userId: string,
  payload: NotificationPayload,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, role: true },
  });
  if (user) await deliver(user, payload);
}
