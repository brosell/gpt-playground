import prompts from "./prompts";
import { AiInterface } from "./src/ai";
import openaiTokenCounter from 'openai-gpt-token-counter';

const text = prompts.COULD_ANSWER({question: "are you ok?", chunk: "I'm fine!"});
const ai = new AiInterface();
const tokenized = ai.tokenizeText(text, 15, (s) => openaiTokenCounter.text(s, 'gpt-3.5-turbo'));

console.log(tokenized.map(t => t.length));
console.log(tokenized);
