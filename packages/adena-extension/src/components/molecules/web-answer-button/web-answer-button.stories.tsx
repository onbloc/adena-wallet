import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import WebAnswerButton from './web-answer-button';

export default {
  title: 'components/molecules/WebAnswerButton',
  component: WebAnswerButton,
} as Meta<typeof WebAnswerButton>;

export const Default: StoryObj<typeof WebAnswerButton> = {
  args: {
    correct: true,
    selected: false,
    answer: 'answer',
    onClick: action('click answer'),
  },
};