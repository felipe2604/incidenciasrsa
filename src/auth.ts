import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { buscarUsuarioPorEmail } from "./lib/usuarios";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Solo entra quien ya está dado de alta y activo en la hoja "Usuarios":
    // el login de Google por sí solo NO concede acceso a la aplicación.
    async signIn({ user }) {
      if (!user.email) return false;
      const usuario = await buscarUsuarioPorEmail(user.email);
      return !!(usuario && usuario.activo);
    },
    // Solo se relee la hoja en el momento del login (cuando "user" está
    // presente); el resto de peticiones ya revalidan permisos en el servidor
    // vía obtenerUsuarioActual(), así que no hace falta repetir aquí la lectura.
    async jwt({ token, user }) {
      if (user?.email) {
        const usuario = await buscarUsuarioPorEmail(user.email);
        if (usuario) {
          token.idUsuario = usuario.id_usuario;
          token.rol = usuario.rol;
          token.nombre = usuario.nombre;
          token.ambitoBloques = usuario.ambito_bloques;
          token.ambitoZonas = usuario.ambito_zonas;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.idUsuario = token.idUsuario;
        session.user.rol = token.rol;
        session.user.nombre = token.nombre;
        session.user.ambitoBloques = token.ambitoBloques;
        session.user.ambitoZonas = token.ambitoZonas;
      }
      return session;
    },
  },
};
