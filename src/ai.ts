import OpenAI from "openai";

const openai = new OpenAI({
  //apiKey: 'sk-????' //process.env["OPENAI_API_KEY"]
});

export class AiInterface {
  constructor(private safetyNet: number = 30, private model: string = 'gpt-3.5-turbo') { }

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
}