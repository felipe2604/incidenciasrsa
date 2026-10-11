import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      idUsuario?: string;
      rol?: string;
      nombre?: string;
      ambitoBloques?: string;
      ambitoZonas?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idUsuario?: string;
    rol?: string;
    nombre?: string;
    ambitoBloques?: string;
    ambitoZonas?: string;
  }
}
