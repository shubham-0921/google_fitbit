"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// When framed by Pi Tiles, tell it what is going on.
// The login page lives at "/", so being there means the user is signed out. Google
// refuses to render its sign-in inside a frame, so Pi Tiles offers "Open in browser".
// Local dev server and the Vercel deployment. postMessage drops a message whose targetOrigin
// doesn't match the parent, so sending to each allowed origin only ever reaches the real one.
const PI_TILES_ORIGINS = ["http://localhost:8080", "https://pitiles.vercel.app"];

export function EmbedBridge() {
  const path = usePathname();

  useEffect(() => {
    if (window.parent === window) return;
    const send = (type: string) => {
      for (const origin of PI_TILES_ORIGINS) {
        window.parent.postMessage({ source: "pi-tiles", type }, origin);
      }
    };

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
