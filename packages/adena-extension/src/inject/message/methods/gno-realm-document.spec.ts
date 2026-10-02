import {
  handleFetchRealmDocument,
  isFetchRealmDocumentMessage,
} from './gno-realm-document';

const mockGetRealmDocument = jest.fn();

jest.mock('@common/provider/gno/gno-provider', () => ({
  GnoProvider: jest.fn().mockImplementation(() => ({
    getRealmDocument: mockGetRealmDocument,
  })),
}));

const messageData = {
  rpc: 'https://rpc.gno.land',
  chainId: 'gnoland-1',
  packagePath: 'gno.land/r/gnoland/blog',
};

const makeMessage = () =>
  ({
    type: 'FETCH_REALM_DOCUMENT',
    data: { ...messageData },
  }) as const;

describe('isFetchRealmDocumentMessage', () => {
  it('accepts a well-formed realm document request', () => {
    expect(isFetchRealmDocumentMessage(makeMessage())).toBe(true);
  });

  it('rejects other message types', () => {
    expect(
      isFetchRealmDocumentMessage({ type: 'GNO_SESSION_UPDATE', data: messageData }),
    ).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isFetchRealmDocumentMessage(null)).toBe(false);
    expect(isFetchRealmDocumentMessage('FETCH_REALM_DOCUMENT')).toBe(false);
  });

  it('rejects requests with missing or empty fields', () => {
    expect(isFetchRealmDocumentMessage({ type: 'FETCH_REALM_DOCUMENT' })).toBe(false);
    expect(
      isFetchRealmDocumentMessage({
        type: 'FETCH_REALM_DOCUMENT',
        data: { ...messageData, rpc: '' },
      }),
    ).toBe(false);
    expect(
      isFetchRealmDocumentMessage({
        type: 'FETCH_REALM_DOCUMENT',
        data: { ...messageData, chainId: 1 },
      }),
    ).toBe(false);
    expect(
      isFetchRealmDocumentMessage({
        type: 'FETCH_REALM_DOCUMENT',
        data: { ...messageData, packagePath: '' },
      }),
    ).toBe(false);
  });
});

describe('handleFetchRealmDocument', () => {
  beforeEach(() => {
    mockGetRealmDocument.mockReset();
  });

  it('returns the realm document fetched by the background provider', async () => {
    const document = {
      package_path: 'gno.land/r/gnoland/blog',
      package_line: '',
      package_doc: '',
      values: [],
      funcs: [],
    };
    mockGetRealmDocument.mockResolvedValue(document);

    const response = await handleFetchRealmDocument(makeMessage());

    expect(response).toEqual({ document });
    expect(mockGetRealmDocument).toHaveBeenCalledWith('gno.land/r/gnoland/blog');
  });

  it('resolves a null document and the error when the fetch fails', async () => {
    mockGetRealmDocument.mockRejectedValue(new Error('blocked by CSP'));

    const response = await handleFetchRealmDocument(makeMessage());

    expect(response.document).toBeNull();
    expect(response.error).toContain('blocked by CSP');
  });
});
