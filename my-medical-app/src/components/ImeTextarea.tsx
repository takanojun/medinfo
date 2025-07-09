import React, { forwardRef } from 'react';

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const ImeTextarea = forwardRef<HTMLTextAreaElement, Props>((props, ref) => (
  <textarea lang="ja" inputMode="kana" {...props} ref={ref} />
));

ImeTextarea.displayName = 'ImeTextarea';

export default ImeTextarea;
