# AsrtoPay — בריף מוצר ועיצוב (Design Brief)

> **מטרת המסמך:** להעביר ל-Claude (או לכל מעצב/AI עיצוב) תמונה מלאה של המערכת הקיימת — מטרות, מסכים, זרימות, שפה ויזואלית ואילוצים — כדי לקבל הצעת עיצוב חדשה שאפשר ליישם ב-Next.js + Tailwind.

---

## 1. סיכום מנהלים

**AsrtoPay** (בקוד: `asrtopay`, בממשק גם **Astro Project**) היא **מערכת ניהול פנימית** לצוות קטן (2 משתמשים מזוהים: אדיר, איתי). היא מרכזת:

| תחום | מה המערכת עושה |
|------|----------------|
| **גבייה ידנית** | מעקב חובות, תשלומים וחיובים ללקוחות |
| **PayPlus** | סנכרון והצגת **הוראות קבע** (recurring), היסטוריית חיובים, כשלונות |
| **לקוחות / פרויקטים** | ישות אחת (`credential_clients`) — "לקוח" = יש גבייה; "פרויקט" = ללא סכום גבייה |
| **פרטי התחברות** | סיסמאות וגישות לפלטפורמות, מאורגנות ב**טבלאות** (Supabase, Vercel, GitHub…) |
| **משימות** | משימות + תת-משימות, קישור ללקוח/פרויקט, הקצאה לצוות |

**אינטגרציות:** Supabase (DB + Auth), PayPlus API (Edge Function לסנכרון).

**פלטפורמה:** Web App + **PWA** (התקנה על שולחן עבודה, באנר התקנה).

---

## 2. קהל ושימוש

- **משתמשים:** צוות פנימי בלבד (לא SaaS ציבורי).
- **שפה:** **עברית בלבד** בממשק.
- **כיוון:** **RTL** (`dir="rtl"`, `lang="he"`).
- **מכשירים:** Desktop ראשי; חובה **רספונסיבי** — סיידבר הופך ל-drawer במובייל.
- **זמן:** תאריכים ומטבע לפי **he-IL**, מטבע ברירת מחדל **₪ (ILS)**.

---

## 3. מבנה אפליקציה (מסכים וניווט)

### 3.1 התחברות (ללא סיידבר)

| נתיב | תיאור |
|------|--------|
| `/login` | מסך התחברות Supabase (אימייל/סיסמה). לוגו Astro, כרטיס לבן על רקע gradient כהה. |

### 3.2 אזור מוגן (App Shell)

**Layout:** סיידבר קבוע (Desktop) + אזור תוכן. רקע תוכן אפור בהיר (`slate-100`). רוחב תוכן מוגבל `max-w-7xl`, **מלבד** מסכים "רחבים": credentials, env, עמוד לקוח בודד.

**סיידבר (ניווט ראשי):**

| נתיב | שם בתפריט | תפקיד |
|------|-----------|--------|
| `/` | דשבורד | סקירה: גבייה, KPI, משימות פתוחות, תובנות, רשימות |
| `/payplus` | PayPlus | הוראות קבע, סנכרון, explorer מפורט |
| `/customers` | לקוחות | טבלת לקוחות עם גבייה |
| `/projects` | פרויקטים | אותה טבלה, מצב "פרויקטים" (ללא גבייה) |
| `/collections` | גבייה | מוקד תשלומים ויתרות |
| `/tasks` | משימות | ניהול משימות מלא |
| `/credentials` | פרטי התחברות | בית טבלאות credentials |
| `/credentials/[tableId]` | (פנימי) | טבלת credentials ספציפית — עריכה inline/מודלים |
| `/env` | (לא בתפריט) | טבלת ENV ייעודית — רוחב מלא |
| `/customers/[id]` | (פנימי) | **עמוד לקוח/פרויקט** — הכי עשיר במידע |

**פעולות גלובליות בסיידבר:** התנתקות. פוטר קטן: "PayPlus · Supabase".

---

## 4. תיאור מסכים (UI + פונקציה)

### 4.1 דשבורד (`/`)

**Hero gradient** (כחול→אינדיגו→slate): ברכה לפי שעה + שם משתמש, תאריך בעברית, שלושה מספרים (שולם / נותר / הכנסה חודשית PayPlus), **פס התקדמות גבייה** (אחוז + gradient ירוק).

