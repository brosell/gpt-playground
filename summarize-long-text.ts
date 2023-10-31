import { AiInterface } from "./src/ai";
import { calculateTextSegmentPositions } from "./src/text-segmenter";
import { IContentProvider, LocalFileProvider, WebPageProvider } from "./src/web-page-provider";
import { IteratingFileWriter, chunk, sleep, tStringConstructor, templateStringConstructor } from "./src/utils";

const CHUNK_SIZE = 512;
const CHUNKS_PER = 20;

const ai = new AiInterface(2000);

const p = {
  summarizeChunk: tStringConstructor<{chunk: string, paraCount: number}>(`
The following text is part of a much larger document. The task is to
summarize this section so that multiple summaries can be combined
later to further summarize. The following is fiction. The summary 
should preserve the tone and narrative of the original.
**Produce only the summary text.**
===
{{chunk}}
  `),
  finalSummarization: tStringConstructor<{chunk: string}>(`
You have been summarizing a long document in sections. Below is the
concatenation of the summaries. The task is to distill these summaries
into one final summary. The summary will be **3 paragraphs** and
should preserve the tone and narrative of the original.
**Produce only the summary text.**
===
{{chunk}} 
  `),
  whatIsTheTheme: tStringConstructor<{chunk: string}>(`
The following is a summary of a larger document. The task is to
analyze the text and figure out what the major themes are.
**The response will be one sentence**
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
  const locationMap = calculateTextSegmentPositions(text, CHUNK_SIZE, CHUNKS_PER);
  const chunkedChunkLocs = chunk(locationMap, 8);
  const answer: string[] = [];
  for (const chunkLocs of chunkedChunkLocs) {
    const promises = chunkLocs
      .map(loc => text.substring(loc.start, loc.end))
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
  const fileWriter = new IteratingFileWriter('spark');
  const url = urls.subjectionOfWomen;
  
  // const provider: IContentProvider = new WebPageProvider(url);
  const provider: IContentProvider = new LocalFileProvider('./testdata/sparks.txt');
  const { title, content } = await provider.fetch();
  fileWriter.write(content);
  
  let summary = content;

  while (summary.length > CHUNK_SIZE * CHUNKS_PER) {
    summary = await reducingPrompt(summary, (chunk: string) => p.summarizeChunk({chunk, paraCount: 3}));
    fileWriter.write(summary);
  }
  console.log('calls so far', ai.count);

  console.log('generating final summary and theme');
  const finalSummarization = await ai.prompt(p.finalSummarization({chunk: summary}));
  
  const theme = await ai.prompt(p.whatIsTheTheme({chunk: finalSummarization}));
  console.log('\n\ntheme\n', theme);

  fileWriter.write(`${finalSummarization}\n\n${theme}`);
  console.log('\n\ncalls so far', ai.count);
})();
