import { AiInterface } from "./src/ai";
import { calculateTextSegmentPositions } from "./src/text-segmenter";
import { IContentProvider, LocalFileProvider, WebPageProvider } from "./src/web-page-provider";
import { IteratingFileWriter, chunk, sleep, tStringConstructor, templateStringConstructor } from "./src/utils";
import openaiTokenCounter from 'openai-gpt-token-counter';

const CHUNK_SIZE = 512;
const CHUNKS_PER = 20;

const ai = new AiInterface(2000);

const p = {
  summarizeChunk: tStringConstructor<{chunk: string, paraCount: number}>(`
The following text is part of a much larger document. The task is to
summarize this section so that multiple summaries can be combined
later to further summarize. The following is fiction. The summary 
should preserve the tone and narrative of the original.
**Produce only a 100 word summary.**
===
{{chunk}}
  `),
  finalSummarization: tStringConstructor<{chunk: string}>(`
You have been summarizing a long document in sections. Below is the
concatenation of the summaries. The task is to distill these summaries
into one final summary. The summary will be **3 paragraphs** and
should preserve the tone and narrative of the original.
**Produce only a 300 word summary.**
===
{{chunk}} 
  `),
  whatIsTheTheme: tStringConstructor<{chunk: string}>(`
The following is a summary of a larger document. The task is to
analyze the text and figure out what the major themes are.
**The response will be one sentence**
===
{{chunk}}
  `),
  haiku: tStringConstructor<{chunk: string}>(`
Restate the following text in **haiku** form.
===
{{chunk}}
  `)
};

const urls = {
  deadlyThinkers: 'https://gutenberg.org/cache/epub/70623/pg70623.txt',
  moralSentiments: 'https://gutenberg.org/cache/epub/67363/pg67363.txt',
  subjectionOfWomen: 'https://gutenberg.org/cache/epub/27083/pg27083.txt',
  seneca: 'https://gutenberg.org/cache/epub/56075/pg56075.txt'
}

async function reducingPrompt(text: any, promptFn:any, accepterFn:any = () => true) {

  console.log('starting the tokenize')
  const substrings = ai.tokenizeText(text, 3000);
  console.log('end the tokenize', substrings.length);

  const chunkedSubstrings = chunk(substrings, 6);
  debugger;
  const answer: string[] = [];
  for (const chunkStrings of chunkedSubstrings) {
    const promises = chunkStrings
      .map(chunk => ai.prompt(promptFn(chunk)));

    const hitsAndMisses = await Promise.all(promises);
    process.stdout.write('x');
    const accepted = hitsAndMisses.filter(accepterFn);
    const accumulated = accepted.join('\n\n');
    answer.push(accumulated);
    await sleep(3000);
  }
  
  return answer.join('\n\n');
}

(async () => {
  const fileWriter = new IteratingFileWriter('thinker');
  const url = urls.deadlyThinkers;
  
  const provider: IContentProvider = new WebPageProvider(url);
  // const provider: IContentProvider = new LocalFileProvider('./testdata/gunslinger_2.md');
  const { title, content } = await provider.fetch();
  fileWriter.write(content);
  
  let summary = content;

  while (summary.length > CHUNK_SIZE * CHUNKS_PER) {
    summary = await reducingPrompt(summary, (chunk: string) => p.summarizeChunk({chunk, paraCount: 3}));
    fileWriter.write(summary);
  }
  console.log('calls so far', ai.count);

  console.log('generating final summary and theme');
  let finalSummarization = summary;
  if (openaiTokenCounter.text(summary, 'gpt-3.5-turbo') > 3500){
    finalSummarization = await ai.prompt(p.finalSummarization({chunk: summary}));
  }

  const theme = await ai.prompt(p.whatIsTheTheme({chunk: finalSummarization}));
  console.log('\n\ntheme\n', theme);

  fileWriter.write(`${finalSummarization}\n\n${theme}`);
  console.log('\n\ncalls so far', ai.count);

  const haiku = await ai.prompt(p.haiku({chunk: finalSummarization}));
  fileWriter.write(haiku);
  console.log('haiku\n\n', haiku);
})();


