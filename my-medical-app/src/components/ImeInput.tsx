import React, { forwardRef } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement>;

const ImeInput = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input lang="ja" inputMode="kana" {...props} ref={ref} />
));

ImeInput.displayName = 'ImeInput';

export default ImeInput;
