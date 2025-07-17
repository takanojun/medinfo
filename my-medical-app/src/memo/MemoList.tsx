import type { MemoItem } from './MemoApp';
import ImeInput from '../components/ImeInput';
import MultiSelect from '../components/MultiSelect';
import type { Option } from '../components/MultiSelect';
import type { MemoTag } from './MemoApp';

interface Props {
  memos: MemoItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  showDeleted: boolean;
  onToggleDeleted: () => void;
  search: string;
  onSearch: (v: string) => void;
  tagOptions: MemoTag[];
  tagFilter: number[];
  onTagFilterChange: (v: number[]) => void;
  onCreate: () => void;
  onMove: (id: number, direction: -1 | 1) => void;
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
  tagOptions,
  tagFilter,
  onTagFilterChange,
  onCreate,
  onMove,
  className = '',
}: Props) {
  const options: Option[] = tagOptions.map((t) => ({
    value: t.id,
    label: t.name,
    color: t.color,
  }));
  return (
    <div className={`flex flex-col h-full p-2 space-y-2 ${className}`}>
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
      <MultiSelect
        options={options}
        selected={tagFilter}
        onChange={onTagFilterChange}
        placeholder="タグで絞り込み"
        className="mb-2"
      />
      <button
        className="bg-blue-500 text-white px-2 py-1 rounded w-full mb-2"
        onClick={onCreate}
      >
        ＋新規作成
      </button>
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
        {memos.map((m, idx) => (
          <li
            key={m.id}
            className={`p-2 border rounded cursor-pointer ${
              selectedId === m.id ? 'bg-blue-100' : ''
            }`}
            onClick={() => onSelect(m.id)}
          >
            <span className="mr-2">{m.title}</span>
            <button
              className="ml-2 px-1 text-sm bg-gray-200 rounded"
              disabled={idx === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMove(m.id, -1);
              }}
            >↑</button>
            <button
              className="ml-1 px-1 text-sm bg-gray-200 rounded"
              disabled={idx === memos.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                onMove(m.id, 1);
              }}
            >↓</button>
            {m.deleted && <span className="text-xs text-red-500 ml-2">(削除)</span>}
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
