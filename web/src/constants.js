// Shared constants file
import pkg from '../../package.json'

export const API_URL = import.meta.env.VITE_API_URL || '/api'
/** Single source of truth: root `package.json` `version`. Bump patch (or minor/major) on every app change. */
export const APP_VERSION = pkg.version
