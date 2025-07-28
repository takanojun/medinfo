import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import ImeInput from '../components/ImeInput';
import ImeTextarea from '../components/ImeTextarea';
import TagSearchInput from '../components/TagSearchInput';
import type { Option } from '../components/TagSearchInput';
import type { MemoTag } from './MemoApp';

export interface TemplateData {
  id: number;
  name: string;
  title: string;
  content: string | null;
  tag_ids: number[];
}

interface Props {
  isOpen: boolean;
  template: TemplateData;
  tagOptions: MemoTag[];
  onSave: (tpl: TemplateData) => void;
  onClose: () => void;
}

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export default function TemplateEditModal({
  isOpen,
  template,
  tagOptions,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState(template.name);
  const [title, setTitle] = useState(template.title);
  const [content, setContent] = useState(template.content || '');
  const [tags, setTags] = useState<number[]>(template.tag_ids);

  const options: Option[] = tagOptions.map((t) => ({ value: t.id, label: t.name, color: t.color }));

  const handleSubmit = () => {
    const method = template.id ? 'PUT' : 'POST';
    const url = template.id ? `${apiBase}/memo-templates/${template.id}` : `${apiBase}/memo-templates`;
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title, content, tag_ids: tags }),
    })
      .then((res) => res.json())
      .then((data: TemplateData) => {
        onSave(data);
      });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={onClose}>
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-3xl bg-white rounded p-4 shadow space-y-2">
            <Dialog.Title className="text-lg font-bold">
              {template.id ? 'テンプレート編集' : 'テンプレート登録'}
            </Dialog.Title>
            <ImeInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="テンプレート名"
              className="border p-1 w-full"
            />
            <ImeInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル"
              className="border p-1 w-full"
            />
            <ImeTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border p-1 w-full h-40"
            />
            <TagSearchInput options={options} selected={tags} onChange={setTags} />
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-1 bg-gray-300 rounded" onClick={onClose}>
                キャンセル
              </button>
              <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={handleSubmit}>
                保存
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
