import OpenAI from "openai";
import openaiTokenCounter, { ModelType } from 'openai-gpt-token-counter'; //https://snyk.io/advisor/npm-package/openai-gpt-token-counter

const openai = new OpenAI({
  //apiKey: 'sk-????' //process.env["OPENAI_API_KEY"]
});

export class AiInterface {
  constructor(private safetyNet: number = 30, private model: ModelType = 'gpt-3.5-turbo') { }

  private _count: number = 0;
  get count() { return this._count; }

  async prompt(prompt: string): Promise<string> {
    if (this.count > this.safetyNet) {
      throw "out of calls";
    }
    try {
      this._count++;
      process.stdout.write('.');
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: 'you are a very helpful information reviewer.'},
          { role: 'user', content: prompt }
        ], 
        model: this.model
      }, 
      // { timeout: 5000 },
    );
    
      return chatCompletion?.choices[0]?.message.content ?? 'FALSE -m';

    } catch (error) {
      return `FALSE -${error}`;
    }
  }

  tokenizeText(text: string, tokensPer: number, tokenCounter: (t: string) => number = (s) => openaiTokenCounter.text(s, this.model)): string[] {
    const result: string[] = [];
    let startIdx = 0;

    while (startIdx < text.length) {
        let left = startIdx;
        let right = text.length;
        let lastValidMid = startIdx;

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            const substring = text.slice(startIdx, mid);
            const tokensCount = tokenCounter(substring);

            if (tokensCount > tokensPer) {
                right = mid;
            } else {
                lastValidMid = mid;
                left = mid + 1;
            }

            if (left >= right) {
                break;
            }
        }

        const finalSubstring = text.slice(startIdx, lastValidMid);
        if (finalSubstring) {
            result.push(finalSubstring);
            process.stdout.write(`${Math.floor(startIdx/text.length*100)}%|`);
        }

        startIdx = lastValidMid != startIdx ? lastValidMid : text.length;
    }

    return result.map(s => s.trim()).filter(s => s.length);
  }

}