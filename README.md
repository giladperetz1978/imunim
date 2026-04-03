# Workout Web App - שלב 1

אפליקציית WEB לניהול תכנית אימונים עם ארכיטקטורה גמישה להמשך (שלב עתידי: עטיפה ל-APK אנדרואיד).

## מה קיים עכשיו

- שמירה מקומית אוטומטית ב-`localStorage`
- ניהול ימי אימון ותרגילים
- יצוא JSON לקובץ גיבוי
- פתיחת מייל מוכן לשליחה אחרי יצוא (עם הנחיה לצירוף הקובץ)
- יבוא JSON מקובץ (למשל קובץ שהגיע כ-attachment במייל)

## הרצה מקומית

```bash
npm install
npm run dev
```

ברירת המחדל של Vite: `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## מבנה נתונים (גרסה 1)

האפליקציה שומרת JSON עם `schemaVersion: 1` כדי לאפשר שדרוגי מבנה בעתיד.

דוגמה קצרה:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-04-02T10:00:00.000Z",
  "traineeName": "Gilad",
  "goal": "Muscle gain",
  "workoutDays": [
    {
      "id": "...",
      "name": "אימון A",
      "focus": "חזה + כתפיים + יד אחורית",
      "exercises": [
        {
          "id": "...",
          "name": "לחיצת חזה",
          "sets": "4",
          "reps": "8-10",
          "restSeconds": "90",
          "notes": ""
        }
      ]
    }
  ]
}
```

## הערה לגבי מייל

דפדפנים לא מאפשרים לצרף קובץ אוטומטית למייל דרך `mailto` באופן אמין.

לכן הזרימה היא:
1. לחיצה על `ייצוא למייל` מורידה קובץ JSON.
2. נפתח חלון מייל עם נושא/טקסט.
3. מצרפים ידנית את הקובץ שנשמר ושולחים.

## פריסה ל-GitHub Pages עם Actions

הריפו מיועד ל-`giladperetz1978/imunim`, ולכן הוגדר `base: '/imunim/'` בקונפיג של Vite.

ה-Workflow נמצא בקובץ `.github/workflows/deploy-pages.yml` ומבצע:
1. `npm ci`
2. `npm run build`
3. העלאת `dist` ל-GitHub Pages

מה צריך להגדיר פעם אחת ב-GitHub:
1. להיכנס ל-`Settings -> Pages`.
2. תחת `Build and deployment` לבחור `Source: GitHub Actions`.
3. לדחוף ל-`main`.

אחרי push ל-`main`, ה-site יעלה אוטומטית בכתובת:
`https://giladperetz1978.github.io/imunim/`
