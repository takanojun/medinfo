import { useState, useEffect, useCallback } from 'react';
import MemoList from './MemoList';
import MemoViewer from './MemoViewer';
import MemoEditor from './MemoEditor';
import VerticalSplit from '../components/VerticalSplit';
import MemoTagManagerModal from './MemoTagManagerModal';
import MemoHistoryModal from './MemoHistoryModal';
import TemplateSelectModal from './TemplateSelectModal';

export interface MemoItem {
  id: number;
  parent_id: number | null;
  title: string;
  content: string;
  tag_ids: number[];
  deleted?: boolean;
  sort_order: number;
}

export interface MemoTag {
  id: number;
  name: string;
  remark?: string;
  color?: string;
  is_deleted: boolean;
}

interface FacilityMemoResponse {
  id: number;
  facility_id: number;
  parent_id: number | null;
  title: string;
  content: string | null;
  is_deleted: boolean;
  tags: MemoTag[];
  sort_order: number;
}

const initialMemos: MemoItem[] = [];
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const getCurrentUser = (): string => {
  let user = localStorage.getItem('memoUser');
  if (!user) {
    user = Math.random().toString(36).slice(2);
    localStorage.setItem('memoUser', user);
  }
  return user;
};

const currentUser = getCurrentUser();

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
  initialSelectedId?: number | null
}

export default function MemoApp({ facilityId, facilityName, initialSelectedId }: Props) {
  const [memos, setMemos] = useState<MemoItem[]>(initialMemos);
  const [tagMaster, setTagMaster] = useState<MemoTag[]>([]);
  const [isTagMasterOpen, setIsTagMasterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId ?? null);
  const [editing, setEditing] = useState<MemoItem | null>(null);
  const [editingReadOnly, setEditingReadOnly] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const reorderMemos = (newMemos: MemoItem[]) => {
    setMemos(newMemos);
    const orders = newMemos.map((m, i) => ({
      id: m.id,
      sort_order: i + 1,
      parent_id: m.parent_id,
    }));
    fetch(`${apiBase}/memos/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    }).then(fetchMemos);
  };


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
    const url = facilityId
      ? `${apiBase}/memos/facility/${facilityId}?include_deleted=true`
      : `${apiBase}/memos/general?include_deleted=true`;
    fetch(url)
      .then((res) => res.json())
      .then((data: FacilityMemoResponse[]) => {
        const list: MemoItem[] = data.map((m) => ({
          id: m.id,
          parent_id: m.parent_id,
          title: m.title,
          content: m.content || '',
          tag_ids: (m.tags || []).map((t) => t.id),
          deleted: m.is_deleted,
          sort_order: m.sort_order,
        }));
        list.sort((a, b) => a.sort_order - b.sort_order);
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
    if (search && !(m.title.includes(search) || m.content.includes(search))) return false;
    if (tagFilter.length && !tagFilter.every((t) => m.tag_ids.includes(t))) return false;
    return true;
  });

  const visibleIds = new Set(filtered.map((m) => m.id));
  filtered.forEach((m) => {
    let p = m.parent_id;
    while (p) {
      if (visibleIds.has(p)) break;
      const parent = memos.find((x) => x.id === p);
      if (parent) {
        visibleIds.add(parent.id);
        p = parent.parent_id;
      } else {
        break;
      }
    }
  });
  const finalList = memos.filter((m) => visibleIds.has(m.id));

  const selected = memos.find((m) => m.id === selectedId) || null;
  const childMemos = selected ? memos.filter((m) => m.parent_id === selected.id) : [];

  const handleCreate = () => {
    const memo: MemoItem = {
      id: 0,
      parent_id: selectedId,
      title: '',
      content: '',
      tag_ids: [],
      sort_order: memos.length + 1,
    };
    setEditing(memo);
    setEditingReadOnly(false);
    setEditingMessage(null);
  };

  const handleEdit = (memo: MemoItem) => {
    lockMemo(memo.id)
      .then(async (res) => {
        if (res.ok) {
          setEditing({ ...memo });
          setEditingReadOnly(false);
          setEditingMessage(null);
        } else {
          const data = await res.json().catch(() => null);
          const detail = data?.detail as string | undefined;
          const ipMatch = detail?.match(/\((.*)\)/);
          const ip = ipMatch ? ipMatch[1] : '';
          setEditing({ ...memo });
          setEditingReadOnly(true);
          setEditingMessage(`${ip || '他の端末'}で編集中です。参照モードで起動します。`);
        }
      })
      .catch(() => alert('ロック取得に失敗しました'));
  };

  const handleSave = (memo: MemoItem) => {
    const method = memo.id === 0 ? 'POST' : 'PUT';
    const url = memo.id === 0
      ? (facilityId ? `${apiBase}/memos/facility/${facilityId}` : `${apiBase}/memos/general`)
      : `${apiBase}/memos/${memo.id}`;
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: memo.title,
        content: memo.content,
        tag_ids: memo.tag_ids,
        parent_id: memo.parent_id,
        sort_order: memo.sort_order,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        fetchMemos();
        setSelectedId(data.id);
        setEditing(null);
        setEditingMessage(null);
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
    setEditingMessage(null);
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
            memos={finalList}
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
          onReorder={reorderMemos}
        />
        }
        right={
          <MemoViewer
            memo={selected}
            tagOptions={tagMaster}
            childMemos={childMemos}
            onSelectMemo={setSelectedId}
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
            setEditingMessage(null);
          }}
          onOpenTagMaster={() => setIsTagMasterOpen(true)}
          onOpenTemplateSelect={() => setIsTemplateOpen(true)}
          readOnly={editingReadOnly}
          message={editingMessage || undefined}
        />
      )}
      <MemoTagManagerModal
        isOpen={isTagMasterOpen}
        onClose={() => {
          setIsTagMasterOpen(false);
          fetchTags();
        }}
      />
      {editing && (
        <TemplateSelectModal
          isOpen={isTemplateOpen}
          tagOptions={tagMaster}
          onClose={() => setIsTemplateOpen(false)}
          onSelect={(tpl) => {
            setEditing(
              (prev) =>
                prev && {
                  ...prev,
                  title: tpl.title,
                  content: tpl.content || '',
                  tag_ids: tpl.tag_ids,
                },
            );
            setIsTemplateOpen(false);
          }}
        />
      )}
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
