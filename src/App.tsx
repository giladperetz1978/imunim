import { useEffect, useMemo, useRef, useState } from 'react'
import runningIcon from './assets/running.gif'
import chestIcon from './assets/chest.gif'
import absIcon from './assets/abs.gif'
import legsIcon from './assets/legs.gif'
import beforeAfterImage from './assets/before after.jpg'
import type { ChangeEvent } from 'react'
import './App.css'

type WorkoutTab = 'running' | 'chest' | 'abs' | 'legs'

type StrengthBlock = {
  reps: [string, string, string]
  setDone: [boolean, boolean, boolean]
  weight: string
}

type WorkoutDay = {
  id: string
  date: string
  runningCalories: string
  runningDone: boolean
  chest: StrengthBlock
  abs: StrengthBlock
  legs: StrengthBlock
  completed: boolean
}

type WeeklyPhoto = {
  id: string
  date: string
  imageDataUrl: string
}

type WorkoutProgram = {
  schemaVersion: 2
  updatedAt: string
  traineeName: string
  goal: string
  workoutDays: WorkoutDay[]
  weeklyPhotos: WeeklyPhoto[]
}

const STORAGE_KEY = 'workout-program-v2'

const createId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10))

const todayString = () => new Date().toISOString().slice(0, 10)

const createStrengthBlock = (): StrengthBlock => ({
  reps: ['10', '10', '10'],
  setDone: [false, false, false],
  weight: '20',
})

const createDay = (): WorkoutDay => ({
  id: createId(),
  date: todayString(),
  runningCalories: '',
  runningDone: false,
  chest: createStrengthBlock(),
  abs: createStrengthBlock(),
  legs: createStrengthBlock(),
  completed: false,
})

const createDefaultProgram = (): WorkoutProgram => ({
  schemaVersion: 2,
  updatedAt: new Date().toISOString(),
  traineeName: '',
  goal: '',
  workoutDays: [createDay()],
  weeklyPhotos: [],
})

const isValidProgram = (value: unknown): value is WorkoutProgram => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<WorkoutProgram>
  return (
    data.schemaVersion === 2 &&
    typeof data.updatedAt === 'string' &&
    typeof data.traineeName === 'string' &&
    typeof data.goal === 'string' &&
    Array.isArray(data.workoutDays) &&
    Array.isArray(data.weeklyPhotos)
  )
}

const sumStrengthCalories = (block: StrengthBlock, factor: number) => {
  const weight = Number(block.weight) || 0
  const repsTotal = block.reps.reduce((sum, rep, index) => {
    if (!block.setDone[index]) {
      return sum
    }
    return sum + (Number(rep) || 0)
  }, 0)

  return Math.round(repsTotal * weight * factor)
}

const getDayCalories = (day: WorkoutDay) => {
  const running = day.runningDone ? Number(day.runningCalories) || 0 : 0
  const chest = sumStrengthCalories(day.chest, 0.08)
  const abs = sumStrengthCalories(day.abs, 0.055)
  const legs = sumStrengthCalories(day.legs, 0.09)
  return running + chest + abs + legs
}

const getCoachMessage = (day: WorkoutDay) => {
  const calories = getDayCalories(day)
  if (calories >= 700) {
    return 'ביצוע מעולה, עצימות גבוהה מאוד. מחר מומלץ התאוששות חכמה.'
  }
  if (calories >= 450) {
    return 'אימון חזק ומאוזן. אתה מתקדם יפה ושומר על קצב מצוין.'
  }
  if (calories >= 250) {
    return 'עבודה טובה. באימון הבא נסה להעלות מעט עומס או קצב.'
  }
  return 'התחלה טובה. כדי לראות קפיצה משמעותית, כדאי להשלים עוד סטים או עצימות.'
}

