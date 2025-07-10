import { useState, useEffect } from 'react';
import MemoList from './MemoList';
import MemoViewer from './MemoViewer';
import MemoEditor from './MemoEditor';

export interface MemoItem {
  id: number;
  title: string;
  content: string;
  tag_ids: number[];
  deleted?: boolean;
}

export interface MemoTag {
  id: number;
  name: string;
  remark?: string;
  is_deleted: boolean;
}

const initialMemos: MemoItem[] = [];
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface Props {
  facilityId: number
  facilityName: string
}

export default function MemoApp({ facilityId, facilityName }: Props) {
  const [memos, setMemos] = useState<MemoItem[]>(initialMemos);
  const [nextId, setNextId] = useState(() =>
    memos.reduce((max, m) => Math.max(max, m.id), 0) + 1,
  );
  const [tagMaster, setTagMaster] = useState<MemoTag[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<MemoItem | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter] = useState<number[]>([]);

  useEffect(() => {
    fetch(`${apiBase}/memo-tags`)
      .then((res) => res.json())
      .then((data) => setTagMaster(data));
  }, []);

  const filtered = memos.filter((m) => {
    if (!showDeleted && m.deleted) return false;
    if (search && !m.title.includes(search)) return false;
    if (tagFilter.length && !tagFilter.every((t) => m.tag_ids.includes(t))) return false;
    return true;
  });

  const selected = memos.find((m) => m.id === selectedId) || null;

  const handleCreate = () => {
    const memo: MemoItem = { id: nextId, title: '', content: '', tag_ids: [] };
    setNextId((v) => v + 1);
    setEditing(memo);
  };

  const handleEdit = (memo: MemoItem) => {
    setEditing({ ...memo });
  };

  const handleSave = (memo: MemoItem) => {
    setMemos((prev) => {
      const idx = prev.findIndex((m) => m.id === memo.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = memo;
        return updated;
      }
      return [...prev, memo];
    });
    setSelectedId(memo.id);
    setEditing(null);
  };

  const handleToggleDelete = (id: number) => {
    setMemos((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: !m.deleted } : m)));
  };

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
          onCreate={handleCreate}
        />
        <MemoViewer
          memo={selected}
          tagOptions={tagMaster}
          onEdit={() => selected && handleEdit(selected)}
          onToggleDelete={() => selected && handleToggleDelete(selected.id)}
        />
      </div>
      {editing && (
        <MemoEditor
          memo={editing}
          tagOptions={tagMaster}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
