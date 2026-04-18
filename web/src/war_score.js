const DECAY_START_HOURS = 24
const DECAY_RATE_PER_HOUR = 0.01
const MAX_WAR_HOURS = 123

export function computeOriginalTarget(currentTarget, warStartEpoch, nowEpoch) {
    const hoursElapsed = (nowEpoch - warStartEpoch) / 3600
    if (hoursElapsed <= DECAY_START_HOURS) return currentTarget
    const decayHours = hoursElapsed - DECAY_START_HOURS
    return currentTarget / (1 - DECAY_RATE_PER_HOUR * decayHours)
}

export function targetAtTime(originalTarget, warStartEpoch, timeEpoch) {
    const hoursElapsed = (timeEpoch - warStartEpoch) / 3600
    if (hoursElapsed <= DECAY_START_HOURS) return originalTarget
    const decayHours = Math.min(hoursElapsed - DECAY_START_HOURS, MAX_WAR_HOURS - DECAY_START_HOURS)
    return Math.max(0, originalTarget * (1 - DECAY_RATE_PER_HOUR * decayHours))
}

export function scoreNeeded(ourScore, originalTarget, warStartEpoch, deadlineEpoch) {
    const target = targetAtTime(originalTarget, warStartEpoch, deadlineEpoch)
    return Math.max(0, Math.ceil(target - ourScore))
}

export function coastTime(ourScore, originalTarget, warStartEpoch) {
    if (ourScore <= 0 || originalTarget <= 0) return null
    if (ourScore >= originalTarget) return warStartEpoch

    const decayPerHour = originalTarget * DECAY_RATE_PER_HOUR
    const decayHoursNeeded = (originalTarget - ourScore) / decayPerHour
    const totalHours = DECAY_START_HOURS + decayHoursNeeded

    if (totalHours > MAX_WAR_HOURS) return null
    return warStartEpoch + totalHours * 3600
}

export function nextEnrollmentDeadline(nowEpoch, hoursBeforeEnrollment = 12) {
    const enrollmentHourTCT = 12
    const now = new Date(nowEpoch * 1000)
    const utcDay = now.getUTCDay()
    const utcHour = now.getUTCHours()

    // Tuesday = 2. Find days until next Tuesday
    let daysUntilTuesday = (2 - utcDay + 7) % 7
    if (daysUntilTuesday === 0 && utcHour >= enrollmentHourTCT) {
        daysUntilTuesday = 7
    }

    const nextTuesday = new Date(now)
    nextTuesday.setUTCDate(now.getUTCDate() + daysUntilTuesday)
    nextTuesday.setUTCHours(enrollmentHourTCT, 0, 0, 0)

    const enrollmentEpoch = nextTuesday.getTime() / 1000
    return enrollmentEpoch - hoursBeforeEnrollment * 3600
}
