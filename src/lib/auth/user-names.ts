const USER_NAMES: Record<string, string> = {
  "bokobzadir@gmail.com": "אדיר",
  "itaybenyair99@gmail.com": "איתי",
};

export function getUserDisplayName(email: string | undefined | null): string | null {
  if (!email) return null;
  return USER_NAMES[email.toLowerCase()] ?? null;
}
