import type { MemoItem } from './MemoApp';
import ImeInput from '../components/ImeInput';

interface Props {
  memos: MemoItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  showDeleted: boolean;
  onToggleDeleted: () => void;
  search: string;
  onSearch: (v: string) => void;
  onCreate: () => void;
  className?: string;
}

export default function MemoList({
  memos,
  selectedId,
  onSelect,
  showDeleted,
  onToggleDeleted,
  search,
  onSearch,
  onCreate,
  className = '',
}: Props) {
  return (
    <div className={`overflow-y-auto p-2 space-y-2 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <ImeInput
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="タイトル検索"
          className="border p-1 flex-1 mr-2"
        />
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            className="mr-1"
            checked={showDeleted}
            onChange={onToggleDeleted}
          />
          削除済み
        </label>
      </div>
      <button
        className="bg-blue-500 text-white px-2 py-1 rounded w-full mb-2"
        onClick={onCreate}
      >
        ＋新規作成
      </button>
      <ul className="space-y-1">
        {memos.map((m) => (
          <li
            key={m.id}
            className={`p-2 border rounded cursor-pointer ${
              selectedId === m.id ? 'bg-blue-100' : ''
            }`}
            onClick={() => onSelect(m.id)}
          >
            {m.title}
            {m.deleted && <span className="text-xs text-red-500 ml-2">(削除)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
