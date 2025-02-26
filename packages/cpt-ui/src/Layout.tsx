import { Outlet } from "react-router";
import EpsHeader from "@/components/EpsHeader";
import RBACBanner from "@/components/RBACBanner";
import EpsFooter from "@/components/EpsFooter";

export default function Layout() {
  return (
    <>
      <EpsHeader />
      <Outlet />
      <RBACBanner />
      <EpsFooter />
    </>
  );
}
