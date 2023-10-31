import fs from 'fs';

// from: https://dev.to/nexxeln/implementing-the-pipe-operator-in-typescript-30ip
// https://www.30secondsofcode.org/js/s/pipe-async-functions/


// export interface Pipe {
//   <A>(value: A): A;
//   <A, B>(value: A, fn1: (input: A) => B): B;
//   <A, B, C>(value: A, fn1: (input: A) => B, fn2: (input: B) => C): C;
//   <A, B, C, D>(
//     value: A,
//     fn1: (input: A) => B,
//     fn2: (input: B) => C,
//     fn3: (input: C) => D
//   ): D;
//   <A, B, C, D, E>(
//     value: A,
//     fn1: (input: A) => B,
//     fn2: (input: B) => C,
//     fn3: (input: C) => D,
//     fn4: (input: D) => E
//   ): E;
//   // ... and so on
// }

// // export const pipe: Pipe = (value: any, ...fns: Function[]): unknown => {
// //   return fns.reduce( (acc, fn) => fn(acc), value);
// // };

export const pipe = async (value: any, ...fns: Function[]): Promise<any> => {
  for (let i = 0; i < fns.length; i++) {
    value = await fns[i](value);
  }
  return value;
}

export const partition = <T>(ary: Array<T>, callback: (n: T) => boolean): [T[], T[]] =>
  ary.reduce(([pass, fail], e) => {
    return callback(e) ? [[...pass, e], fail] : [pass, [...fail, e]];
  }, [[], []] as [T[], T[]]);

  function constructTemplateString(templateString: string, params: Record<string, string>): string {
    return templateString.replace(/{{(.*?)}}/g, (match, token) => {
      return params[token.trim()] || match;
    });
  }
  
  export const templateStringConstructor  = (template: string) => {
    return (params: Record<string, string>) => constructTemplateString(template, params)
  }

  export const tStringConstructor = <T extends Record<string, any>>(template: string) => {
    return (params: T) => constructTemplateString(template, params);
  }

export class IteratingFileWriter {
  datePrefix = Math.ceil(Math.random() * 300); // new Date().toISOString().replace(':', '.');
  itr: number = 0;

  constructor(private basename: string) { }

  write(contents: string) {
    this.itr++;
    const filePath = `${process.cwd()}/out/${this.datePrefix}_${this.basename}_${this.itr}.txt`;

    fs.writeFileSync(filePath, contents, 'utf8');
  }
  
}

