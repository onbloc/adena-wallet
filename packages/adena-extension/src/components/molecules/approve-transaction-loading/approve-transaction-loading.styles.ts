import styled from 'styled-components';

import { SkeletonBoxStyle } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

export const ApproveTransactionLoadingWrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  padding: 35px 20px 0;

  .l-approve {
    position: absolute;
    bottom: 0;
    width: 100%;
    padding: 24px 20px;
  }

  .domain-skeleton {
    margin: 24px auto;
  }
`;

export const ApproveTransactionLoadingSkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-end', justify: 'space-between' })}
  width: 80px;
  height: 80px;
  margin: 35px 0px 24px;
  border-radius: 8px;
`;

export const ApproveTransactionLoadingRoundedBox = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  height: 41px;
  background-color: ${getTheme('neutral', '_9')};
  padding: 0px 18px;
`;

export const ApproveTransactionLoadingAllRadiusBox = styled(ApproveTransactionLoadingRoundedBox)<{
  align?: string;
}>`
  border-radius: 24px;
  justify-content: ${({ align }): string | undefined => align && align};
`;

export const ApproveTransactionLoadingTopRadiusBox = styled(ApproveTransactionLoadingRoundedBox)`
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  margin: 2px 0px 2px;
  height: 45px;
`;

export const ApproveTransactionLoadingBottomRadiusBox = styled(ApproveTransactionLoadingRoundedBox)`
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
  margin-bottom: 10px;
  height: 45px;
`;
