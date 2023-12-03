import styled from 'styled-components';

export const ToggleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  padding: 3px;
  border-radius: 100px;
  background-color: ${({ theme }): string => theme.color.neutral[4]};
  transition: 0.2s;
  cursor: pointer;

  .circle {
    display: block;
    width: 20px;
    height: 20px;
    background-color: ${({ theme }): string => theme.color.neutral[0]};
    border-radius: 20px;
    transition: 0.2s;
  }

  &.activated {
    background-color: ${({ theme }): string => theme.color.primary[4]};

    .circle {
      margin-left: 20px;
    }
  }
`;