**4 כרטיסי KPI** (קישורים): לקוחות עם גבייה, פרויקטים, לא שילמו, רשומות התחברות — כל אחד עם אייקון וצבע accent (blue/violet/red/emerald/amber).

**משימות פתוחות:** ווidget מקוצר — משימות של המשתמש המחובר, סימון done, יצירה מהירה.

**תובנות:** כרטיסים עם tone: positive / warning / info.

**שני פאנלים:** "חייבים מובילים" (progress bar לכל שורה), "תשלומים אחרונים" (אייקון ירוק + סכום).

### 4.2 PayPlus (`/payplus`)

- **PageHero** accent **violet**: הכנסה חודשית, נגבה החודש, progress "הוראות קבע פעילות", כפתור **סנכרון**.
- **8 StatCards** (2 שורות): ספירות, הצלחות/כשלונות, סכומים, קישור ללקוח, ממתין.
- **התראות כשלון** — באנר אדום עם רשימה.
- **Explorer:** חיפוש, פילטר (all / failed / pending), רשימת כרטיסים expandable לכל הוראת קבע — לוח זמנים, סטטוס חודש נוכחי, היסטוריית חיובים, קישור ללקוח אם מקושר.

### 4.3 לקוחות / פרויקטים (`/customers`, `/projects`)

- **PageHero** + מטריקות (ספירות).
- **חיפוש** + כפתור **לקוח/פרויקט חדש**.
- **טבלה** (responsive — גלילה אופקית במובייל):

**מצב לקוחות — עמודות:** לקוח, פרטי קשר, סטטוס (פעיל/לא פעיל/ליד), מספר credentials, **גבייה** (badge + סכומים), תפריט פעולות (עריכה, מחיקה, מעבר לעמוד).

**מצב פרויקטים — בלי עמודת גבייה.**

- **מודל:** טופס לקוח (שם, אימייל, טלפון, חברה, סטטוס, הערות, סכום לגבייה + מטבע).

### 4.4 גבייה (`/collections`)

- Hero עם סיכום: סה״כ לגבייה, שולם, נותר, אחוז.
- חיפוש + **מיון** (סטטוס, יתרה, שם…).
- טבלה: לקוח, סטטוס גבייה, סכומים, כפתור **רישום תשלום**.
- **מודל תשלום:** סכום, מטבע, תאריך, אמצעי, הערה, אופציונלי קישור ל-charge.

**סטטוסי גבייה (badges):**

| ערך | תווית | צבע (נוכחי) |
|-----|--------|-------------|
| unpaid | לא שולם | אדום |
| partial | שולם חלקית | ענבר |
| paid | שולם במלואו | ירוק |
| overpaid | שולם בעודף | כחול |
| no_due | אין חוב פתוח | אפור |

### 4.5 משימות (`/tasks`)

- Hero + ספירות.
- **פילטרים:** קטגוריה (לקוח / פרויקט / אחר), סטטוס (פתוח / הושלם), מוקצה (אדיר / איתי / הכל), חיפוש.
- רשימת משימות expandable: checkbox סטטוס, badge קטגוריה, תאריך יעד, קישור ללקוח, **תת-משימות** (inline add/edit/check).
- מודל יצירה/עריכה: כותרת, תיאור, קטגוריה, לקוח/פרויקט או context_label, מוקצה, due date.

### 4.6 פרטי התחברות

**בית (`/credentials`):**

- Hero accent slate + מטריקות (טבלאות / רשומות) + **+ טבלה חדשה**.
- רשימה מקובצת לפי **עדכניות** (היום / השבוע / ישנות יותר) — כרטיס לכל טבלה עם אייקון צבעוני, מספר רשומות, תפריט (שינוי שם, מחיקה).
- חיפוש בטבלאות.

**טבלה (`/credentials/[tableId]`):**

- טבלה רחבה: שם לקוח, טבלה, אימייל, משתמש, **סיסמה** (הצגה/העתקה), אתר, הערות, פעולות.
- הוספה/עריכה במודל — בחירת לקוח קיים או שם חדש, פלטפורמה, שדות login.
- **Badges פלטפורמה** (Supabase ירוק, Vercel שחור, GitHub אפור, Cloudflare כתום, env ירוק, default כחול).

