import LayoutProvider from "@/providers/layout.provider";
import LayoutContentProvider from "@/providers/content.provider";
import DashCodeSidebar from '@/components/partials/sidebar'
import DashCodeHeader from '@/components/partials/header'
import { auth } from "@/lib/auth";
import { redirect } from "@/components/navigation";
const layout = async ({ children, params: { locale } }: { children: React.ReactNode; params: { locale: string } }) => {
    const session = await auth();

    if (!session?.user.id) {
        redirect({ href: '/', locale })
    }
    return (
        <LayoutProvider >
            <DashCodeHeader />
            <DashCodeSidebar />
            <LayoutContentProvider>
                {children}
            </LayoutContentProvider>
        </LayoutProvider>
    )


};

export default layout;
