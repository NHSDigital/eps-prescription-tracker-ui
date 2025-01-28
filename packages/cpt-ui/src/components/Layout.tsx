import { Outlet } from "react-router-dom";
import EpsHeader from "./EpsHeader";
import EpsFooter from "./EpsFooter";

export default function Layout() {
  return (
    <>
      <EpsHeader />
      <Outlet />
      <EpsFooter />
    </>
  );
}
