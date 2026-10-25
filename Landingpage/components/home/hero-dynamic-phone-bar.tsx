"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";

interface CountryPhoneData {
  flag: string;
  displayNumber: string;
  telNumber: string;
}

const PHONE_MAP: Record<string, CountryPhoneData> = {
  US: {
    flag: "🇺🇸",
    displayNumber: "(804) 326-5442",
    telNumber: "+18043265442",
  },
  CA: {
    flag: "🇨🇦",
    displayNumber: "(437) 375-5674",
    telNumber: "+14373755674",
  },
  GB: {
    flag: "🇬🇧",
    displayNumber: "+44 1630 234331",
    telNumber: "+441630234331",
  },
};

export default function HeroDynamicPhoneBar() {
  const [phoneData, setPhoneData] = useState<CountryPhoneData>(PHONE_MAP.US);

  useEffect(() => {
    // Check cached session value first to avoid repeated fetches
    const cachedCountry = sessionStorage.getItem("xtreme_user_country");
    if (cachedCountry && PHONE_MAP[cachedCountry]) {
      setPhoneData(PHONE_MAP[cachedCountry]);
      return;
    }

    // Fast automatic IP geolocation
    const detectCountry = async () => {
      try {
        const res = await fetch("https://api.country.is/");
        if (!res.ok) throw new Error("Primary geo check failed");
        const data = await res.json();
        const code = (data.country || "").toUpperCase();

        if (code === "CA") {
          setPhoneData(PHONE_MAP.CA);
          sessionStorage.setItem("xtreme_user_country", "CA");
        } else if (code === "GB" || code === "UK") {
          setPhoneData(PHONE_MAP.GB);
          sessionStorage.setItem("xtreme_user_country", "GB");
        } else {
          setPhoneData(PHONE_MAP.US);
          sessionStorage.setItem("xtreme_user_country", "US");
        }
      } catch {
        // Fallback to secondary geo service
        try {
          const fallbackRes = await fetch("https://ipapi.co/country/");
          if (fallbackRes.ok) {
            const fallbackCode = (await fallbackRes.text()).trim().toUpperCase();
            if (fallbackCode === "CA") {
              setPhoneData(PHONE_MAP.CA);
              sessionStorage.setItem("xtreme_user_country", "CA");
            } else if (fallbackCode === "GB" || fallbackCode === "UK") {
              setPhoneData(PHONE_MAP.GB);
              sessionStorage.setItem("xtreme_user_country", "GB");
            }
          }
        } catch {
          // Defaults to US
        }
      }
    };

    detectCountry();
  }, []);

  return (
    <a
      href={`tel:${phoneData.telNumber}`}
      className="inline-flex items-center gap-2 px-3 py-1 mt-1 rounded-none border-0 text-white hover:text-[#DC2626] transition-colors active:scale-95 group cursor-pointer"
      title={`Call ${phoneData.displayNumber}`}
    >
      <Phone className="w-3.5 h-3.5 text-[#DC2626] animate-pulse shrink-0" />
      <span className="text-sm select-none shrink-0">{phoneData.flag}</span>
      <span className="text-sm sm:text-base font-semibold tracking-wide text-zinc-100 group-hover:text-white transition-colors">
        {phoneData.displayNumber}
      </span>
    </a>
  );
}
