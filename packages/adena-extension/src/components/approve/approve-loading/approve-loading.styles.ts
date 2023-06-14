import { SkeletonBoxStyle } from '@components/loadings';
import styled from 'styled-components';

export const ApproveLoadingWrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  padding: 35px 20px 0;
  .l-approve {
    margin-top: 51px;
    margin-bottom: 24px;
  }
`;

export const ApproveLoadingSkeletonBox = styled(SkeletonBoxStyle)`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-end', 'space-between')}
  width: 80px;
  height: 80px;
  margin: 35px 0px 24px;
  border-radius: 8px;
`;

export const ApproveLoadingRoundedBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 41px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0px 18px;
`;

export const ApproveLoadingAllRadiusBox = styled(ApproveLoadingRoundedBox)<{ align?: string }>`
  border-radius: 24px;
  justify-content: ${({ align }) => align && align};
`;

export const ApproveLoadingTopRadiusBox = styled(ApproveLoadingRoundedBox)`
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  margin: 8px 0px 2px;
  height: 45px;
`;

export const ApproveLoadingBottomRadiusBox = styled(ApproveLoadingRoundedBox)`
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
  margin-bottom: 10px;
  height: 45px;
`;
