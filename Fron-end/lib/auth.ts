import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";

type BackendLoginResponse = {
  access_token: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: { code: string; name: string };
  };
};

function isBackendLoginResponse(value: unknown): value is BackendLoginResponse {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Partial<BackendLoginResponse>;
  return typeof payload.access_token === "string"
    && typeof payload.expires_in === "number"
    && typeof payload.user?.id === "number"
    && typeof payload.user.email === "string"
    && typeof payload.user.fullName === "string"
    && typeof payload.user.role?.code === "string";
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  session: { strategy: "jwt", maxAge: 1800 },
  jwt: { maxAge: 1800 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (typeof credentials.email !== "string" || typeof credentials.password !== "string") return null;
        const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:3000";
        let response: Response;
        try {
          response = await fetch(`${backendUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
            cache: "no-store",
          });
        } catch {
          throw new Error("No fue posible conectar con el servidor de autenticación");
        }

        if (response.status === 401) return null;
        if (!response.ok) throw new Error("El servidor de autenticación no está disponible");
        const payload: unknown = await response.json();
        if (!isBackendLoginResponse(payload)) throw new Error("El servidor devolvió una respuesta de inicio de sesión inválida");

        cookies().set("clinic_access_token", payload.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/api/clinic",
          maxAge: payload.expires_in,
        });

        return {
          id: String(payload.user.id),
          name: payload.user.fullName,
          email: payload.user.email,
          role: payload.user.role.code,
          authExpiresAt: Date.now() + payload.expires_in * 1000,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as unknown as Record<string, unknown>;
        if (typeof authUser.role === "string") token.role = authUser.role;
        if (typeof authUser.authExpiresAt === "number") token.authExpiresAt = authUser.authExpiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      const sessionActive = typeof token.authExpiresAt === "number" && token.authExpiresAt > Date.now();
      session.user.id = sessionActive ? token.sub ?? "" : "";
      session.user.role = sessionActive && typeof token.role === "string" ? token.role : "";
      return session;
    },
  },
});
