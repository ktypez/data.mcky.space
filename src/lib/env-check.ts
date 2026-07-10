const REQUIRED = [
  'DATABASE_URL',
  'R2_PUBLIC_URL',
  'R2_BUCKET_NAME',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
] as const

const OPTIONAL = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'ADMIN_PASSWORD',
] as const

const missingRequired = REQUIRED.filter((k) => !process.env[k])
const missingOptional = OPTIONAL.filter((k) => !process.env[k])

if (missingRequired.length > 0) {
  console.warn(`[env] Missing required vars: ${missingRequired.join(', ')}`)
}

if (missingOptional.length > 0) {
  console.info(`[env] Missing optional vars: ${missingOptional.join(', ')}`)
}
