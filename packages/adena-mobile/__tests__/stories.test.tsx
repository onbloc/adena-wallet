import { composeStories, setProjectAnnotations } from '@storybook/react';
import { render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { ComponentType } from 'react';

import preview from '../.storybook/preview';

// Every story is a render smoke test: a broken prop contract or a crashing state fails CI
// before anyone opens Storybook.
setProjectAnnotations(preview);

const findStories = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? findStories(path.join(dir, entry.name))
      : entry.name.endsWith('.stories.tsx') ? [path.join(dir, entry.name)] : []);

const storyFiles = findStories(path.join(__dirname, '../src'));

describe('stories', () => {
  it('finds story files', () => {
    expect(storyFiles.length).toBeGreaterThan(0);
  });

  describe.each(storyFiles.map(file => [path.relative(path.join(__dirname, '../src'), file), file]))('%s', (_name, file) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stories = composeStories(require(file));

    it.each(Object.entries(stories) as [string, ComponentType][])('%s renders', async (_story, Story) => {
      // RNTL 14 renders asynchronously; a throwing story rejects here.
      const screen = await render(<Story />);

      expect(screen.root).toBeTruthy();
      await screen.unmount();
    });
  });
});
