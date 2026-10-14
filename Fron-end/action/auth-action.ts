'use server'
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { cookies } from "next/headers";

export const loginUser = async (data: { email: string; password: string }, locale: string) => {
  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: `/${locale}/dashboard/clinic`,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Correo o contraseña incorrectos" };
    throw error;
  }
  return {};
};

export const logoutUser = async () => {
  cookies().set("clinic_access_token", "", { httpOnly: true, path: "/api/clinic", maxAge: 0 });
  await signOut();
};