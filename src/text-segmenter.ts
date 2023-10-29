export type TextSegmentBounds = {
  start: number;
  end: number;
};

function getSegmentBreakPoints(input: string, segmentSize: number): number[] {
  let result: number[] = [0];
  let index = 0;
  while (index < input.length) {
    let spaceIndex = index + segmentSize;
    if (spaceIndex > input.length) {
      break;
    }
    while (input[spaceIndex] !== ' ' && input[spaceIndex] !== '\n' && spaceIndex > index) {
      spaceIndex--;
    }
    if (spaceIndex === index) {
      spaceIndex = index + 1000;
    }
    result.push(spaceIndex);
    index = spaceIndex + 1;
  }
  return result;
}

function calculateMovingWindowLimits(chunkPositions: number[], chunksPerSet: number): TextSegmentBounds[] {
  if (chunkPositions.length <= chunksPerSet) {
    return [{ start: 0, end: Number.MAX_SAFE_INTEGER} ]
  }

  const increment = chunksPerSet - 1;
  const answer:{ start: number, end: number }[] = [];
  for (let i=0; i<chunkPositions.length - chunksPerSet; i+=increment) {
    answer.push({ start: chunkPositions[i], end: chunkPositions[i+chunksPerSet]});
  }

  if (answer[answer.length-1].end < chunkPositions[chunkPositions.length-1]) {
    answer.push( { start: answer[answer.length-1].end, end: chunkPositions[chunkPositions.length-1] });
  }
  return answer;
}

export function calculateTextSegmentPositions(text: string, chunkSize:number = 500, chunksPerSet:number = 5): TextSegmentBounds[] {
  const spaces = getSegmentBreakPoints(text, chunkSize);
  return calculateMovingWindowLimits(spaces, chunksPerSet);
}