function App() {
  const [program, setProgram] = useState<WorkoutProgram>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return createDefaultProgram()
      }

      const parsed = JSON.parse(raw) as unknown
      if (isValidProgram(parsed)) {
        return parsed
      }
    } catch {
      // Fall back to default state.
    }

    return createDefaultProgram()
  })

  const [selectedDayId, setSelectedDayId] = useState<string>(() =>
    program.workoutDays[0]?.id ?? '',
  )
  const [activeTab, setActiveTab] = useState<WorkoutTab>('running')
  const [importMessage, setImportMessage] = useState('')
  const [compareBeforeId, setCompareBeforeId] = useState('')
  const [compareAfterId, setCompareAfterId] = useState('')
  const jsonInputRef = useRef<HTMLInputElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingPhotoDate, setPendingPhotoDate] = useState(todayString())

  const selectedDay = useMemo(
    () => program.workoutDays.find((day) => day.id === selectedDayId),
    [program.workoutDays, selectedDayId],
  )

  const monthlyCalories = useMemo(() => {
    const bucket = new Map<string, number>()
    for (const day of program.workoutDays) {
      const month = day.date.slice(0, 7)
      bucket.set(month, (bucket.get(month) ?? 0) + getDayCalories(day))
    }

    return Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, calories]) => ({ month, calories }))
  }, [program.workoutDays])

  const compareBefore = useMemo(
    () => program.weeklyPhotos.find((photo) => photo.id === compareBeforeId),
    [compareBeforeId, program.weeklyPhotos],
  )

  const compareAfter = useMemo(
    () => program.weeklyPhotos.find((photo) => photo.id === compareAfterId),
    [compareAfterId, program.weeklyPhotos],
  )

  useEffect(() => {
    if (!selectedDay && program.workoutDays.length > 0) {
      setSelectedDayId(program.workoutDays[0].id)
    }
  }, [program.workoutDays, selectedDay])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...program, updatedAt: new Date().toISOString() }, null, 2),
    )
  }, [program])

  const updateProgram = (updater: (prev: WorkoutProgram) => WorkoutProgram) => {
    setProgram((prev) => {
      const next = updater(prev)
      return { ...next, updatedAt: new Date().toISOString() }
    })
  }

  const updateDay = (dayId: string, updater: (day: WorkoutDay) => WorkoutDay) => {
    updateProgram((prev) => ({
      ...prev,
      workoutDays: prev.workoutDays.map((day) =>
        day.id === dayId ? updater(day) : day,
      ),
    }))
  }

  const addWorkoutDay = () => {
    const newDay = createDay()
    updateProgram((prev) => ({
      ...prev,
      workoutDays: [...prev.workoutDays, newDay],
    }))
    setSelectedDayId(newDay.id)
  }

  const removeWorkoutDay = (dayId: string) => {
    updateProgram((prev) => ({
      ...prev,
      workoutDays: prev.workoutDays.filter((day) => day.id !== dayId),
    }))

    if (selectedDayId === dayId) {
      const next = program.workoutDays.find((day) => day.id !== dayId)
      setSelectedDayId(next?.id ?? '')
    }
  }

  const updateStrengthSet = (
    type: 'chest' | 'abs' | 'legs',
    setIndex: number,
    value: string,
  ) => {
    if (!selectedDay) {
      return
    }

    updateDay(selectedDay.id, (day) => {
      const block = day[type]
      const reps = [...block.reps] as [string, string, string]
      reps[setIndex] = value
      return { ...day, [type]: { ...block, reps } }
    })
  }

  const toggleStrengthSetDone = (type: 'chest' | 'abs' | 'legs', setIndex: number) => {
    if (!selectedDay) {
      return
    }

    updateDay(selectedDay.id, (day) => {
      const block = day[type]
      const setDone = [...block.setDone] as [boolean, boolean, boolean]
      setDone[setIndex] = !setDone[setIndex]
      return { ...day, [type]: { ...block, setDone } }
    })
  }

  const downloadJsonBackup = () => {
    const json = JSON.stringify(program, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `workout-plan-${todayString()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportByEmail = () => {
    downloadJsonBackup()
    const subject = encodeURIComponent('Workout Plan Backup JSON')
    const body = encodeURIComponent(
      'קובץ הגיבוי ירד למחשב. יש לצרף אותו למייל ולשלוח.',
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const importFromJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const data = JSON.parse(text) as unknown
      if (!isValidProgram(data)) {
        setImportMessage('הקובץ לא במבנה נתונים תקין לגרסה הנוכחית.')
        return
      }

      setProgram({ ...data, updatedAt: new Date().toISOString() })
      setSelectedDayId(data.workoutDays[0]?.id ?? '')
      setImportMessage('הייבוא הצליח והנתונים נטענו.')
    } catch {
      setImportMessage('שגיאה בקריאת JSON. בדוק שהקובץ תקין.')
    } finally {
      event.target.value = ''
    }
  }

  const addWeeklyPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        return
      }

      updateProgram((prev) => ({
        ...prev,
        weeklyPhotos: [
          ...prev.weeklyPhotos,
          {
            id: createId(),
            date: pendingPhotoDate,
            imageDataUrl: result,
          },
        ].sort((a, b) => a.date.localeCompare(b.date)),
      }))

      event.target.value = ''
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <p className="eyebrow">COACH MODE</p>
        <h1>לוח אימונים אינטראקטיבי</h1>
        <p className="subtitle">
          בחר יום, מלא פעילות בטאבים המאוירים, וקבל סיכום קלוריות יומי וחודשי.
        </p>
      </header>

      <section className="panel profile-panel">
        <div className="grid two-columns">
          <label>
            שם מתאמן
            <input
              value={program.traineeName}
              onChange={(event) =>
                updateProgram((prev) => ({ ...prev, traineeName: event.target.value }))
              }
              placeholder="לדוגמה: גלעד"
            />
          </label>
          <label>
            מטרת תכנית
            <input
              value={program.goal}
              onChange={(event) =>
                updateProgram((prev) => ({ ...prev, goal: event.target.value }))
              }
              placeholder="לדוגמה: חיטוב"
            />
          </label>
        </div>

        <div className="actions">
          <button onClick={downloadJsonBackup}>יצוא JSON</button>
          <button onClick={exportByEmail}>ייצוא למייל</button>
          <button onClick={() => jsonInputRef.current?.click()}>ייבוא JSON</button>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json"
            onChange={importFromJson}
            hidden
          />
        </div>

        <p className="meta">עדכון אחרון: {new Date(program.updatedAt).toLocaleString()}</p>
        {importMessage && <p className="import-message">{importMessage}</p>}
      </section>

      <main className="workspace-grid">
        <aside className="panel days-panel">
          <div className="panel-head">
            <h2>ימים</h2>
            <button onClick={addWorkoutDay}>הוסף יום</button>
          </div>

          <ul className="days-list">
            {program.workoutDays.map((day) => (
              <li key={day.id}>
                <button
                  className={`day-chip ${selectedDayId === day.id ? 'active' : ''}`}
                  onClick={() => setSelectedDayId(day.id)}
                >
                  <span>{new Date(day.date).toLocaleDateString('he-IL')}</span>
                  <small>{getDayCalories(day)} קק"ל</small>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="panel editor-panel">
          {selectedDay ? (
            <>
              <div className="panel-head">
                <h2>אימון יומי</h2>
                <div className="inline-actions">
                  <button
                    className={`completion-btn ${selectedDay.completed ? 'active' : ''}`}
                    onClick={() =>
                      updateDay(selectedDay.id, (day) => ({
                        ...day,
                        completed: !day.completed,
                      }))
                    }
                  >
                    {selectedDay.completed ? 'היום הושלם ✓' : 'סימון סיום יום'}
                  </button>
                  <button
                    className="danger"
                    disabled={program.workoutDays.length <= 1}
                    onClick={() => removeWorkoutDay(selectedDay.id)}
                  >
                    מחיקת יום
                  </button>
                </div>
              </div>

              <div className="grid two-columns">
                <label>
                  תאריך יום
                  <input
                    type="date"
                    value={selectedDay.date}
                    onChange={(event) =>
                      updateDay(selectedDay.id, (day) => ({
                        ...day,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="day-total-card">
                  <small>סה"כ קלוריות ליום</small>
                  <strong>{getDayCalories(selectedDay)}</strong>
                </div>
              </div>

              <section className="tabs-wrap">
                <div className="tabs-row">
                  <button
                    className={`tab-card ${activeTab === 'running' ? 'selected' : ''}`}
                    onClick={() => setActiveTab('running')}
                  >
                    <img src={runningIcon} className="tab-icon-gif" alt="Running" />
                    ריצה
                  </button>

                  <button
                    className={`tab-card ${activeTab === 'chest' ? 'selected' : ''}`}
                    onClick={() => setActiveTab('chest')}
                  >
                    <img src={chestIcon} className="tab-icon-gif" alt="Chest" />
                    חזה
                  </button>

                  <button
                    className={`tab-card ${activeTab === 'abs' ? 'selected' : ''}`}
                    onClick={() => setActiveTab('abs')}
                  >
                    <img src={absIcon} className="tab-icon-gif" alt="Abs" />
                    בטן
                  </button>

                  <button
                    className={`tab-card ${activeTab === 'legs' ? 'selected' : ''}`}
                    onClick={() => setActiveTab('legs')}
                  >
                    <img src={legsIcon} className="tab-icon-gif" alt="Legs" />
                    רגליים
                  </button>
                </div>

                {activeTab === 'running' && (
                  <div className="tab-panel">
                    <label>
                      קלוריות שנשרפו במכשיר ריצה/סטפר
                      <input
                        type="number"
                        value={selectedDay.runningCalories}
                        onChange={(event) =>
                          updateDay(selectedDay.id, (day) => ({
                            ...day,
                            runningCalories: event.target.value,
                          }))
                        }
                        placeholder="לדוגמה: 320"
                      />
                    </label>
                    <button
                      className={`set-btn done-toggle ${selectedDay.runningDone ? 'done' : ''}`}
                      onClick={() =>
                        updateDay(selectedDay.id, (day) => ({
                          ...day,
                          runningDone: !day.runningDone,
                        }))
                      }
                    >
                      {selectedDay.runningDone ? 'ריצה הושלמה ✓' : 'סמן ריצה כבוצעה'}
                    </button>
                  </div>
                )}

                {(activeTab === 'chest' || activeTab === 'abs' || activeTab === 'legs') && (
                  <div className="tab-panel">
                    <label>
                      משקל הרמה (ק"ג)
                      <input
                        type="number"
                        value={selectedDay[activeTab].weight}
                        onChange={(event) =>
                          updateDay(selectedDay.id, (day) => ({
                            ...day,
                            [activeTab]: {
                              ...day[activeTab],
                              weight: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>

                    <div className="reps-grid">
                      {selectedDay[activeTab].reps.map((rep, index) => (
                        <div className="rep-card" key={`${activeTab}-${index}`}>
                          <label>
                            חזרה {index + 1}
                            <input
                              type="number"
                              value={rep}
                              onChange={(event) =>
                                updateStrengthSet(activeTab, index, event.target.value)
                              }
                            />
                          </label>
                          <button
                            className={`set-btn ${
                              selectedDay[activeTab].setDone[index] ? 'done' : ''
                            }`}
                            onClick={() => toggleStrengthSetDone(activeTab, index)}
                          >
                            V
                          </button>
                        </div>
                      ))}
                    </div>

                    <p className="meta-inline">
                      קלוריות{' '}
                      {activeTab === 'chest' ? 'חזה' : activeTab === 'abs' ? 'בטן' : 'רגליים'}:{' '}
                      <strong>
                        {sumStrengthCalories(
                          selectedDay[activeTab],
                          activeTab === 'chest' ? 0.08 : activeTab === 'abs' ? 0.055 : 0.09,
                        )}
                      </strong>
                    </p>
                  </div>
                )}
              </section>

              {selectedDay.completed && (
                <section className="workout-summary">
                  <h3>דוח מאמן אישי</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <small>קלוריות יומיות</small>
                      <strong>{getDayCalories(selectedDay)}</strong>
                    </div>
                    <div className="summary-item">
                      <small>סטים שהושלמו</small>
                      <strong>
                        {
                          [
                            ...selectedDay.chest.setDone,
                            ...selectedDay.abs.setDone,
                            ...selectedDay.legs.setDone,
                          ].filter(Boolean).length
                        }
                      </strong>
                    </div>
                    <div className="summary-item">
                      <small>ריצה</small>
                      <strong>{selectedDay.runningDone ? 'בוצעה' : 'לא בוצעה'}</strong>
                    </div>
                  </div>
                  <p className="coach-note">{getCoachMessage(selectedDay)}</p>
                </section>
              )}
            </>
          ) : (
            <p>אין יום פעיל. הוסף יום כדי להתחיל.</p>
          )}
        </section>
      </main>

      <section className="panel monthly-panel">
        <h2>דוח חודשי קלוריות</h2>
        <div className="month-grid">
          {monthlyCalories.map((item) => (
            <article className="month-card" key={item.month}>
              <small>{item.month}</small>
              <strong>{item.calories} קק"ל</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel gallery-panel">
        <div className="panel-head">
          <h2>גלריה שבועית - לפני/אחרי</h2>
        </div>

        <div className="gallery-controls">
          <label>
            תאריך תמונה
            <input
              type="date"
              value={pendingPhotoDate}
              onChange={(event) => setPendingPhotoDate(event.target.value)}
            />
          </label>
          <button onClick={() => photoInputRef.current?.click()}>העלה תמונה שבועית</button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={addWeeklyPhoto}
            hidden
          />
        </div>

        <div className="gallery-controls">
          <label>
            תמונת לפני
            <select
              value={compareBeforeId}
              onChange={(event) => setCompareBeforeId(event.target.value)}
            >
              <option value="">בחר תאריך</option>
              {program.weeklyPhotos.map((photo) => (
                <option key={`before-${photo.id}`} value={photo.id}>
                  {photo.date}
                </option>
              ))}
            </select>
          </label>

          <label>
            תמונת אחרי
            <select
              value={compareAfterId}
              onChange={(event) => setCompareAfterId(event.target.value)}
            >
              <option value="">בחר תאריך</option>
              {program.weeklyPhotos.map((photo) => (
                <option key={`after-${photo.id}`} value={photo.id}>
                  {photo.date}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="compare-grid">
          <article className="compare-card">
            <h3>לפני ואחרי</h3>
            <img src={beforeAfterImage} alt="Before and After" />
          </article>

          <article className="compare-card">
            <h3>לפני</h3>
            {compareBefore ? (
              <img src={compareBefore.imageDataUrl} alt={`לפני ${compareBefore.date}`} />
            ) : (
              <p>לא נבחרה תמונה</p>
            )}
          </article>

          <article className="compare-card">
            <h3>אחרי</h3>
            {compareAfter ? (
              <img src={compareAfter.imageDataUrl} alt={`אחרי ${compareAfter.date}`} />
            ) : (
              <p>לא נבחרה תמונה</p>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}

export default App


