export interface ILlmProvider {
  chatStream(
    messages: { role: string; content: string }[],
    onChunk: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
