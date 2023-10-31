import fs from 'fs';

export interface IContentProvider {
  fetch(): Promise<{ title: string; content: string; }>;
}


export class LocalFileProvider implements IContentProvider{
  constructor(private filename: string) {}
  
  async fetch(): Promise<{ title: string; content: string; }> {
    const content = fs.readFileSync(this.filename, 'utf-8');
    console.log('file length', content.length)
    return {title: this.filename, content};
  }
}

export class WebPageProvider implements IContentProvider {
  constructor(private url: string) { }

  private getTitleFromHtml(html: string): string {
    const regex = /<title[^>]*>([^<]+)<\/title>/i;
    const match = html.match(regex);
    return match ? match[1] : '';
  }
  private removeTagsAndContents(input: string, tags: string[]): string {
    tags.forEach(tag => {
        const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\/${tag}>)<[^<]*)*<\/${tag}>`, 'gi');
        input = input.replace(regex, '');
    });
    return input;
  }
  private removeExtraWhitespaceAndLinefeeds(input: string): string {
    return input.replace(/\s+|\n|\r/g, ' ').trim();
  }
  private removeHTMLTags(input: string): string {
    return input.replace(/<\/?[^>]+(>|$)/g, "");
  }
  
  async fetch(clean: boolean = false): Promise<{ title: string; content: string; }> {
    const response = await fetch(this.url);
    let text = await response.text();
    if (!clean) {
      return { title: this.url, content: text };
    }
    
    let result = this.removeHTMLTags(this.removeTagsAndContents(text, ['head', 'script'])); //NodeHtmlMarkdown.translate(text);
    result = this.removeExtraWhitespaceAndLinefeeds(result);
  
    return { title: this.getTitleFromHtml(text),  content: result };
  }
}

export class GutenbergProvider extends WebPageProvider {

  cleanGutenbergMeta(text: string): string {
    let result = text.substring(
      text.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK'), 
      text.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK")
    );
    return result;
  }
}
