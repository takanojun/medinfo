import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import ImeInput from '../components/ImeInput';
import ImeTextarea from '../components/ImeTextarea';
import MultiSelect from '../components/MultiSelect';
import type { Option } from '../components/MultiSelect';
import type { MemoItem, MemoTag } from './MemoApp';

interface Props {
  memo: MemoItem;
  tagOptions: MemoTag[];
  onSave: (m: MemoItem) => void;
  onCancel: () => void;
  onOpenTagMaster: () => void;
  readOnly?: boolean;
  message?: string;
}

export default function MemoEditor({ memo, tagOptions, onSave, onCancel, onOpenTagMaster, readOnly = false, message }: Props) {
  const [title, setTitle] = useState(memo.title);
  const [content, setContent] = useState(memo.content);
  const [tags, setTags] = useState<number[]>(memo.tag_ids);

  const options: Option[] = tagOptions.map((t) => ({
    value: t.id,
    label: t.name,
    color: t.color,
  }));

  const handleSave = () => {
    if (readOnly) return;
    onSave({ ...memo, title, content, tag_ids: tags });
  };


  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[70]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white w-11/12 max-w-3xl p-4 rounded shadow flex flex-col h-[80%]">
        {message && (
          <div className="text-sm text-red-600 mb-2">{message}</div>
        )}
        <div className="flex-1 flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col">
            <ImeInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル"
              className="border p-1 mb-2"
              disabled={readOnly}
            />
            <ImeTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border p-1 flex-1"
              disabled={readOnly}
            />
            <div className="border p-1 mt-2 space-y-1 relative pr-20">
              {!readOnly && (
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded"
                  onClick={onOpenTagMaster}
                >
                  タグ管理
                </button>
              )}
              <MultiSelect
                options={options}
                selected={tags}
                onChange={setTags}
                placeholder="タグを選択"
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 border rounded bg-gray-50">
            <div className="prose max-w-none">
              <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</Markdown>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end mt-2 space-x-2">
          {readOnly && <span className="text-red-500 mr-auto">参照モード</span>}
          <button className="px-3 py-1 bg-gray-300 rounded" onClick={onCancel}>
            {readOnly ? '閉じる' : 'キャンセル'}
          </button>
          <button
            className={`px-3 py-1 rounded ${readOnly ? 'bg-gray-300 text-gray-500' : 'bg-blue-500 text-white'}`}
            onClick={handleSave}
            disabled={readOnly}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
