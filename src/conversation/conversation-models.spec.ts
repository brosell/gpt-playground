import { ConversationNavigator , IStreamOfConsciousness, IChatPoint, IPersona } from './conversation-models';

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
  });
});


describe('ConversationNavigator thread to completions', () => {
    let navigator: ConversationNavigator;
    let streamOfConsciousness: IStreamOfConsciousness;
    let personas: IPersona[];
  
    beforeEach(() => {
      personas = [{
        id: 'persona-1',
        instructionsPrefix: 'System says: ',
      }];
  
      streamOfConsciousness = {
        id: 'stream-1',
        topic: 'Test Topic',
        chatPoints: []
      };
  
      navigator = new ConversationNavigator(streamOfConsciousness);
      // Mocking the personas array inside navigator instance
      navigator['personas'] = personas;
    });
  
    describe('threadToCompletions', () => {
      it('should convert a thread of chat points with both userMessage and assistantMessage into a sequence of completions', () => {
        const thread: IChatPoint[] = [
          { id: 'cp-1', streamId: 'stream-1', userMessage: 'Hello', assistantMessage: 'Hi there!' },
          { id: 'cp-2', streamId: 'stream-1', userMessage: 'How are you?', parentChatPointId: 'cp-1', assistantMessage: 'I am fine, thank you!' },
        ];
  
        const completions = navigator.threadToCompletions(thread);
  
        expect(completions).toEqual([
          { role: 'USER', content: 'Hello' },
          { role: 'ASSISTANT', content: 'Hi there!' },
          { role: 'USER', content: 'How are you?' },
          { role: 'ASSISTANT', content: 'I am fine, thank you!' },
        ]);
      });
  
      it('should include a SYSTEM role message if a chat point has a persona', () => {
        const thread: IChatPoint[] = [
          { id: 'cp-1', streamId: 'stream-1', userMessage: 'Hello', assistantMessage: 'Hi there!', persona: 'persona-1' },
          { id: 'cp-2', streamId: 'stream-1', userMessage: 'How are you?', parentChatPointId: 'cp-1', assistantMessage: 'I am fine, thank you!' },
        ];
  
        const completions = navigator.threadToCompletions(thread);
  
        expect(completions).toEqual([
          { role: 'SYSTEM', content: 'System says: ' },
          { role: 'USER', content: 'Hello' },
          { role: 'ASSISTANT', content: 'Hi there!' },
          { role: 'USER', content: 'How are you?' },
          { role: 'ASSISTANT', content: 'I am fine, thank you!' },
        ]);
      });

      it('should include a SYSTEM role message if a chat point has a persona', () => {
        const thread: IChatPoint[] = [
          { id: 'cp-1', streamId: 'stream-1', userMessage: 'Hello', assistantMessage: 'Hi there!' },
          { id: 'cp-2', streamId: 'stream-1', userMessage: 'How are you?', parentChatPointId: 'cp-1', assistantMessage: 'I am fine, thank you!' },
        ];
  
        const completions = navigator.threadToCompletions(thread);
  
        expect(completions).toEqual([
          { role: 'USER', content: 'Hello' },
          { role: 'ASSISTANT', content: 'Hi there!' },
          { role: 'USER', content: 'How are you?' },
          { role: 'ASSISTANT', content: 'I am fine, thank you!' },
        ]);
      });
    });


    
    it('should include a SYSTEM role message as the first completion if any chat point has a persona', () => {
      const thread: IChatPoint[] = [
        { id: 'cp-1', streamId: 'stream-1', userMessage: 'Initial message', assistantMessage: 'Initial response' },
        { id: 'cp-2', streamId: 'stream-1', userMessage: 'Follow-up question?', parentChatPointId: 'cp-1', assistantMessage: 'Follow-up response', persona: 'persona-1' },
        { id: 'cp-3', streamId: 'stream-1', userMessage: 'Another user message', parentChatPointId: 'cp-2' },
      ];
  
      const completions = navigator.threadToCompletions(thread);
  
      expect(completions).toEqual([
        { role: 'SYSTEM', content: 'System says: ' },
        { role: 'USER', content: 'Initial message' },
        { role: 'ASSISTANT', content: 'Initial response' },
        { role: 'USER', content: 'Follow-up question?' },
        { role: 'ASSISTANT', content: 'Follow-up response' },
        { role: 'USER', content: 'Another user message' },
      ]);
    });

    it('should only use the most recent persona for the SYSTEM role message', () => {
      const thread: IChatPoint[] = [
        { id: 'cp-1', streamId: 'stream-1', userMessage: 'Initial message', assistantMessage: 'Initial response', persona: 'persona-1' },
        { id: 'cp-2', streamId: 'stream-1', userMessage: 'Follow-up question?', parentChatPointId: 'cp-1', assistantMessage: 'Follow-up response' },
        { id: 'cp-3', streamId: 'stream-1', userMessage: 'Another user message', parentChatPointId: 'cp-2', persona: 'persona-1' },
      ];
  
      const completions = navigator.threadToCompletions(thread);
  
      expect(completions).toEqual([
        { role: 'SYSTEM', content: 'System says: ' },
        { role: 'USER', content: 'Initial message' },
        { role: 'ASSISTANT', content: 'Initial response' },
        { role: 'USER', content: 'Follow-up question?' },
        { role: 'ASSISTANT', content: 'Follow-up response' },
        { role: 'USER', content: 'Another user message' },
      ]);
    });

    it('should only use the most recent persona for the SYSTEM role message when multiple ChatPoints have a persona', () => {
      // Adding a second persona with a different instructionsPrefix
      personas.push({
        id: 'persona-2',
        instructionsPrefix: 'Second System says: ',
      });
  
      const thread: IChatPoint[] = [
        { id: 'cp-1', streamId: 'stream-1', userMessage: 'Initial message', assistantMessage: 'Initial response', persona: 'persona-1' },
        { id: 'cp-2', streamId: 'stream-1', userMessage: 'Follow-up question?', parentChatPointId: 'cp-1', assistantMessage: 'Follow-up response', persona: 'persona-2' },
        { id: 'cp-3', streamId: 'stream-1', userMessage: 'Another user message', parentChatPointId: 'cp-2' },
      ];
  
      const completions = navigator.threadToCompletions(thread);
  
      expect(completions).toEqual([
        { role: 'SYSTEM', content: 'Second System says: ' }, // Expecting the most recent persona's message
        { role: 'USER', content: 'Initial message' },
        { role: 'ASSISTANT', content: 'Initial response' },
        { role: 'USER', content: 'Follow-up question?' },
        { role: 'ASSISTANT', content: 'Follow-up response' },
        { role: 'USER', content: 'Another user message' },
      ]);
    });
  });
