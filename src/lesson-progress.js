const STORAGE_KEY = 'ag-typing-learn-progress-v2'

export function readLessonProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {} } catch { return {} }
}

export function saveLessonResult(lessonId, stageId, result) {
  const all = readLessonProgress()
  const previous = all[lessonId] || { stages: {} }
  const old = previous.stages?.[stageId] || {}
  const next = {
    ...all,
    [lessonId]: {
      ...previous,
      stages: {
        ...(previous.stages || {}),
        [stageId]: {
          completed: Boolean(old.completed || result.passed),
          bestWpm: Math.max(Number(old.bestWpm || 0), Number(result.wpm || 0)),
          bestAccuracy: Math.max(Number(old.bestAccuracy || 0), Number(result.accuracy || 0)),
          attempts: Number(old.attempts || 0) + 1,
          lastAccuracy: Number(result.accuracy || 0),
          lastWpm: Number(result.wpm || 0),
          passedAt: result.passed ? new Date().toISOString() : old.passedAt || null
        }
      }
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function stageIsUnlocked(lesson, stageIndex, progress) {
  if (stageIndex === 0) return true
  const prior = lesson.stages[stageIndex - 1]
  return Boolean(progress[lesson.id]?.stages?.[prior.id]?.completed)
}

export function lessonCompletion(lesson, progress) {
  const done = lesson.stages.filter(s => progress[lesson.id]?.stages?.[s.id]?.completed).length
  return { done, total: lesson.stages.length, percent: Math.round(done / lesson.stages.length * 100) }
}
