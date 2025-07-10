import { useState, useEffect, useCallback } from 'react';
import MemoList from './MemoList';
import MemoViewer from './MemoViewer';
import MemoEditor from './MemoEditor';
import VerticalSplit from '../components/VerticalSplit';
import MemoTagManagerModal from './MemoTagManagerModal';

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

interface FacilityMemoResponse {
  id: number;
  facility_id: number;
  title: string;
  content: string | null;
  is_deleted: boolean;
  tags: MemoTag[];
}

const initialMemos: MemoItem[] = [];
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface Props {
  facilityId: number
  facilityName: string
}

export default function MemoApp({ facilityId, facilityName }: Props) {
  const [memos, setMemos] = useState<MemoItem[]>(initialMemos);
  const [tagMaster, setTagMaster] = useState<MemoTag[]>([]);
  const [isTagMasterOpen, setIsTagMasterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<MemoItem | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<number[]>([]);

  const fetchTags = useCallback(() => {
    fetch(`${apiBase}/memo-tags`)
      .then((res) => res.json())
      .then((data) => setTagMaster(data));
  }, []);

  const fetchMemos = useCallback(() => {
    if (!facilityId) return;
    fetch(`${apiBase}/memos/facility/${facilityId}?include_deleted=true`)
      .then((res) => res.json())
      .then((data: FacilityMemoResponse[]) => {
        const list: MemoItem[] = data.map((m) => ({
          id: m.id,
          title: m.title,
          content: m.content || '',
          tag_ids: (m.tags || []).map((t) => t.id),
          deleted: m.is_deleted,
        }));
        setMemos(list);
      });
  }, [facilityId]);

  useEffect(() => {
    fetchTags();
    fetchMemos();
  }, [fetchTags, fetchMemos]);

  const filtered = memos.filter((m) => {
    if (!showDeleted && m.deleted) return false;
    if (search && !m.title.includes(search)) return false;
    if (tagFilter.length && !tagFilter.every((t) => m.tag_ids.includes(t))) return false;
    return true;
  });

  const selected = memos.find((m) => m.id === selectedId) || null;

  const handleCreate = () => {
    const memo: MemoItem = { id: 0, title: '', content: '', tag_ids: [] };
    setEditing(memo);
  };

  const handleEdit = (memo: MemoItem) => {
    setEditing({ ...memo });
  };

  const handleSave = (memo: MemoItem) => {
    const method = memo.id === 0 ? 'POST' : 'PUT';
    const url =
      memo.id === 0
        ? `${apiBase}/memos/facility/${facilityId}`
        : `${apiBase}/memos/${memo.id}`;
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: memo.title,
        content: memo.content,
        tag_ids: memo.tag_ids,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        fetchMemos();
        setSelectedId(data.id);
        setEditing(null);
      });
  };

  const handleToggleDelete = (id: number) => {
    const memo = memos.find((m) => m.id === id);
    if (!memo) return;
    const url = memo.deleted
      ? `${apiBase}/memos/${id}/restore`
      : `${apiBase}/memos/${id}`;
    const method = memo.deleted ? 'PUT' : 'DELETE';
    fetch(url, { method }).then(fetchMemos);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-blue-600 text-white p-2">
        {facilityName ? `${facilityName} メモ管理` : 'メモ管理'}
        {facilityId ? ` (ID: ${facilityId})` : ''}
      </header>
      <VerticalSplit
        storageKey="memo_list_width"
        initialLeftWidth={300}
        left={
          <MemoList
            memos={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showDeleted={showDeleted}
            onToggleDeleted={() => setShowDeleted((v) => !v)}
            search={search}
            onSearch={setSearch}
            tagOptions={tagMaster}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            onCreate={handleCreate}
          />
        }
        right={
          <MemoViewer
            memo={selected}
            tagOptions={tagMaster}
            onEdit={() => selected && handleEdit(selected)}
            onToggleDelete={() => selected && handleToggleDelete(selected.id)}
          />
        }
      />
      {editing && (
        <MemoEditor
          memo={editing}
          tagOptions={tagMaster}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onOpenTagMaster={() => setIsTagMasterOpen(true)}
        />
      )}
      <MemoTagManagerModal
        isOpen={isTagMasterOpen}
        onClose={() => {
          setIsTagMasterOpen(false);
          fetchTags();
        }}
      />
    </div>
  );
}
