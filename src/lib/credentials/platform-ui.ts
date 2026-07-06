export function getPlatformBadgeClass(platform: string) {
  const value = platform.toLowerCase();

  if (value.includes("supabase")) {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  }
  if (value.includes("vercel")) {
    return "bg-slate-900 text-white ring-1 ring-slate-700";
  }
  if (value.includes("netlify")) {
    return "bg-teal-50 text-teal-800 ring-1 ring-teal-100";
  }
  if (value.includes("github")) {
    return "bg-slate-100 text-slate-800 ring-1 ring-slate-200";
  }
  if (value.includes("cloudflare")) {
    return "bg-orange-50 text-orange-800 ring-1 ring-orange-100";
  }
  if (value === "env") {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  }

  return "bg-blue-50 text-blue-800 ring-1 ring-blue-100";
}
