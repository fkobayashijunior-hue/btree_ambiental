import { useState, useEffect } from "react";

const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show splash for 1.5 seconds then fade out
    const timer = setTimeout(() => setFadeOut(true), 1500);
    const finishTimer = setTimeout(() => onFinish(), 2000);
    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#0d4f2e] to-[#1a3a2a] transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo animada */}
      <div className="animate-[pulse_1.5s_ease-in-out_infinite]">
        <img
          src={BTREE_LOGO}
          alt="BTREE Ambiental"
          className="w-40 h-auto drop-shadow-2xl"
        />
      </div>

      {/* Texto */}
      <div className="mt-6 text-center">
        <h1 className="text-white text-2xl font-bold tracking-wide">
          BTREE Ambiental
        </h1>
        <p className="text-green-300/80 text-sm mt-1">
          Sistema de Gestão Florestal
        </p>
      </div>

      {/* Loading dots */}
      <div className="mt-10 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-[bounce_1s_ease-in-out_infinite]" />
        <div className="w-2 h-2 rounded-full bg-green-400 animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
        <div className="w-2 h-2 rounded-full bg-green-400 animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
}
