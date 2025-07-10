import { useState } from 'react';
import MemoList from './MemoList';
import MemoViewer from './MemoViewer';

export interface MemoItem {
  id: number;
  title: string;
  content: string;
  tags: string[];
  deleted?: boolean;
}

const initialMemos: MemoItem[] = [
  {
    id: 1,
    title: '初回カウンセリング',
    content: '# カウンセリング内容\n患者は...\n',
    tags: ['初診'],
  },
  {
    id: 2,
    title: '定期検診メモ',
    content: '## 検査結果\n- 血圧 正常\n- ...',
    tags: ['検診'],
  },
];

interface Props {
  facilityId: number
  facilityName: string
}

export default function MemoApp({ facilityId, facilityName }: Props) {
  const [memos] = useState<MemoItem[]>(initialMemos);
  const [selectedId, setSelectedId] = useState<number | null>(initialMemos[0].id);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter] = useState<string[]>([]);

  const filtered = memos.filter((m) => {
    if (!showDeleted && m.deleted) return false;
    if (search && !m.title.includes(search)) return false;
    if (tagFilter.length && !tagFilter.every((t) => m.tags.includes(t))) return false;
    return true;
  });

  const selected = memos.find((m) => m.id === selectedId) || null;

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-blue-600 text-white p-2">
        {facilityName ? `${facilityName} メモ管理` : 'メモ管理'}
        {facilityId ? ` (ID: ${facilityId})` : ''}
      </header>
      <div className="flex flex-1 overflow-hidden">
        <MemoList
          memos={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          showDeleted={showDeleted}
          onToggleDeleted={() => setShowDeleted((v) => !v)}
          search={search}
          onSearch={setSearch}
        />
        <MemoViewer memo={selected} />
      </div>
    </div>
  );
}
