import { useState } from 'react';
import Markdown from 'react-markdown';
import ImeInput from '../components/ImeInput';
import ImeTextarea from '../components/ImeTextarea';
import type { MemoItem } from './MemoApp';

interface Props {
  memo: MemoItem;
  onSave: (m: MemoItem) => void;
  onCancel: () => void;
}

export default function MemoEditor({ memo, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(memo.title);
  const [content, setContent] = useState(memo.content);
  const [tags, setTags] = useState(memo.tags.join(','));

  const handleSave = () => {
    const tagArr = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);
    onSave({ ...memo, title, content, tags: tagArr });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white w-11/12 max-w-3xl p-4 rounded shadow flex flex-col h-[80%]">
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <ImeInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル"
              className="border p-1 mb-2"
            />
            <ImeTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border p-1 flex-1"
            />
            <ImeInput
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="タグ(カンマ区切り)"
              className="border p-1 mt-2"
            />
          </div>
          <div className="flex-1 overflow-auto p-2 border rounded bg-gray-50">
            <div className="prose max-w-none">
              <Markdown>{content}</Markdown>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-2 space-x-2">
          <button className="px-3 py-1 bg-gray-300 rounded" onClick={onCancel}>
            キャンセル
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
