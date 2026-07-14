"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";

export default function StyleCompatibilityPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/experience"); }, [router]);
  return <MobileShell><div className="page no-dock"><div className="loader-wrap"><div><div className="loader"/><p>正在返回体验问题……</p></div></div></div></MobileShell>;
}
