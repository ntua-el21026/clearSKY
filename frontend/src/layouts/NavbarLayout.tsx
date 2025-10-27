import React from "react";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

const NavbarLayout = (): React.ReactElement => {
  return (
    <>
      <Navbar />
      <div className="p-6">
        <Outlet /> {/* This is where your Dashboard should appear */}
      </div>
    </>
  );
};

export default NavbarLayout;
