"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_START_EVENT = "app-nav-start";

export function startNavigationProgress() {
  document.dispatchEvent(new Event(NAV_START_EVENT));
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function beginProgress() {
    clearTimers();
    setVisible(true);
    setProgress(18);
    timers.current.push(
      setTimeout(() => setProgress(52), 100),
      setTimeout(() => setProgress(78), 280),
    );
  }

  function finishProgress() {
    clearTimers();
    setProgress(100);
    timers.current.push(
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200),
    );
  }

  useEffect(() => {
    const onStart = () => beginProgress();
    document.addEventListener(NAV_START_EVENT, onStart);
    return () => document.removeEventListener(NAV_START_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (!visible) return;
    finishProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish when route settles
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent lg:start-64"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-l from-violet-500 to-blue-500 shadow-[0_0_8px_rgba(99,102,241,0.55)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
