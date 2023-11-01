import OpenAI from "openai";
import openaiTokenCounter, { ModelType } from 'openai-gpt-token-counter';

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
        let endIdx = startIdx;
        let tokensCount = 0;

        while (endIdx <= text.length) {
            if (endIdx === text.length || text[endIdx] === ' ' || text[endIdx] === '\n') {
                let substring = text.slice(startIdx, endIdx);
                tokensCount = tokenCounter(substring);

                if (tokensCount >= tokensPer) {
                    result.push(substring);
                    process.stdout.write(`${Math.floor(startIdx/text.length*100)}%|`);
                    break;
                }
            } 
            endIdx++;
        }

        startIdx = endIdx + 1; // Skip the space or linefeed for the next substring
    }

    return result;
}

}