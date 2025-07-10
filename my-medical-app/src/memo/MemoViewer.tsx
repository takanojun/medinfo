import React from 'react';
import type { MemoItem } from './MemoApp';
import ReactMarkdown from 'react-markdown';

interface Props {
  memo: MemoItem | null;
}

export default function MemoViewer({ memo }: Props) {
  if (!memo) return <div className="flex-1 p-4">メモを選択してください</div>;
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex justify-end mb-2">
        <button className="bg-green-500 text-white px-2 py-1 rounded">編集</button>
      </div>
      <ReactMarkdown className="prose max-w-none">{memo.content}</ReactMarkdown>
    </div>
  );
}
