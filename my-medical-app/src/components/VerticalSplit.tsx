import { useCallback, useEffect, useState } from 'react';

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  storageKey: string;
  initialLeftWidth: number;
}

const getCookie = (name: string): string | null => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
};

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000`;
};

export default function VerticalSplit({ left, right, storageKey, initialLeftWidth }: Props) {
  const [leftWidth, setLeftWidth] = useState(() => {
    const c = getCookie(storageKey);
    return c ? Number(c) : initialLeftWidth;
  });

  useEffect(() => {
    setCookie(storageKey, String(leftWidth));
  }, [leftWidth, storageKey]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        setLeftWidth(Math.max(150, startWidth + delta));
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [leftWidth],
  );

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <div style={{ width: leftWidth }} className="border-r">
        {left}
      </div>
      <div className="w-2 cursor-col-resize bg-gray-200" onMouseDown={onMouseDown} />
      <div className="flex-1">
        {right}
      </div>
    </div>
  );
}
