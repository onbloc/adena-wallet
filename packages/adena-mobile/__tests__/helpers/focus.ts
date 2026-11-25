import { TextInput } from 'react-native';

// The jest TextInput mock shares one `focus` mock across instances; its call contexts tell them apart.
export const focusMock = (): jest.Mock => (TextInput as unknown as { prototype: { focus: jest.Mock } }).prototype.focus;

export const focusedTestIds = (): (string | undefined)[] =>
  focusMock().mock.contexts.map(context => (context as { props: { testID?: string } }).props.testID);
