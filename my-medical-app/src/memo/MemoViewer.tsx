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
  const tagObjs = memo.tag_ids
    .map((id) => tagOptions.find((t) => t.id === id))
    .filter(Boolean) as MemoTag[];

  const getContrast = (hex?: string) => {
    if (!hex) return '#000';
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
  };
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
      {tagObjs.length > 0 && (
        <div className="mt-2 text-sm flex flex-wrap gap-1">
          {tagObjs.map((t) => (
            <span
              key={t.id}
              className="px-1 rounded"
              style={{ backgroundColor: t.color || '#bfdbfe', color: getContrast(t.color) }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