**ENV (`/env`):** ממשק דומה לטבלת credentials — טבלה מיוחדת לערכי ENV, לא מופיעה בסיידבר (גישה ישירה ל-URL).

### 4.7 עמוד לקוח (`/customers/[id]`)

**Hub מרכזי** — sections:

1. **כותרת / breadcrumb** חזרה לרשימה.
2. **פרופיל:** שם, חברה, קשר, סטטוס, הערות — עריכה במודל.
3. **גבייה** (אם לקוח billing): סיכום יתרה, badge סטטוס, progress; רשימת **charges** + **payments** (CRUD במודלים).
4. **PayPlus:** קישור/ניתוק `recurring_client` — combobox לבחירת הוראת קבע לא מקושרת.
5. **Credentials** של הלקוח — טבלה + הוספה/עריכה.
6. הודעות success/error.

---

## 5. מודל נתונים (לוגיקה שמשפיעה על UI)

```
credential_clients (Customer)
├── client_credentials (0..n) — table_id, platform, passwords…
├── customer_charges (0..n) — אם יש → totalDue = sum(charges)
├── customer_payments (0..n) — totalPaid, charge_id אופציונלי
├── recurring_clients (0..1 linked) — PayPlus recurring
└── tasks (0..n)

credential_tables
└── client_credentials (many)

tasks
└── task_subtasks (many)
```

**הבחנה UI:**

- **לקוח (billing):** `totalDue > 0` (מ-charges או מ-`total_amount_due` בשדה לקוח).
- **פרויקט:** אין חוב — אותם שדות DB, תצוגה שונה.

---

## 6. שפה ויזואלית נוכחית (Design Tokens)

### 6.1 CSS Variables (`globals.css`)

| Token | ערך | שימוש |
|-------|-----|--------|
| `--background` | `#f4f6fb` | רקע גלובלי (body) |
| `--foreground` | `#0f172a` | טקסט ראשי |
| `--sidebar` | `#0b1220` | סיידבר + theme PWA |
| `--surface` | `#ffffff` | כרטיסים |
| `--surface-muted` | `#f8fafc` | שדות/chips |
| `--accent` | `#3b82f6` | כחול primary |
| `--accent-soft` | `#dbeafe` | highlight |

### 6.2 טיפוגרafia

- **גופן:** Heebo (Google Font), weights 300–800.
- **כותרות Hero:** `text-2xl` → `text-3xl`, bold.
- **מספרים KPI:** `text-3xl` bold, tracking-tight.
- **תוויות משנה:** `text-xs` / `text-[11px]`, slate-400/500.

### 6.3 צבעים ודפוסים חוזרים

- **סיידבר:** `slate-950`, border `slate-800`, פריט פעיל — `border-s-2 border-blue-500`, רקע `slate-800`.
- **Hero sections:** `rounded-3xl`, gradient `bg-gradient-to-l` (RTL-aware), blur orbs, `shadow-lg`.
- **Accents לפי מסך:** blue (דשבורד/לקוחות), emerald (גבייה), violet (PayPlus/פרויקטים), slate (credentials).
- **כרטיסים:** `rounded-2xl` / `rounded-3xl`, `border-slate-200/80`, `shadow-sm`, hover lift על KPI.
- **Progress bars:** track `bg-white/15` או `bg-slate-100`, fill gradient emerald.
- **שגיאות:** amber border/bg להתראות טעינה; red להודעות פעולה / כשלונות PayPlus.
- **Selection:** `#bfdbfe` על `#0f172a`.

### 6.4 אייקונografia

- **SVG stroke inline** בקומפוננטות (לא ספריית icons).
- סגנון: `strokeWidth ~1.8`, `h-5 w-5` בניווט.

### 6.5 לוגו

- קבצים: `/assets/astro-logo-09.png` (סיידבר כהה), `astro-logo-11.png` (מובייל header + login).
- **Brand name במטא:** AsrtoPay; **Alt text:** Astro Project.

---

## 7. קומponנטות UI משותפות (לשמור על התנהגות)

