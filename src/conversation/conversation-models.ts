
type Id = string;

type Role = 'USER' | 'SYSTEM' | 'ASSISTANT';

type Thread = IChatPoint[];

interface IHaveId {
  id: Id;
}

export interface IPersona extends IHaveId {
  instructionsPrefix: string
}

export interface IStreamOfConsciousness extends IHaveId{
  topic: string;
  chatPoints: IChatPoint[]
};

export interface IChatPoint extends IHaveId{
  streamId: Id;
  parentChatPointId?: Id;
  forkedFromId?: Id;
  persona?: Id;

  userMessage: string;
  assistantMessage?: string; // if undefined then this chatpoint hasn't had the user's prompt sent yet
};

export interface ICompletion {
  role: Role;
  content: string;
}

// Provides tools for managing and navigating a stream of consciousness (SoC) data structure.
export interface IConversationNavigator  {
  // Retrieves a conversation thread ending with the specified chat point.
  getBranchToHere(end: IChatPoint): Thread;

  // Creates a new child chat point branching from the specified chat point.
  branchAt(cp: IChatPoint, tag: string, userPrompt: string): IChatPoint;

  // Creates a new root chat point forking from the specified chat point.
  forkAt(cp: IChatPoint, tag: string): IChatPoint;

  // Retrieves all threads from root to leaf chat points.
  getAllThreads(): Thread[];

  // Retrieves all forked threads from their fork points to leaf chat points.
  getAllForks(): Thread[];

  // Converts a thread of chat points into a sequence of completions.
  threadToCompletions(thread: Thread): ICompletion[];
}

export class ConversationNavigator  implements IConversationNavigator  {
  private personas: IPersona[];

  constructor(private streamOfConsciousness: IStreamOfConsciousness) { }

  getBranchToHere(end: IChatPoint): Thread {
    const thread: Thread = [];
    let current: IChatPoint | undefined = end;

    while (current) {
      thread.unshift(current);
      current = 
        this.streamOfConsciousness.chatPoints
          .find(cp => cp.id === current!.parentChatPointId);

    }

    return thread;
  }

  branchAt(cp: IChatPoint, tag: string, userPrompt: string): IChatPoint {
    const newChatPoint: IChatPoint = {
      id: `${cp.id}-${tag}`,
      streamId: cp.streamId,
      parentChatPointId: cp.id,
      userMessage: userPrompt,
    };
    this.streamOfConsciousness.chatPoints.push(newChatPoint);
    return newChatPoint;
  }

  forkAt(cp: IChatPoint, tag: string): IChatPoint {
    const newChatPoint: IChatPoint = {
      id: `${cp.streamId}-${tag}`,
      streamId: cp.streamId,
      forkedFromId: cp.id,
      userMessage: '',
    };
    this.streamOfConsciousness.chatPoints.push(newChatPoint);
    return newChatPoint;
  }

  private isLeafChatPoint(cp: IChatPoint): boolean {
    return !this.streamOfConsciousness.chatPoints.find(cpi => cpi.parentChatPointId === cp.id);
  }

  getAllThreads(): Thread[] {
    // Assuming we want to get all threads from root nodes to leaves
    const rootChatPoints = this.streamOfConsciousness.chatPoints
      .filter(this.isLeafChatPoint.bind(this));
    const threads: Thread[] = rootChatPoints.map(root => this.getBranchToHere(root));
    return threads
  }

  getAllForks(): Thread[] {
    // Assuming we want to get all forks starting from the forked point to leaves
    const forkedChatPoints = this.streamOfConsciousness.chatPoints.filter(cp => cp.forkedFromId);
    const forks: Thread[] = forkedChatPoints.map(fork => this.getBranchToHere(fork));
    return forks;
  }

  threadToCompletions(thread: Thread): ICompletion[] {
    const completions: ICompletion[] = [];
  
    // Find the latest IChatPoint with a personaId
    const latestPersonaChatPoint = thread.slice().reverse().find(cp => cp.persona);
    
    // If found, prepend the SYSTEM role message using the instructionPrefix from the IPersona
    if (latestPersonaChatPoint && latestPersonaChatPoint.persona) {
      const persona = this.personas.find(p => p.id === latestPersonaChatPoint.persona) as IPersona;
      completions.push({
        role: 'SYSTEM',
        content: persona.instructionsPrefix,
      });
    }
  
    // Convert the rest of the thread into ICompletion objects, ensuring USER message comes before ASSISTANT message
    for (const cp of thread) {
      completions.push({
        role: 'USER',
        content: cp.userMessage,
      });
      if (cp.assistantMessage) {
        completions.push({
          role: 'ASSISTANT',
          content: cp.assistantMessage,
        });
      }
    }
  
    return completions;
  }
}
