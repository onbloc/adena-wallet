import styled from 'styled-components';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export const CreateMultisigAccountWrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  padding: 24px 20px;
`;

export const CreateMultisigAccountDomainWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })};
  width: 100%;
  min-height: 41px;
  border-radius: 24px;
  padding: 10px 18px;
  margin: 24px auto 12px auto;
  gap: 7px;
  background-color: ${getTheme('neutral', '_9')};
  ${fonts.body2Reg};

  .logo {
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }
`;

export const CreateMultisigAccountContentWrapper = styled.div`
  ${mixins.flex({ direction: 'column' })};
  gap: 12px;
  width: 100%;
  padding-bottom: 96px;
`;

export const CreateMultisigAccountInfoWrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start', direction: 'column' })};
  width: 100%;
  gap: 8px;
  margin-bottom: 8px;
`;