| קומפוננטה | תפקיד |
|-----------|--------|
| `AppShell` | סיידבר + main + PWA banner |
| `AppSidebar` | ניווט + mobile drawer |
| `PageHero` | כותרת מסך, metrics, progress, children (כפתורים) |
| `StatCard` / `KpiCard` | מספר + label + hint |
| `TableRowActionsMenu` | תפריט ⋮ לשורות טבלה |
| `SearchableCombobox` | בחירה עם חיפוש |
| Modals | `CustomerFormModal`, `PaymentFormModal`, `ChargeFormModal`, `TaskFormModal`, `CreateTableModal`, credential modals — overlay + form |
| `NavigationProgress` | פס טעינה בין דפים |
| `InstallAppBanner` | fixed bottom, התקנת PWA |

**אין ספריית UI חיצונית** (לא shadcn/MUI) — הכל Tailwind utility classes.

---

## 8. מצבי מערכת

- **Loading:** `loading.tsx` ב-dashboard routes — skeleton פשוט / טקסט "טוען…".
- **Empty states:** טקסט מרכזי אפור בתוך פאנלים.
- **Errors:** באנר amber/red עם כותרת "לא ניתן לטעון נתונים".
- **Optimistic / busy:** disabled buttons, `busyIds` במשימות.

---

## 9. אבטחה ורגישות (משפיע על עיצוב)

- **Auth:** middleware — כל המסכים מלבד login דורשים session.
- **Credentials:** סיסמאות גלויות בטבלה (מערכת פנימית) — העיצוב צריך לאפשר **העתקה מהירה**, אולי hide/show — לא להסתיר לגמרי בלי UX ברור.
- **Logout** בולט בסיידבר.

---

## 10. מה אפשר / רצוי לשנות בעיצוב חדש

**מותר ומבורך:**

- זהות ויזואלית מלאה (פלטת צבעים, צורות, צללים, micro-interactions).
- ארגון מחדש של דשבורד ו-hierarchy.
- dark mode (כיום **light only** — `colorScheme: light`).
- אייקונים אחידים (Lucide/Heroicons) במקום SVG מפוזר.
- שיפור נגישות: contrast, focus rings, aria.
- עיצוב מודלים וטבלאות (density, sticky headers, mobile cards במקום טבלאות).

**לשמור (אילוצים קשיחים):**

- RTL + עברית.
- כל המסכים והזרימות ב§3–4 (לא למחוק יכולות).
- PWA + mobile sidebar.
- קישורים בין ישויות (לקוח ↔ PayPlus ↔ credentials ↔ משימות).
- Badges סטטוס עם משמעות צבע (גבייה, PayPlus failed, וכו') — אפשר לשנות גוונים, לא לבלבל משמעות.

---

## 11. בקשה ל-Claude — איך להשתמש במסמך

כשאתה מציע **עיצוב חדש**, אנא ספק:

1. **עקרונות עיצוב** (3–5 משפטים) + mood board מילולי.
2. **Design tokens מעודכנים** (צבעים, radius, spacing, typography scale).
3. **Wireframe / תיאור מפורט** לכל מסך ב§3 — Desktop + Mobile.
4. **סיידבר + Hero + טבלה + מודל** — דוגמאות ויזואליות (mockup, HTML/CSS, או Figma-style spec).
5. **מיפוי Tailwind:** אילו classes/utilities מומלצים (פרויקט Tailwind v4).
6. **רשימת שינויים מדורגים:** מה quick win vs refactor גדול.

אם מייצרים **HTML prototype**, השתמש ב-`dir="rtl"`, גופן Heebo, ודוגמאות טקסט **בעברית** (שמות לקוחות fictitious, סכומים ב-₪).

---

## 12. מילון מונחים (UI)

| עברית בממשק | English (פנימי) |
|-------------|-----------------|
| דשבורד | Dashboard |
| לקוחות | Billing customers |
| פרויקטים | Non-billing clients |
| גבייה | Collections / AR |
| פרטי התחברות | Credentials vault |
| הוראות קבע | PayPlus recurring |
| משימות / תת-משימה | Tasks / subtasks |
| התנתקות | Logout |

---

*גרסת מסמך: נגזרת מהקוד ב-repo AsrtoPay (Next.js 16, React 19, Tailwind 4). עדכן מסמך זה כשמוסיפים מסכים או מודולים.*
