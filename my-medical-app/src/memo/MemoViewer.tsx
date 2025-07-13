import type { MemoItem, MemoTag } from './MemoApp';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';

interface Props {
  memo: MemoItem | null;
  tagOptions: MemoTag[];
  onEdit: () => void;
  onToggleDelete: () => void;
  onShowHistory: () => void;
}

export default function MemoViewer({ memo, tagOptions, onEdit, onToggleDelete, onShowHistory }: Props) {
  if (!memo) return <div className="flex-1 p-4">メモを選択してください</div>;
  const tags = memo.tag_ids
    .map((id) => tagOptions.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex justify-end mb-2 space-x-2">
        <button
          className="bg-green-500 text-white px-2 py-1 rounded mr-2"
          onClick={onEdit}
        >
          編集
        </button>
        <button
          className="bg-blue-500 text-white px-2 py-1 rounded"
          onClick={onShowHistory}
        >
          履歴
        </button>
        <button
          className="bg-red-500 text-white px-2 py-1 rounded"
          onClick={onToggleDelete}
        >
          {memo.deleted ? '復元' : '削除'}
        </button>
      </div>
      <div className="prose max-w-none">
        <Markdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
        >
          {memo.content}
        </Markdown>
      </div>
      {tags && <div className="mt-2 text-sm text-gray-600">タグ: {tags}</div>}
    </div>
  );
}
