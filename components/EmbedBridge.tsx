"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// When framed by Pi Tiles (http://localhost:8080), tell it what is going on.
// The login page lives at "/", so being there means the user is signed out. Google
// refuses to render its sign-in inside a frame, so Pi Tiles offers "Open in browser".
const PI_TILES_ORIGIN = "http://localhost:8080";

export function EmbedBridge() {
  const path = usePathname();

  useEffect(() => {
    if (window.parent === window) return;
    const send = (type: string) =>
      window.parent.postMessage({ source: "pi-tiles", type }, PI_TILES_ORIGIN);

    send(path === "/" ? "auth-required" : "ready");

    let last = 0;
    const poke = () => {
      const now = Date.now();
      if (now - last > 1000) {
        last = now;
        send("interaction");
      }
    };
    addEventListener("pointerdown", poke, true);
    addEventListener("scroll", poke, true);
    return () => {
      removeEventListener("pointerdown", poke, true);
      removeEventListener("scroll", poke, true);
    };
  }, [path]);

  return null;
}
