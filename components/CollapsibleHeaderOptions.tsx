"use client";

import { useEffect, useState, type ReactNode } from "react";

type CollapsibleHeaderOptionsProps = {
  children: ReactNode;
  mobileBreakpoint?: number;
};

export default function CollapsibleHeaderOptions({
  children,
  mobileBreakpoint = 900
}: CollapsibleHeaderOptionsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const syncViewport = () => {
      const mobile = window.innerWidth <= mobileBreakpoint;
      setIsMobile(mobile);
      setOpen(!mobile);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, [mobileBreakpoint]);

  if (!isMobile) {
    return <div className="header-options">{children}</div>;
  }

  return (
    <div className="header-options stack">
      <button
        type="button"
        className="secondary header-toggle-btn"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Hide Header Options" : "Show Header Options"}
      </button>
      <div className={`header-options-panel ${open ? "open" : ""}`}>{children}</div>
    </div>
  );
}
