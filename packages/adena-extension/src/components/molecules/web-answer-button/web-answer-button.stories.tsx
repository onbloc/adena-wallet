import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
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