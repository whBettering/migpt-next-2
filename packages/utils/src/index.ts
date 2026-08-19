import { isEmpty } from './is.js';

export function timestamp() {
  return new Date().getTime();
}

export async function sleep(time: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, time));
}

export function println(...v: any[]) {
  console.log(...v);
}

export function printJson(obj: any) {
  console.log(JSON.stringify(obj, undefined, 4));
}

export function firstOf<T>(items?: T[]) {
  return items ? (items.length < 1 ? undefined : items[0]) : undefined;
}

export function lastOf<T>(items?: T[]) {
  return items?.length ? items[items.length - 1] : undefined;
}

export function randomInt(_min: number, _max?: number) {
  let min = _min;
  let max = _max;
  if (!max) {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function pickOne<T>(items: T[]) {
  return items.length < 1 ? undefined : items[randomInt(items.length - 1)];
}

export function range(_start: number, _end?: number) {
  let start = _start;
  let end = _end;
  if (!end) {
    end = start;
    start = 0;
  }
  return Array.from({ length: end - start }, (_, index) => start + index);
}

export function clamp(num: number, min: number, max: number): number {
  return num < max ? (num > min ? num : min) : max;
}

export function toInt(str: string) {
  return Number.parseInt(str, 10);
}

export function toDouble(str: string) {
  return Number.parseFloat(str);
}

export function toFixed(n: number, fractionDigits = 2) {
  let s = n.toFixed(fractionDigits);
  while (s[s.length - 1] === '0') {
    s = s.substring(0, s.length - 1);
  }
  if (s[s.length - 1] === '.') {
    s = s.substring(0, s.length - 1);
  }
  return s;
}

export function toSet<T>(items: T[], byKey?: (e: T) => string | number) {
  if (byKey) {
    const keys: Record<string | number, boolean> = {};
    const items: T[] = [];
    for (const e of items) {
      const key = byKey(e);
      if (!keys[key]) {
        items.push(e);
        keys[key] = true;
      }
    }
    return items;
  }
  return Array.from(new Set(items));
}

export function withDefault<T>(e: any, defaultValue: T): T {
  return isEmpty(e) ? defaultValue : e;
}

export function removeEmpty<T>(data: T): T {
  if (!data) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.filter((e) => e != null) as any;
  }
  const res = {} as any;
  for (const key in data) {
    if (data[key] != null) {
      res[key] = data[key];
    }
  }
  return res;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    const copy: any[] = [];
    obj.forEach((item, index) => {
      copy[index] = deepClone(item);
    });
    return copy as unknown as T;
  }
  const copy = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (copy as any)[key] = deepClone((obj as any)[key]);
    }
  }
  return copy;
}

export function repeat(text: string, count: number) {
  return Array(count).fill(text).join('');
}

export function deepMerge<T extends object>(target: T, source: Partial<T> = {}): T {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      if (
        sourceValue &&
        targetValue &&
        typeof sourceValue === 'object' &&
        typeof targetValue === 'object'
      ) {
        if (Array.isArray(sourceValue)) {
          result[key] = [...sourceValue] as any;
        } else if (Array.isArray(targetValue)) {
          result[key] = [...targetValue] as any;
        } else {
          result[key] = deepMerge(targetValue as object, sourceValue as object) as any;
        }
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as any;
      }
    }
  }
  return result;
}
