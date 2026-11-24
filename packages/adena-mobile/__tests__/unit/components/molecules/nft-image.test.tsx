import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { NftImage } from '../../../../src/components/molecules';

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  const SvgUri = (props: object) => <View testID='svg-uri' {...props} />;
  const SvgXml = (props: object) => <View testID='svg-xml' {...props} />;

  return { __esModule: true, default: View, SvgUri, SvgXml };
});

describe('NftImage', () => {
  it('shows a skeleton while loading', async () => {
    await render(<NftImage uri='https://x.io/a.png' loading size={100} />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('falls back to the placeholder when an inline SVG fails', async () => {
    await render(<NftImage uri={`data:image/svg+xml,${encodeURIComponent('<svg/>')}`} />);
    await fireEvent(screen.getByTestId('svg-xml'), 'error');
    expect(screen.queryByTestId('svg-xml')).toBeNull();
  });

  it('falls back when a remote SVG fails', async () => {
    await render(<NftImage uri='https://x.io/a.svg' />);
    await fireEvent(screen.getByTestId('svg-uri'), 'error');
    expect(screen.queryByTestId('svg-uri')).toBeNull();
  });

  it('falls back when a raster image fails', async () => {
    const { container } = await render(<NftImage uri='https://x.io/a.png' />);
    const images = () => container.queryAll(node => node.type === 'Image');

    expect(images()).toHaveLength(1);
    await fireEvent(images()[0], 'error');
    expect(images()).toHaveLength(0);
  });

  it('renders the placeholder for unsupported URIs', async () => {
    await render(<NftImage uri='ipfs://abc' />);
    await render(<NftImage />);
    expect(screen.queryByTestId('svg-uri')).toBeNull();
  });

  it('tries a new source after a failure, and a late error from the old source cannot fail it', async () => {
    const view = await render(<NftImage uri='https://x.io/a.svg' />);
    const stale = screen.getByTestId('svg-uri');

    await view.rerender(<NftImage uri='https://x.io/b.svg' />);
    await fireEvent(stale, 'error');
    expect(screen.getByTestId('svg-uri').props.uri).toBe('https://x.io/b.svg');

    await fireEvent(screen.getByTestId('svg-uri'), 'error');
    expect(screen.queryByTestId('svg-uri')).toBeNull();
    await view.rerender(<NftImage uri='https://x.io/c.svg' />);
    expect(screen.getByTestId('svg-uri').props.uri).toBe('https://x.io/c.svg');
  });
});
