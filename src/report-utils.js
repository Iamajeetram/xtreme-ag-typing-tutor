let _cachedRawTarget = null;
let _cachedTargetTokens = null;
const REPORT_HISTORY_KEY = 'ag-typing-reports'

export function readReportHistory() {
  try {
    const stored = localStorage.getItem(REPORT_HISTORY_KEY)
    if (!stored) return []
    const history = JSON.parse(stored)
    if (Array.isArray(history)) return history
    console.warn('Ignoring invalid typing report history: expected an array.')
  } catch (error) {
    console.warn('Failed to read typing report history:', error)
  }
  return []
}

export function saveReportRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('A report record must be a non-null object.')
  }

  try {
    const history = readReportHistory()
    history.unshift(record)
    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save report:', error)
    throw error
  }
}

export function alignWordsWithResync(typed, target, lookahead = 8) {
  const rawTyped = String(typed ?? '').replace(/\u200B/g, '')
  const rawTarget = String(target ?? '')
  const inputTokens = [...rawTyped.matchAll(/\S+/g)].map((m, idx) => ({
    text: m[0],
    start: m.index,
    end: m.index + m[0].length,
    index: idx
  }))
  if (_cachedRawTarget !== rawTarget || !_cachedTargetTokens) {
    _cachedRawTarget = rawTarget
    _cachedTargetTokens = [...rawTarget.matchAll(/\S+/g)].map((m, idx) => ({
      text: m[0],
      start: m.index,
      end: m.index + m[0].length,
      index: idx,
      charLen: [...m[0]].length
    }))
  }
  const targetTokens = _cachedTargetTokens

  const endsWithSpace = /\s$/.test(rawTyped)
  const alignedWords = targetTokens.map((t) => ({
    text: t.text,
    start: t.start,
    end: t.end,
    index: t.index,
    typed: '',
    typedStart: -1,
    typedEnd: -1,
    correct: false,
    status: 'untyped', // 'correct' | 'wrong' | 'omitted' | 'in-progress' | 'untyped'
    errorType: ''
  }))

  const extraInsertedWords = []
  let i = 0
  let j = 0

  while (i < inputTokens.length && j < targetTokens.length) {
    const inp = inputTokens[i]
    const tgt = targetTokens[j]
    const isLastTypedToken = (i === inputTokens.length - 1)
    const isCurrentlyTypingThisWord = isLastTypedToken && !endsWithSpace

    // 1. Exact Match
    if (inp.text === tgt.text) {
      alignedWords[j].typed = inp.text
      alignedWords[j].typedStart = inp.start
      alignedWords[j].typedEnd = inp.end
      alignedWords[j].correct = true
      alignedWords[j].status = 'correct'
      i++
      j++
      continue
    }

    // 2. Active Word In Progress (user hasn't pressed Space yet to finish this word)
    if (isCurrentlyTypingThisWord) {
      alignedWords[j].typed = inp.text
      alignedWords[j].typedStart = inp.start
      alignedWords[j].typedEnd = inp.end
      alignedWords[j].correct = false
      alignedWords[j].status = 'in-progress'
      i++
      j++
      break
    }

    // 3. Check if user accidentally hit Space inside the target word (split 1 target word into 2 input tokens)
    if (i + 1 < inputTokens.length && (inp.text + inputTokens[i + 1].text) === tgt.text) {
      const combined = inp.text + ' ' + inputTokens[i + 1].text
      alignedWords[j].typed = combined
      alignedWords[j].typedStart = inp.start
      alignedWords[j].typedEnd = inputTokens[i + 1].end
      alignedWords[j].correct = false
      alignedWords[j].status = 'wrong'
      alignedWords[j].errorType = 'Split Word (अनावश्यक स्पेस)'
      i += 2
      j += 1
      continue
    }

    // Helper to check if a typed token is a likely typo of a target word (e.g., "and" for "an", "ecletic" for "eclectic")
    const isLikelyWordTypo = (a, b) => {
      if (!a || !b) return false
      const la = a.toLowerCase().replace(/[.,!?;:'"()\[\]{}\-–—।]/g, '')
      const lb = b.toLowerCase().replace(/[.,!?;:'"()\[\]{}\-–—।]/g, '')
      if (!la || !lb) return false
      if (la === lb) return true
      if (la.startsWith(lb) || lb.startsWith(la)) {
        if (Math.abs(la.length - lb.length) <= 2) return true
      }
      if (Math.abs(la.length - lb.length) > 2) return false
      let diffs = 0
      let ia = 0
      let ib = 0
      while (ia < la.length && ib < lb.length) {
        if (la[ia] === lb[ib]) {
          ia++
          ib++
        } else {
          diffs++
          if (diffs > 2) return false
          if (la.length > lb.length) ia++
          else if (lb.length > la.length) ib++
          else { ia++; ib++ }
        }
      }
      diffs += (la.length - ia) + (lb.length - ib)
      return diffs <= 2
    }

    const nextInp = inputTokens[i + 1]?.text
    const nextTgtNoSkip = targetTokens[j + 1]?.text
    const nextWordMatchesInPlace = Boolean(
      nextInp && nextTgtNoSkip && (nextInp === nextTgtNoSkip || isLikelyWordTypo(nextInp, nextTgtNoSkip))
    )

    // 4. Look-ahead in targetTokens: Did the user genuinely skip 1 or more target words?
    // Never jump ahead if current word is a likely typo of target[j] (like "and" for "an") or if the next word matches target[j+1]!
    let skippedCount = 0
    if (!isLikelyWordTypo(inp.text, tgt.text) && !nextWordMatchesInPlace) {
      for (let k = 1; k <= lookahead && (j + k) < targetTokens.length; k++) {
        if (inp.text === targetTokens[j + k].text) {
          const nextTgtAfterSkip = targetTokens[j + k + 1]?.text
          const confirmedByNextWord = Boolean(
            nextInp && nextTgtAfterSkip && (nextInp === nextTgtAfterSkip || isLikelyWordTypo(nextInp, nextTgtAfterSkip))
          )
          // For k === 1 (single skipped word), allow if confirmed by next word or if at very end of input and word is >= 4 chars
          // For k >= 2 (multiple skipped words), ALWAYS require confirmation by the next word so common words ("and", "the", "of") never jump 7 words ahead!
          if (confirmedByNextWord || (k === 1 && !nextInp && inp.text.length >= 4)) {
            skippedCount = k
            break
          }
        }
      }
    }

    if (skippedCount > 0) {
      for (let s = 0; s < skippedCount; s++) {
        alignedWords[j + s].typed = ''
        alignedWords[j + s].correct = false
        alignedWords[j + s].status = 'omitted'
        alignedWords[j + s].errorType = 'Omitted Word (छूटा हुआ शब्द)'
      }
      j += skippedCount
      continue
    }

    // 5. Look-ahead in inputTokens: Did the user insert/repeat an extra word?
    let insertedCount = 0
    if (!nextWordMatchesInPlace) {
      for (let k = 1; k <= 2 && (i + k) < inputTokens.length; k++) {
        if (inputTokens[i + k].text === tgt.text) {
          const nextTgt = targetTokens[j + 1]?.text
          const nextInpAfterIns = inputTokens[i + k + 1]?.text
          if (!nextTgt || !nextInpAfterIns || nextInpAfterIns === nextTgt || isLikelyWordTypo(nextInpAfterIns, nextTgt)) {
            insertedCount = k
            break
          }
        }
      }
    }

    if (insertedCount > 0) {
      for (let ins = 0; ins < insertedCount; ins++) {
        extraInsertedWords.push(inputTokens[i + ins])
      }
      i += insertedCount
      continue
    }

    // 6. Standard 1-to-1 Mistyped Word (Substitution)
    alignedWords[j].typed = inp.text
    alignedWords[j].typedStart = inp.start
    alignedWords[j].typedEnd = inp.end
    alignedWords[j].correct = false
    alignedWords[j].status = 'wrong'
    i++
    j++
  }

  while (i < inputTokens.length) {
    extraInsertedWords.push(inputTokens[i])
    i++
  }

  let correctChars = 0
  let errorChars = 0
  let attemptedWords = 0
  let correctWords = 0
  let incorrectWords = 0
  let omittedWords = 0
  let activeWordIndex = -1

  for (let idx = 0; idx < alignedWords.length; idx++) {
    const w = alignedWords[idx]
    if (w.status === 'untyped') continue
    if (w.status === 'in-progress') {
      activeWordIndex = idx
      const tChars = [...w.typed]
      const eChars = [...w.text]
      for (let c = 0; c < tChars.length; c++) {
        if (tChars[c] === eChars[c]) correctChars++
        else errorChars++
      }
      continue
    }
    if (w.status === 'omitted') {
      omittedWords++
      continue
    }
    attemptedWords++
    if (w.correct) {
      correctWords++
      correctChars += [...w.text].length
      if (idx < alignedWords.length - 1 && (rawTyped.length > w.typedEnd)) {
        correctChars += 1
      }
    } else {
      incorrectWords++
      const tChars = [...w.typed]
      const eChars = [...w.text]
      const maxLen = Math.max(tChars.length, eChars.length)
      for (let c = 0; c < maxLen; c++) {
        if (c < tChars.length && c < eChars.length && tChars[c] === eChars[c]) {
          correctChars++
        } else {
          errorChars++
        }
      }
      if (idx < alignedWords.length - 1 && w.typedEnd > 0 && rawTyped.length > w.typedEnd) {
        correctChars += 1
      }
    }
  }

  for (const extra of extraInsertedWords) {
    attemptedWords++
    incorrectWords++
    errorChars += [...extra.text].length + 1
  }

  if (activeWordIndex === -1) {
    activeWordIndex = alignedWords.findIndex((w) => w.status === 'untyped')
  }

  const totalTypedChars = rawTyped.length
  if (correctChars > totalTypedChars) correctChars = totalTypedChars
  const finalErrors = Math.max(0, totalTypedChars - correctChars)

  return {
    words: alignedWords,
    extraInsertedWords,
    activeWordIndex,
    correctWords,
    incorrectWords,
    omittedWords,
    attemptedWords,
    untypedWords: alignedWords.filter((w) => w.status === 'untyped').length,
    totalWords: alignedWords.length,
    correctChars,
    errorChars: finalErrors,
    totalTypedChars
  }
}

export function analyzeWords(typed, target) {
  return alignWordsWithResync(typed, target)
}

export function calculateDetailedMetrics(typed, target, elapsedMs) {
  const input = String(typed ?? '').replace(/\u200B/g, '')
  const passage = String(target ?? '')
  const durationMs = Number.isFinite(Number(elapsedMs)) ? Math.max(0, Number(elapsedMs)) : 0
  const minutes = Math.max(durationMs / 60000, 1 / 60)

  const aligned = alignWordsWithResync(input, passage)
  const correct = aligned.correctChars
  const errors = aligned.errorChars
  const words = aligned.attemptedWords
  const grossWpm = Math.round((input.length / 5) / minutes)
  const netWpm = Math.max(0, Math.round((correct / 5) / minutes))

  return {
    correct,
    errors,
    wpm: netWpm,
    grossWpm,
    netWpm,
    accuracy: input.length ? Math.round((correct / input.length) * 100) : 100,
    words,
    correctWords: aligned.correctWords,
    incorrectWords: aligned.incorrectWords,
    omittedWords: aligned.omittedWords,
    typed: input.length,
    completion: passage.length ? Math.min(100, Math.round((input.length / passage.length) * 100)) : 0,
    errorRate: input.length ? Math.round((errors / input.length) * 100) : 0,
  }
}

export function getPerformanceBand(wpm) {
  const speed = Number.isFinite(Number(wpm)) ? Number(wpm) : 0
  if (speed >= 60) return { label: 'Professional', color: '#16a34a' }
  if (speed >= 40) return { label: 'Advanced', color: '#2563eb' }
  if (speed >= 25) return { label: 'Intermediate', color: '#d97706' }
  return { label: 'Beginner', color: '#dc2626' }
}

export function formatDuration(seconds) {
  const duration = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0
  const wholeSeconds = Math.floor(duration)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainder = wholeSeconds % 60
  return `${minutes}m ${remainder}s`
}
