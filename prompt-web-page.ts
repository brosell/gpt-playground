//https://pub.towardsai.net/engineering-prompt-chains-with-language-models-to-craft-a-summarizer-almighty-web-app-7286de0b0a71

import OpenAI from 'openai';
import prompts from './prompts';
import blogs from './testdata/blog';
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { partition, pipe } from './src/pipe';
import { calculateTextSegmentPositions } from './src/text-segmenter';


const openai = new OpenAI({
  //apiKey: 'sk-????' //process.env["OPENAI_API_KEY"]
});

const askGpt = async (prompt: string, model: string = 'gpt-3.5-turbo'): Promise<string> => {
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'you are a very helpful information reviewer who can tell me if some text supports answering a question. Tone is formal and informative. '},
        { role: 'user', content: prompt }
      ],
      model,
    });
  
    return chatCompletion?.choices[0]?.message.content ?? 'FALSE -m';

  } catch (error) {
    return 'FALSE -e';
  }
};

(async () => {
  const text = await pipe(blogs.aiHIghStakes,
    fetch,
    (r: Response) => r.text(),
    (text: string) => NodeHtmlMarkdown.translate(text),
  );
    
  const question = 'Are there ways ot prevent AI from taking over the world?';

  const hitsAndMisses = await promptOnSegments(text, (chunk: string) => prompts.COULD_ANSWER.replace('{{question}}', question).replace('{{chunk}}', chunk));

  const [hits, misses] = partition(hitsAndMisses, r => !r.startsWith('FALSE') && !!r);

  const highlights = (hits as string[])
    .reduce((a, c) => `${a}\n${c.substring(4)}`, '')
    .trim();

  if(highlights) {
    const finalPrompt = prompts.ANSWER.replace('{{question}}', question).replace('{{chunk}}', highlights);
    const finalAnswer = await askGpt(finalPrompt);
    console.log('\n\n----\n', finalAnswer);
  } else {
    console.log('no help');
    console.log(misses);
  }
})();

async function promptOnSegments(text: any, promptFn:any) {
  const chunkLocs = calculateTextSegmentPositions(text, 256, 20);
  const promises = chunkLocs
    .map(loc => text.substring(loc.start, loc.end))
    .map(chunk => askGpt(promptFn(chunk)));

  const hitsAndMisses = await Promise.all(promises);
  return hitsAndMisses;
}

