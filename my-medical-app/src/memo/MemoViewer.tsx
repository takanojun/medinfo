import type { MemoItem } from './MemoApp';
import Markdown from 'react-markdown';

interface Props {
  memo: MemoItem | null;
  onEdit: () => void;
  onToggleDelete: () => void;
}

export default function MemoViewer({ memo, onEdit, onToggleDelete }: Props) {
  if (!memo) return <div className="flex-1 p-4">メモを選択してください</div>;
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex justify-end mb-2">
        <button
          className="bg-green-500 text-white px-2 py-1 rounded mr-2"
          onClick={onEdit}
        >
          編集
        </button>
        <button
          className="bg-red-500 text-white px-2 py-1 rounded"
          onClick={onToggleDelete}
        >
          {memo.deleted ? '復元' : '削除'}
        </button>
      </div>
      <div className="prose max-w-none">
        <Markdown>{memo.content}</Markdown>
      </div>
    </div>
  );
}
