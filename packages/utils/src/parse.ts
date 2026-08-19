export function jsonEncode<T>(obj: T, options?: { prettier?: boolean }) {
  const { prettier } = options ?? {};
  try {
    return JSON.stringify(obj, undefined, prettier ? 4 : 0);
  } catch (_) {
    return undefined;
  }
}

export function jsonDecode<T = any>(json: string | null | undefined) {
  if (!json) {
    return undefined;
  }
  try {
    return JSON.parse(json) as T;
  } catch (_) {
    return undefined;
  }
}
