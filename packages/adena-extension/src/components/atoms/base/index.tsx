import styled from 'styled-components';

export const View = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Row = styled(View)`
  flex-direction: row;
  align-items: center;
`;

export const Pressable = styled(View)<{ onClick: () => void }>`
  cursor: pointer;
`;
