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

