/**
 * 转北京时间：2023年12月12日星期二 12:46
 */
export function toUTC8Time(date: Date) {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    weekday: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  });
}

export function replaceVars(text: string, vars: Record<string, string | (() => string)>) {
  return text.replace(/\{([^{}]+)\}/g, (match, p1) => {
    const value = vars[p1];
    const result = typeof value === 'function' ? value() : value;
    return result || match;
  });
}

/**
 * 移除文字中的不发音字符（emoji）
 */
export function removeEmojis(text: string) {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  return text.replace(emojiRegex, '');
}
