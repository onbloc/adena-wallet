import {
  UseQueryOptions, UseQueryResult,
} from '@tanstack/react-query'
import React from 'react'

import {
  ManageTokenListWrapper,
} from './manage-token-list.styles'
import ManageTokenListItem from './manage-token-list-item'

export interface ManageTokenInfo {
  tokenId: string
  type: 'token'
  logo: string
  name: string
  display?: boolean
  main?: boolean
  balance: {
    value: string
    denom: string
  }
}

export interface ManageGRC721Info {
  tokenId: string
  type: 'grc721'
  packagePath: string
  isTokenUri: boolean
  name: string
  display?: boolean
}

export interface ManageTokenListProps {
  tokens: ManageTokenInfo[] | ManageGRC721Info[]
  queryGRC721TokenUri?: (
    packagePath: string,
    tokenId: string,
    options?: Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>,
  ) => UseQueryResult<string | null>
  queryGRC721Balance?: (
    packagePath: string,
    options?: Omit<UseQueryOptions<number | null, Error>, 'queryKey' | 'queryFn'>,
  ) => UseQueryResult<number | null>
  onToggleActiveItem: (tokenId: string, activated: boolean) => void
}

const ManageTokenList: React.FC<ManageTokenListProps> = ({
  tokens,
  queryGRC721TokenUri,
  queryGRC721Balance,
  onToggleActiveItem,
}) => {
  return (
    <ManageTokenListWrapper>
      {tokens.map((token, index) => (
        <ManageTokenListItem
          key={index}
          token={token}
          onToggleActiveItem={onToggleActiveItem}
          queryGRC721TokenUri={queryGRC721TokenUri}
          queryGRC721Balance={queryGRC721Balance}
        />
      ))}
    </ManageTokenListWrapper>
  )
}

export default ManageTokenList
