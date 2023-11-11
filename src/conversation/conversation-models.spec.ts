import { ConversationNavigator , IStreamOfConsciousness, IChatPoint } from './conversation-models';

describe('ConversationNavigator', () => {
  describe('ConversationNavigator1', () => {
    let cnInstance: ConversationNavigator ;
    let mockStreamOfConsciousness: IStreamOfConsciousness;

    beforeEach(() => {
      mockStreamOfConsciousness = {
        id: 'stream1',
        topic: 'Test Topic',
        chatPoints: [
          { id: 'cp1', streamId: 'stream1', userMessage: 'Root message' },
          { id: 'cp2', streamId: 'stream1', userMessage: 'Child message', parentChatPointId: 'cp1' },
          { id: 'cp3', streamId: 'stream1', userMessage: 'Leaf message', parentChatPointId: 'cp2' },
          { id: 'cp4', streamId: 'stream1', userMessage: 'Another root message' },
          { id: 'cp5', streamId: 'stream1', userMessage: 'Another leaf message', parentChatPointId: 'cp4' }
        ]
      };
      cnInstance = new ConversationNavigator (mockStreamOfConsciousness);
    });

    test('getAllThreads should return all threads from root nodes to leaves', () => {
      const threads = cnInstance.getAllThreads();
      expect(threads).toHaveLength(2); // We expect two threads based on the mock data
      console.log(threads);
      // Check the first thread
      expect(threads[0]).toEqual([
        { id: 'cp1', streamId: 'stream1', userMessage: 'Root message' },
        { id: 'cp2', streamId: 'stream1', userMessage: 'Child message', parentChatPointId: 'cp1' },
        { id: 'cp3', streamId: 'stream1', userMessage: 'Leaf message', parentChatPointId: 'cp2' }
      ]);

      // Check the second thread
      expect(threads[1]).toEqual([
        { id: 'cp4', streamId: 'stream1', userMessage: 'Another root message' },
        { id: 'cp5', streamId: 'stream1', userMessage: 'Another leaf message', parentChatPointId: 'cp4' }
      ]);
    });

    test('getAllThreads should return an empty array if there are no chat points', () => {
      // Create an instance with an empty list of chat points
      const emptySocInstance = new ConversationNavigator ({ ...mockStreamOfConsciousness, chatPoints: [] });
      const threads = emptySocInstance.getAllThreads();
      expect(threads).toEqual([]);
    });

    // Additional test cases can be added here to cover more scenarios
  });

  describe('ConversationNavigator2', () => {
    let streamOfConsciousness: IStreamOfConsciousness;
    let convNav: ConversationNavigator ;

    beforeEach(() => {
      streamOfConsciousness = {
        topic: 'Topic',
        chatPoints: [],
        id: 'stream1',
      };
      convNav = new ConversationNavigator (streamOfConsciousness);
    });

    describe('branchAt', () => {
      it('should create a new child chat point', () => {
        const parentChatPoint: IChatPoint = {
          id: 'cp1',
          streamId: 'stream1',
          userMessage: 'Parent message',
        };
        streamOfConsciousness.chatPoints.push(parentChatPoint);
        const tag = 'branch1';
        const userPrompt = 'Child message';

        const newChatPoint = convNav.branchAt(parentChatPoint, tag, userPrompt);

        expect(newChatPoint).toEqual({
          id: 'cp1-branch1',
          streamId: 'stream1',
          parentChatPointId: 'cp1',
          userMessage: 'Child message',
        });
      });
    });

    describe('forkAt', () => {
      it('should create a new root chat point forked from the given point', () => {
        const chatPoint: IChatPoint = {
          id: 'cp2',
          streamId: 'stream1',
          userMessage: 'Original message',
        };
        streamOfConsciousness.chatPoints.push(chatPoint);
        const tag = 'fork1';

        const newChatPoint = convNav.forkAt(chatPoint, tag);

        expect(newChatPoint).toEqual({
          id: 'stream1-fork1',
          streamId: 'stream1',
          forkedFromId: 'cp2',
          userMessage: '',
        });
      });
    });

    describe('getAllForks', () => {
      it('should return all forked threads', () => {
        const chatPoint1: IChatPoint = { id: 'cp1', streamId: 'stream1', userMessage: 'Message 1' };
        const chatPoint2: IChatPoint = { id: 'cp2', streamId: 'stream1', forkedFromId: 'cp1', userMessage: 'Message 2' };
        streamOfConsciousness.chatPoints.push(chatPoint1, chatPoint2);

        const forks = convNav.getAllForks();

        expect(forks).toEqual([[chatPoint2]]);
      });
    });

    describe('threadToCompletions', () => {
      it('should convert a thread to an array of completions', () => {
        const thread: IChatPoint[] = [
          { id: 'cp1', streamId: 'stream1', userMessage: 'User message', assistantMessage: 'Assistant message' },
          { id: 'cp2', streamId: 'stream1', userMessage: 'User message 2' },
        ];

        const completions = convNav.threadToCompletions(thread);

        expect(completions).toEqual([
          { role: 'ASSISTANT', content: 'Assistant message' },
          { role: 'USER', content: 'User message 2' },
        ]);
      });
    });
  });
});