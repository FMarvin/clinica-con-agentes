import React from 'react'
import HeaderContent from './header-content'
import ProfileInfo from './profile-info'
import ThemeSwitcher from './theme-switcher'
import { SidebarToggle } from '@/components/partials/sidebar/sidebar-toggle'
import { SheetMenu } from '@/components/partials/sidebar/menu/sheet-menu'
import HeaderLogo from "./header-logo"


const DashCodeHeader = async () => {
    return (
        <>
            <HeaderContent>
                <div className=' flex gap-3 items-center'>
                    <HeaderLogo />
                    <SidebarToggle />
                </div>
                <div className="nav-tools flex items-center  md:gap-4 gap-3">
                    <ThemeSwitcher />
                    <ProfileInfo />
                    <SheetMenu />
                </div>
            </HeaderContent>
        </>
    )
}

export default DashCodeHeader