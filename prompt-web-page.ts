//https://pub.towardsai.net/engineering-prompt-chains-with-language-models-to-craft-a-summarizer-almighty-web-app-7286de0b0a71

import prompts from './prompts';
import blogs from './testdata/blog';
import { partition } from './src/utils';
import { calculateTextSegmentPositions } from './src/text-segmenter';
import { IContentProvider, WebPageProvider } from './src/web-page-provider';
import { AiInterface } from './src/ai';

const ai = new AiInterface();

(async () => {
  const question = 'how do I promote mentally healthy kids';
  const url = blogs.healthyKids;

  const provider: IContentProvider = new WebPageProvider(url);
  const { title, content } = await provider.fetch();
  const isRelevant = await ai.prompt(prompts.TITLE_IS_RELEVANT({ question, title }));
  console.log('relevant title', isRelevant);
  if (isRelevant.startsWith("FALSE")) {
    console.log('article not relevant based on title');
    return;
  }

  const hitsAndMisses = await reducingPrompt(content, (chunk: string) => prompts.COULD_ANSWER({ question, chunk }));

  const [hits, misses] = partition(hitsAndMisses, r => !r.startsWith('FALSE') && !!r);

  const highlights = (hits as string[])
    .reduce((a, c) => `${a}\n${c.substring(4)}`, '')
    .trim();

  if(highlights) {
    const finalPrompt = prompts.ANSWER({question, chunk:highlights});
    const finalAnswer = await ai.prompt(finalPrompt);
    console.log('\n\n----\n', finalAnswer);
  } else {
    console.log('no help');
  }
})();



async function reducingPrompt(text: any, promptFn:any) {
  const chunkLocs = calculateTextSegmentPositions(text, 512, 20);
  const promises = chunkLocs
    .map(loc => text.substring(loc.start, loc.end))
    .map(chunk => ai.prompt(promptFn(chunk)));

  const hitsAndMisses = await Promise.all(promises);
  return hitsAndMisses;
}

