import styled, { FlattenSimpleInterpolation } from 'styled-components';

export const AdditionalTokenSearchListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  max-height: 240px;

  .scroll-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow-y: auto;
  }

  .no-content {
    display: flex;
    width: 100%;
    margin: 40px auto 180px auto;
    color: ${({ theme }): string => theme.color.neutral[9]};
    ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body1Reg};
    justify-content: center;
    align-items: center;
  }
`;

export const AdditionalTokenSearchListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: auto;
  padding: 14px 15px;
  justify-content: space-between;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }): string => theme.color.neutral[6]};
  }

  .title {
    display: inline-block;
    flex-shrink: 0;
    max-width: calc(100% - 140px);
    color: ${({ theme }): string => theme.color.neutral[0]};
    ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Reg};

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 3px;
    }
  }

  .path {
    display: inline-block;
    flex-shrink: 0;
    max-width: 140px;
    color: ${({ theme }): string => theme.color.neutral[9]};
    ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Reg}
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
