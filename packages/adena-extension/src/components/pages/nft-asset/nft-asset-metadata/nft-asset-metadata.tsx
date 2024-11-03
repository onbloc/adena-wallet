import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721MetadataModel, GRC721Model } from '@types';
import React, { useMemo } from 'react';
import { NFTAssetMetadataWrapper } from './nft-asset-metadata.styles';

export interface NFTAssetMetadataProps {
  asset: GRC721Model;
  queryGRC721TokenMetadata: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<GRC721MetadataModel | null, Error>,
  ) => UseQueryResult<GRC721MetadataModel | null>;
}

const NFTAssetMetadata: React.FC<NFTAssetMetadataProps> = ({ asset, queryGRC721TokenMetadata }) => {
  const { data: tokenMetadata, isFetched: isFetchedTokenMetadata } = queryGRC721TokenMetadata(
    asset.packagePath,
    asset.tokenId,
    {
      enabled: asset.isMetadata,
      refetchOnMount: true,
    },
  );

  const isFetchedTokenMetadataWithEnabled = useMemo(() => {
    if (!asset.isMetadata) {
      return false;
    }

    return isFetchedTokenMetadata && !!tokenMetadata;
  }, [asset, tokenMetadata, isFetchedTokenMetadata]);

  if (!isFetchedTokenMetadataWithEnabled) {
    return <React.Fragment />;
  }

  return (
    <NFTAssetMetadataWrapper>
      <div className='content-wrapper'>
        <span className='title'>Description</span>
        <span className='content'>{tokenMetadata?.description}</span>
      </div>

      <div className='content-wrapper'>
        <span className='title'>Attributes</span>

        <div className='attribute-wrapper'>
          {tokenMetadata?.attributes.map((trait, index) => (
            <div key={index} className='trait-wrapper'>
              <span className='trait-type'>{trait.traitType}</span>
              <span className='trait-value'>{trait.value}</span>
            </div>
          ))}
        </div>
      </div>
    </NFTAssetMetadataWrapper>
  );
};

export default NFTAssetMetadata;
