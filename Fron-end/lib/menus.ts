export type SubChildren = {
  href: string;
  label: string;
  active: boolean;
  children?: SubChildren[];
};

export type Submenu = {
  href: string;
  label: string;
  active: boolean;
  icon: string;
  submenus?: Submenu[];
  children?: SubChildren[];
};

export type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: string;
  submenus: Submenu[];
  id: string;
};

export type Group = {
  groupLabel: string;
  menus: Menu[];
  id: string;
};

export function getMenuList(pathname: string, _translate: (key: string) => string): Group[] {
  return [{
    groupLabel: "Clínica",
    id: "clinic",
    menus: [{
      id: "clinic",
      href: "/dashboard/clinic",
      label: "Panel clínico",
      active: pathname.includes("/dashboard/clinic"),
      icon: "heroicons:heart",
      submenus: [{
        href: "/dashboard/clinic",
        label: "Pacientes, citas y farmacia",
        active: pathname === "/dashboard/clinic",
        icon: "heroicons:heart",
        children: [],
      }],
    }],
  }];
}

export function getHorizontalMenuList(pathname: string, translate: (key: string) => string): Group[] {
  return getMenuList(pathname, translate);
}
