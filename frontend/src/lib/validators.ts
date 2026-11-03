export function isEmail(value: string) {
  return /.+@.+\..+/.test(value);
}

export function isNonEmpty(value: string) {
  return value.trim().length > 0;
}
