import { useState, useEffect, useCallback } from 'react';
import MemoList from './MemoList';
import MemoViewer from './MemoViewer';
import MemoEditor from './MemoEditor';
import VerticalSplit from '../components/VerticalSplit';
import MemoTagManagerModal from './MemoTagManagerModal';
import MemoHistoryModal from './MemoHistoryModal';

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
const currentUser = 'user1';

const getCookie = (name: string): string | null => {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
};

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000`;
};

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
  const [editingReadOnly, setEditingReadOnly] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fetchTags = useCallback(() => {
    fetch(`${apiBase}/memo-tags`)
      .then((res) => res.json())
      .then((data: MemoTag[]) => {
        const sorted = data.slice().sort((a, b) => a.name.localeCompare(b.name));
        const saved = getCookie('memoTagOrder');
        let order = sorted.map((t) => t.id);
        if (saved) {
          const parsed = saved
            .split(',')
            .map((v) => parseInt(v))
            .filter((id) => sorted.some((t) => t.id === id));
          const missing = sorted.map((t) => t.id).filter((id) => !parsed.includes(id));
          order = [...parsed, ...missing];
        }
        const ordered = order
          .map((id) => sorted.find((t) => t.id === id)!)
          .filter(Boolean) as MemoTag[];
        setTagMaster(ordered);
        setCookie('memoTagOrder', order.join(','));
      });
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

  const lockMemo = (id: number) =>
    fetch(`${apiBase}/memos/${id}/lock?user=${currentUser}`, { method: 'POST' });

  const unlockMemo = (id: number) =>
    fetch(`${apiBase}/memos/${id}/lock?user=${currentUser}`, { method: 'DELETE' });

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
    setEditingReadOnly(false);
  };

  const handleEdit = (memo: MemoItem) => {
    lockMemo(memo.id)
      .then((res) => {
        if (res.ok) {
          setEditing({ ...memo });
          setEditingReadOnly(false);
        } else {
          alert('他のユーザーが編集中です');
        }
      })
      .catch(() => alert('ロック取得に失敗しました'));
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
        if (memo.id !== 0) unlockMemo(memo.id);
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

  const handleRestoreVersion = (no: number) => {
    if (!selected) return;
    fetch(`${apiBase}/memos/${selected.id}/versions/${no}/restore`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        fetchMemos();
        setSelectedId(data.id);
        setIsHistoryOpen(false);
      });
  };

  const handleViewVersion = (v: { version_no: number; content: string | null }) => {
    if (!selected) return;
    setEditing({ ...selected, content: v.content || '' });
    setEditingReadOnly(true);
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
            onShowHistory={() => setIsHistoryOpen(true)}
          />
        }
      />
      {editing && (
        <MemoEditor
          memo={editing}
          tagOptions={tagMaster}
          onSave={handleSave}
          onCancel={() => {
            if (!editingReadOnly && editing.id !== 0) unlockMemo(editing.id);
            setEditing(null);
            setEditingReadOnly(false);
          }}
          onOpenTagMaster={() => setIsTagMasterOpen(true)}
          readOnly={editingReadOnly}
        />
      )}
      <MemoTagManagerModal
        isOpen={isTagMasterOpen}
        onClose={() => {
          setIsTagMasterOpen(false);
          fetchTags();
        }}
      />
      {selected && (
        <MemoHistoryModal
          memoId={selected.id}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={handleRestoreVersion}
          onView={handleViewVersion}
        />
      )}
    </div>
  );
}
