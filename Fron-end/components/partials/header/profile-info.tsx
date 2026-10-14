
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon"
import { auth } from "@/lib/auth";
import { logoutUser } from "@/action/auth-action";

const ProfileInfo = async () => {
  const session = await auth();
  return (
    <div className="md:block hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild className=" cursor-pointer">
          <div className=" flex items-center gap-3  text-default-800 ">

            <div aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {session?.user?.name?.charAt(0) ?? "U"}
            </div>

            <div className="text-sm font-medium  capitalize lg:block hidden  ">
              {session?.user?.name}
            </div>
            <span className="text-base  me-2.5 lg:inline-block hidden">
              <Icon icon="heroicons-outline:chevron-down"></Icon>
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-0" align="end">
          <DropdownMenuLabel className="flex gap-2 items-center mb-1 p-3">

            <div aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {session?.user?.name?.charAt(0) ?? "U"}
            </div>

            <div>
              <div className="text-sm font-medium text-default-800 capitalize ">
                {session?.user?.name}
              </div>
              <p className="text-xs text-default-600">{session?.user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="flex items-center gap-2 text-sm font-medium text-default-600 capitalize my-1 px-3 cursor-pointer"
          >
            <div>
              <form
                action={async () => {
                  "use server";
                  await logoutUser();
                }}
              >
                <button type="submit" className=" w-full  flex  items-center gap-2" >
                  <Icon icon="heroicons:power" className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default ProfileInfo;
