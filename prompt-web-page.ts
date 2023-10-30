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

// function getTitleFromHtml(html: string): string {
//   const regex = /<title>(.*?)<\/title>/i;
//   const match = html.match(regex);
//   return match ? match[1] : '';
// }

function getTitleFromHtml(html: string): string {
  const regex = /<title[^>]*>([^<]+)<\/title>/i;
  const match = html.match(regex);
  return match ? match[1] : '';
}

async function fetchBlogText(blogUrl: string): Promise<{ title: string; content: string; }> {
  // Fetch the blog
  const response = await fetch(blogUrl);
  
  // Get the text from the response
  const text = await response.text();
  
  // Translate the text
  const translatedText = NodeHtmlMarkdown.translate(text);

  return { title:getTitleFromHtml(text),  content: translatedText };
}

function buildPrompt(promptTemplate: string, params: Record<string, string>): string {
  return promptTemplate.replace(/{{(.*?)}}/g, (match, token) => {
    return params[token.trim()] || match;
  });
}


(async () => {
  const question = 'Should we prevent AI from taking over the world?';
  const url = blogs.endOfTheWorld;

  console.log('question', question);

 const { title, content } = await fetchBlogText(url);
  console.log('title', title);
  // const titlePrompt = buildPrompt(prompts.TITLE_IS_RELEVANT, { question, title })
  const isRelevant = await askGpt(buildPrompt(prompts.TITLE_IS_RELEVANT, { question, title }));
  console.log('relevant title', isRelevant);
  if (isRelevant.startsWith("FALSE")) {
    console.log('article not relevant based on title');
    return;
  }

  const hitsAndMisses = await promptOnSegments(content, (chunk: string) => buildPrompt(prompts.COULD_ANSWER, { question, chunk }));

  const [hits, misses] = partition(hitsAndMisses, r => !r.startsWith('FALSE') && !!r);

  const highlights = (hits as string[])
    .reduce((a, c) => `${a}\n${c.substring(4)}`, '')
    .trim();

  if(highlights) {
    const finalPrompt = buildPrompt( prompts.ANSWER, {question, chunk:highlights});
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

