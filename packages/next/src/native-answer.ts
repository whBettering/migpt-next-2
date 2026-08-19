interface ConversationRecordWithAnswers {
  answers: Array<{
    type: string;
    tts?: { text?: string };
    llm?: { text?: string };
  }>;
}

export interface NativeAnswer {
  text: string;
  type: 'TTS' | 'LLM';
}

/** Extract the text XiaoAI already generated for a conversation record. */
export function extractNativeAnswer(
  record: ConversationRecordWithAnswers,
): NativeAnswer | undefined {
  const answer = record.answers[0];
  if (answer?.type === 'TTS') {
    const text = answer.tts?.text?.trim();
    return text ? { text, type: 'TTS' } : undefined;
  }
  if (answer?.type === 'LLM') {
    const text = answer.llm?.text?.trim();
    return text ? { text, type: 'LLM' } : undefined;
  }
  return undefined;
}
