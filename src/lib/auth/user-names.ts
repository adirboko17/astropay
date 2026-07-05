const USER_NAMES: Record<string, string> = {
  "bokobzadir@gmail.com": "אדיר",
  "itaybenyair99@gmail.com": "איתי",
};

export type TaskAssignee = (typeof USER_NAMES)[keyof typeof USER_NAMES];

export function getUserDisplayName(email: string | undefined | null): string | null {
  if (!email) return null;
  return USER_NAMES[email.toLowerCase()] ?? null;
}

export function getUserAssignee(email: string | undefined | null): TaskAssignee | null {
  const name = getUserDisplayName(email);
  if (name === "אדיר" || name === "איתי") return name;
  return null;
}
