const USERS_STORAGE_KEY = 'kios-users'

function readUsers() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawUsers = window.localStorage.getItem(USERS_STORAGE_KEY)
    const parsedUsers = rawUsers ? JSON.parse(rawUsers) : []

    return Array.isArray(parsedUsers)
      ? parsedUsers.filter((user) => user && typeof user === 'object')
      : []
  } catch {
    return []
  }
}

export function getRegisteredUsers() {
  return readUsers()
}

function writeUsers(users) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function saveRegisteredUser({ name, email, password }) {
  const normalizedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPassword = password.trim()

  if (!normalizedName || !normalizedEmail) {
    return null
  }

  const users = readUsers()
  const existingIndex = users.findIndex((user) => {
    const userName = String(user.name ?? '').trim().toLowerCase()
    const userEmail = String(user.email ?? '').trim().toLowerCase()

    return userName === normalizedName.toLowerCase() || userEmail === normalizedEmail
  })

  const userRecord = {
    id: users[existingIndex]?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: normalizedName,
    email: normalizedEmail,
    password: normalizedPassword,
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    users[existingIndex] = userRecord
  } else {
    users.push(userRecord)
  }

  writeUsers(users)

  return userRecord
}

export function saveOneTimeRecoveryCode(identifier, oneTimeRecoveryCode) {
  const normalizedIdentifier = normalizeValue(identifier)
  const normalizedCode = String(oneTimeRecoveryCode ?? '').trim().toUpperCase()

  if (!normalizedIdentifier || !normalizedCode) {
    return null
  }

  const users = readUsers()
  const userIndex = users.findIndex((user) => {
    const userName = normalizeValue(user.name)
    const userEmail = normalizeValue(user.email)

    return userName === normalizedIdentifier || userEmail === normalizedIdentifier
  })

  if (userIndex < 0) {
    return null
  }

  users[userIndex] = {
    ...users[userIndex],
    oneTimeRecoveryCode: normalizedCode,
    oneTimeRecoveryCodeConsumed: false,
    oneTimeRecoveryCodeUpdatedAt: new Date().toISOString(),
  }

  writeUsers(users)

  return users[userIndex]
}

export function consumeOneTimeRecoveryCode(identifier, code) {
  const normalizedIdentifier = normalizeValue(identifier)
  const normalizedCode = String(code ?? '').trim().toUpperCase()

  if (!normalizedIdentifier || !normalizedCode) {
    return false
  }

  const users = readUsers()
  const userIndex = users.findIndex((user) => {
    const userName = normalizeValue(user.name)
    const userEmail = normalizeValue(user.email)

    return userName === normalizedIdentifier || userEmail === normalizedIdentifier
  })

  if (userIndex < 0) {
    return false
  }

  const user = users[userIndex]
  const activeCode = String(user.oneTimeRecoveryCode ?? '').trim().toUpperCase()
  const alreadyConsumed = Boolean(user.oneTimeRecoveryCodeConsumed)

  if (alreadyConsumed || activeCode !== normalizedCode) {
    return false
  }

  users[userIndex] = {
    ...user,
    oneTimeRecoveryCode: null,
    oneTimeRecoveryCodeConsumed: true,
    oneTimeRecoveryCodeConsumedAt: new Date().toISOString(),
  }

  writeUsers(users)

  return true
}

export function findUserByIdentifier(identifier) {
  const normalizedIdentifier = normalizeValue(identifier)

  if (!normalizedIdentifier) {
    return null
  }

  const users = readUsers()

  return users.find((user) => {
    const userName = normalizeValue(user.name)
    const userEmail = normalizeValue(user.email)

    return userName === normalizedIdentifier || userEmail === normalizedIdentifier
  }) ?? null
}

export function generateAccessCode(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codeLength = Math.max(8, length)

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(codeLength)
    window.crypto.getRandomValues(randomValues)

    return Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('')
  }

  return Array.from({ length: codeLength }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}
