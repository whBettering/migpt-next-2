export interface WebSearchSource {
  title: string;
  url: string;
}

export interface WebSearchResult {
  text: string;
  searched: boolean;
  sources: WebSearchSource[];
}

const kExplicitSearchPattern =
  /(?:联网|上网|网上|互联网).{0,6}(?:查|搜|搜索)|(?:查一下|查下|搜一下|搜下|搜索一下|网上查查)/i;
const kFreshnessPattern =
  /今天|今日|现在|当前|目前|此刻|最新|最近|近期|刚刚|刚才|实时|本周|这周|本月|这个月|今年|明天|后天|昨天|昨日|近\s*\d+\s*(?:天|周|月|年)/i;
const kVolatileInformationPattern =
  /新闻|资讯|动态|热搜|热点|天气|气温|空气质量|价格|多少钱|股价|股票|行情|汇率|利率|金价|油价|票价|比分|赛程|战绩|排名|榜单|政策|法规|规定|版本|更新|发布|上线|开售|发售|库存|营业时间|开放时间|航班|高铁|列车|路况|限行/i;
const kVolatileRolePattern =
  /(?:(?:总统|总理|首相|主席|ceo|首席执行官|负责人|领导人|市长|省长|部长|教皇).{0,8}(?:是谁|叫什么|哪位)|谁是.{0,8}(?:总统|总理|首相|主席|ceo|首席执行官|负责人|领导人|市长|省长|部长|教皇))/i;

/**
 * Decide locally whether the latest user question needs fresh external information.
 */
export function shouldUseWebSearch(messages: any[]) {
  let text = '';
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === 'user' && typeof messages[index]?.content === 'string') {
      text = messages[index].content.trim();
      break;
    }
  }
  if (!text) return false;

  const currentYear = String(new Date().getFullYear());
  return (
    kExplicitSearchPattern.test(text) ||
    kFreshnessPattern.test(text) ||
    text.includes(currentYear) ||
    kVolatileInformationPattern.test(text) ||
    kVolatileRolePattern.test(text)
  );
}

/**
 * Remove links and provider citation markers that should not be read aloud by TTS.
 */
export function sanitizeWebSearchText(text: string) {
  return text
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/【[^\]]*?†[^\]]*?】/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize the Responses API payload into text suitable for speech plus log-only sources.
 */
export function parseWebSearchResponse(response: any): WebSearchResult {
  const output = Array.isArray(response?.output) ? response.output : [];
  const searched = output.some((item: any) => item?.type === 'web_search_call');
  const sources: WebSearchSource[] = [];
  const contentTexts: string[] = [];

  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        contentTexts.push(content.text);
      }

      for (const annotation of content?.annotations ?? []) {
        if (annotation?.type !== 'url_citation') continue;
        const url = annotation.url ?? annotation.url_citation?.url;
        const title = annotation.title ?? annotation.url_citation?.title ?? url;
        if (typeof url === 'string' && url) {
          sources.push({ title: String(title), url });
        }
      }
    }
  }

  const uniqueSources = sources.filter(
    (source, index) => sources.findIndex((candidate) => candidate.url === source.url) === index,
  );
  const rawText =
    typeof response?.output_text === 'string' && response.output_text
      ? response.output_text
      : contentTexts.join('\n');

  return {
    text: sanitizeWebSearchText(rawText),
    searched,
    sources: uniqueSources,
  };
}
