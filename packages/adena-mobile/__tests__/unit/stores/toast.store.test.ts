import { useToastStore } from '../../../src/stores/toast.store';
import { StatusTone } from '../../../src/theme/colors';

describe('useToastStore', () => {
  it('shows info toasts by default with increasing ids', () => {
    expect(useToastStore.getState().toast).toBeNull();
    useToastStore.getState().show('Copied');

    const first = useToastStore.getState().toast;

    expect(first).toMatchObject({ tone: StatusTone.INFO, message: 'Copied' });
    useToastStore.getState().show('Failed', StatusTone.ERROR);

    const second = useToastStore.getState().toast;

    expect(second).toMatchObject({ tone: 'error', message: 'Failed' });
    expect((second?.id ?? 0) > (first?.id ?? 0)).toBe(true);
  });

  it('gives repeated messages a new id', () => {
    useToastStore.getState().show('same');

    const id = useToastStore.getState().toast?.id;

    useToastStore.getState().show('same');
    expect(useToastStore.getState().toast?.id).not.toBe(id);
  });

  it('dismisses', () => {
    useToastStore.getState().show('x');
    useToastStore.getState().dismiss();
    expect(useToastStore.getState().toast).toBeNull();
  });
});
