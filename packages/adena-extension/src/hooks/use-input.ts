import { useState, useCallback } from 'react';

function useInputs(init: any) {
  const [form, setForm] = useState(init);

  const onChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((form: any) => ({ ...form, [name]: value }));
  }, []);
  const reset = useCallback(() => setForm(init), [init]);
  return [form, onChange, reset];
}

export default useInputs;
