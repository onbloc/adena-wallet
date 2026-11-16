import React, { useCallback, useEffect, useMemo, useState } from 'react';

import ManageCollections from '@components/pages/manage-nft/manage-collections/manage-collections';
import { ManageTokenLayout } from '@components/pages/manage-token-layout';
import { useNFTCollectionHandler } from '@hooks/nft/use-collection-handler';
import { useGetGRC721Balance } from '@hooks/nft/use-get-grc721-balance';
import { useGetGRC721Collections } from '@hooks/nft/use-get-grc721-collections';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import useAppNavigate from '@hooks/use-app-navigate';
import { ManageGRC721Info } from '@types';

const ManageNFTContainer: React.FC = () => {
  const { goBack } = useAppNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isClose, setIsClose] = useState(false);
  const { data: collections, refetch: refetchCollections } = useGetGRC721Collections({
    refetchOnMount: true,
  });
  const { showCollection, hideCollection } = useNFTCollectionHandler();

  useEffect(() => {
    if (isClose) {
      goBack();
    }
  }, [isClose]);

  const filteredCollections: ManageGRC721Info[] = useMemo(() => {
    if (!collections) {
      return [];
    }

    const comparedKeyword = searchKeyword.toLowerCase();
    const filteredCollections = collections
      .filter((collection) => {
        if (comparedKeyword === '') return true;
        if (collection.name.toLowerCase().includes(comparedKeyword)) return true;
        if (collection.symbol.toLowerCase().includes(comparedKeyword)) return true;
        return false;
      })
      .map((collection) => {
        return {
          ...collection,
          type: 'grc721' as const,
          balance: '0',
          logo: collection.isTokenUri ? collection.packagePath : '',
        };
      });
    return filteredCollections;
  }, [searchKeyword, collections]);

  const onChangeKeyword = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  const onToggleActiveItem = useCallback(
    (packagePath: string, activated: boolean) => {
      if (activated) {
        showCollection(packagePath).then(() => refetchCollections());
      } else {
        hideCollection(packagePath).then(() => refetchCollections());
      }
    },
    [showCollection, hideCollection],
  );

  const onClickClose = useCallback(() => {
    setIsClose(true);
  }, []);

  return (
    <ManageTokenLayout>
      <ManageCollections
        keyword={searchKeyword}
        collections={filteredCollections}
        queryGRC721Balance={useGetGRC721Balance}
        queryGRC721TokenUri={useGetGRC721TokenUri}
        onClickClose={onClickClose}
        onChangeKeyword={onChangeKeyword}
        onToggleActiveItem={onToggleActiveItem}
      />
    </ManageTokenLayout>
  );
};

export default ManageNFTContainer;
