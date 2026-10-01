import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async chat(systemPrompt: string, userMessage: string, context: string) {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2', // Common lightweight local model
          prompt: `System: ${systemPrompt}\n\nContext:\n${context}\n\nUser: ${userMessage}\n\nAssistant:`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama API failed');
      }

      const data = await response.json();
      return { response: data.response };
    } catch (error) {
      console.log(
        'Falling back to mock AI response due to Ollama unavailability:',
        error.message,
      );
      // Fallback mock response for UI development
      return {
        response: `[Mock AI Response]\n\nBased on your question: "${userMessage}", and the context provided, here is an explanation. The text discusses themes that require careful analysis. I can help you elaborate on any part of this excerpt if you need further clarification.`,
      };
    }
  }
}
