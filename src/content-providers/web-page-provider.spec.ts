import { LocalFileProvider } from './web-page-provider';
import * as fs from 'fs';

jest.mock('fs');

describe('LocalFileProvider', () => {
  const mockFilename = 'test.txt';
  const mockContent = 'Hello, world!';

  beforeEach(() => {
    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);
  });

  it('should fetch file content', async () => {
    const localFileProvider = new LocalFileProvider(mockFilename, fs);
    const result = await localFileProvider.fetch();
    expect(fs.readFileSync).toHaveBeenCalledWith(mockFilename, 'utf-8');
    expect(result).toEqual({ title: mockFilename, content: mockContent });
  });

  // More tests...
});
