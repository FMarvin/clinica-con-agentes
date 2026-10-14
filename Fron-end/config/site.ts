export const siteConfig = {
  name: "Clínicas",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  ogImage: "/images/auth/ils1.svg",
  description: "Sistema clínico para la gestión de expedientes, citas, recetas y farmacia.",
  links: {
    twitter: "#",
    github: "#",
  },
}

export type SiteConfig = typeof siteConfig