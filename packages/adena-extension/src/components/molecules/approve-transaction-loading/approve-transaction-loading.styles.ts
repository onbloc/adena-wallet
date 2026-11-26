import mixins from '@styles/mixins';
import styled from 'styled-components';

import { ApproveLoadingRoundedBox as ApproveTransactionLoadingRoundedBox } from '../approve-loading/approve-loading.styles';

export {
  ApproveLoadingAllRadiusBox as ApproveTransactionLoadingAllRadiusBox,
  ApproveLoadingBottomRadiusBox as ApproveTransactionLoadingBottomRadiusBox,
  ApproveLoadingRoundedBox as ApproveTransactionLoadingRoundedBox,
  ApproveLoadingSkeletonBox as ApproveTransactionLoadingSkeletonBox,
} from '../approve-loading/approve-loading.styles';

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
    margin: 24px auto 12px auto;
  }
`;

export const ApproveTransactionLoadingTopRadiusBox = styled(ApproveTransactionLoadingRoundedBox)`
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  margin: 2px 0px 2px;
  height: 45px;
`;
