import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import ImeInput from '../components/ImeInput';
import TagSearchInput from '../components/TagSearchInput';
import type { Option } from '../components/TagSearchInput';
import type { MemoTag } from './MemoApp';
import TemplateEditModal, { type TemplateData } from './TemplateEditModal';

interface Template {
  id: number;
  name: string;
  title: string;
  content: string | null;
  updated_at: string;
  tag_ids: number[];
  sort_order: number;
}

interface Props {
  isOpen: boolean;
  tagOptions: MemoTag[];
  onSelect: (t: Template) => void;
  onClose: () => void;
}

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export default function TemplateSelectModal({ isOpen, tagOptions, onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<TemplateData | null>(null);

  const options: Option[] = tagOptions.map((t) => ({ value: t.id, label: t.name, color: t.color }));

  const loadTemplates = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    tagFilter.forEach((t) => params.append('tag', String(t)));
    fetch(`${apiBase}/memo-templates?${params.toString()}`)
      .then((res) => res.json())
      .then((data: Template[]) => {
        data.sort((a, b) => a.sort_order - b.sort_order);
        setTemplates(data);
      });
  };

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen, search, tagFilter]);

  const reorder = (list: Template[]) => {
    setTemplates(list);
    const orders = list.map((t, i) => ({ id: t.id, sort_order: i + 1 }));
    fetch(`${apiBase}/memo-templates/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;
    const newList = [...templates];
    const [moved] = newList.splice(dragIndex, 1);
    newList.splice(index, 0, moved);
    reorder(newList);
    setDragIndex(null);
  };

  const handleDelete = (tpl: Template) => {
    if (!confirm('削除しますか？')) return;
    fetch(`${apiBase}/memo-templates/${tpl.id}`, { method: 'DELETE' }).then(loadTemplates);
  };

  return (
    <>
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded p-4 shadow">
            <Dialog.Title className="text-lg font-bold mb-2">テンプレート選択</Dialog.Title>
            <div className="flex gap-2 mb-2">
              <ImeInput value={search} onChange={(e) => setSearch(e.target.value)} className="border p-1 flex-1" placeholder="検索" />
              <TagSearchInput options={options} selected={tagFilter} onChange={setTagFilter} className="flex-1" />
            </div>
            <ul className="max-h-80 overflow-y-auto space-y-2">
              {templates.map((t, idx) => (
                <li
                  key={t.id}
                  className="border p-2 flex justify-between items-center cursor-move"
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                >
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-sm text-gray-600">{new Date(t.updated_at).toLocaleString()}</div>
                  </div>
                  <div className="space-x-1">
                    <button className="px-2 py-1 bg-blue-500 text-white text-sm rounded" onClick={() => onSelect(t)}>
                      選択
                    </button>
                    <button className="px-2 py-1 bg-green-500 text-white text-sm rounded" onClick={() => setEditing(t)}>
                      編集
                    </button>
                    <button className="px-2 py-1 bg-gray-500 text-white text-sm rounded" onClick={() => setEditing({ ...t, id: 0, name: '' })}>
                      複製
                    </button>
                    <button className="px-2 py-1 bg-red-500 text-white text-sm rounded" onClick={() => handleDelete(t)}>
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={onClose}>
                閉じる
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
    {editing && (
      <TemplateEditModal
        isOpen={!!editing}
        template={editing}
        tagOptions={tagOptions}
        onSave={() => {
          setEditing(null);
          loadTemplates();
        }}
        onClose={() => setEditing(null)}
      />
    )}
    </>
  );
}
