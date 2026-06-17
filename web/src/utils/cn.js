/** Join class names; falsy values are skipped. */
export const cn = (...parts) => parts.filter(Boolean).join(' ')
