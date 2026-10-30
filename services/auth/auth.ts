import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

import { PrismaClient } from "@/prisma/generated/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 30 * 60,
      strategy: "compact",
    },
  },
  plugins: [
    admin({
      defaultRole: "LEADER",
      adminRoles: ["ADMIN"],
      // Plugin memakai key role apa adanya (case-sensitive). Role aplikasi
      // memakai huruf besar, jadi daftarkan eksplisit.
      roles: {
        ADMIN: adminAc,
        DIREKTUR: userAc,
        LEADER: userAc,
      },
      defaultBanReason: "Akun dinonaktifkan oleh Admin",
    }),
    nextCookies(),
  ],
});
