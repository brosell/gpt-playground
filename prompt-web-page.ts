//https://pub.towardsai.net/engineering-prompt-chains-with-language-models-to-craft-a-summarizer-almighty-web-app-7286de0b0a71

import OpenAI from 'openai';
import prompts from './prompts';
import blogs from './testdata/blog';
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { partition } from './src/utils';
import { calculateTextSegmentPositions } from './src/text-segmenter';


const openai = new OpenAI({
  //apiKey: 'sk-????' //process.env["OPENAI_API_KEY"]
});

const askGpt = async (prompt: string, model: string = 'gpt-3.5-turbo'): Promise<string> => {
  // console.log('prompt', prompt);
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'you are a very helpful information reviewer.'},
        { role: 'user', content: prompt }
      ],
      model,
    });
  
    return chatCompletion?.choices[0]?.message.content ?? 'FALSE -m';

  } catch (error) {
    return `FALSE -${error}`;
  }
};

function getTitleFromHtml(html: string): string {
  const regex = /<title[^>]*>([^<]+)<\/title>/i;
  const match = html.match(regex);
  return match ? match[1] : '';
}

function removeTagsAndContents(input: string, tags: string[]): string {
  tags.forEach(tag => {
      const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\/${tag}>)<[^<]*)*<\/${tag}>`, 'gi');
      input = input.replace(regex, '');
  });
  return input;
}
function removeExtraWhitespaceAndLinefeeds(input: string): string {
  return input.replace(/\s+|\n|\r/g, ' ').trim();
}
function removeHTMLTags(input: string): string {
  return input.replace(/<\/?[^>]+(>|$)/g, "");
}

async function fetchBlogText(blogUrl: string): Promise<{ title: string; content: string; }> {
  const response = await fetch(blogUrl);
  const text = await response.text();
  let result = removeHTMLTags(removeTagsAndContents(text, ['head', 'script'])); //NodeHtmlMarkdown.translate(text);
  result = removeExtraWhitespaceAndLinefeeds(result);
  // console.log(result);
  // process.exit(0);

  return { title: getTitleFromHtml(text),  content: result };
}

(async () => {
  const question = 'how do I promote mentally healthy kids';
  const url = blogs.healthyKids;

  const { title, content } = await fetchBlogText(url);
  const isRelevant = await askGpt(prompts.TITLE_IS_RELEVANT({ question, title }));
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
    const finalAnswer = await askGpt(finalPrompt);
    console.log('\n\n----\n', finalAnswer);
  } else {
    console.log('no help');
  }
})();

async function reducingPrompt(text: any, promptFn:any) {
  const chunkLocs = calculateTextSegmentPositions(text, 256, 20);
  const promises = chunkLocs
    .map(loc => text.substring(loc.start, loc.end))
    .map(chunk => askGpt(promptFn(chunk)));

  const hitsAndMisses = await Promise.all(promises);
  return hitsAndMisses;
}

