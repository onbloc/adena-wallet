import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { WebMultisigSignerInput } from '.';

const meta: Meta<typeof WebMultisigSignerInput> = {
  title: 'components/molecules/WebMultisigSignerInput',
  component: WebMultisigSignerInput,
};

export default meta;
type Story = StoryObj<typeof WebMultisigSignerInput>;

export const CreateMode: Story = {
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', ''],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null,
  },
};

export const CreateModeMultipleSigners: Story = {
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: [
      'g1abc123def456ghi789jkl012mno345pqr678stu',
      'g1xyz987wvu654tsr321qpo098nml765kji432hgf',
      'g1mno345pqr678stu901vwx234yz567abc890def',
      '',
    ],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null,
  },
};

export const CreateModeWithError: Story = {
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', 'invalid-address'],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: 'Invalid signer address format',
  },
};

export const ImportMode: Story = {
  args: {
    mode: 'IMPORT',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: [
      'g1abc123def456ghi789jkl012mno345pqr678stu',
      'g1xyz987wvu654tsr321qpo098nml765kji432hgf',
    ],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null,
  },
};

export const ImportModeMultipleSigners: Story = {
  args: {
    mode: 'IMPORT',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: [
      'g1abc123def456ghi789jkl012mno345pqr678stu',
      'g1xyz987wvu654tsr321qpo098nml765kji432hgf',
      'g1mno345pqr678stu901vwx234yz567abc890def',
      'g1def890ghi123jkl456mno789pqr012stu345vwx',
    ],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null,
  },
};

export const ImportModeWithError: Story = {
  args: {
    mode: 'IMPORT',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: ['g1abc123def456ghi789jkl012mno345pqr678stu', ''],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: 'At least 2 signers are required',
  },
};

export const EmptySigners: Story = {
  args: {
    mode: 'CREATE',
    currentAddress: 'g1abc123def456ghi789jkl012mno345pqr678stu',
    signers: [''],
    onSignerChange: () => {},
    onAddSigner: () => {},
    onRemoveSigner: () => {},
    multisigConfigError: null,
  },
};
