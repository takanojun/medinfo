import { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  const handleFiles = (files: FileList | File[]) => {
    if (memo.id === 0) {
      alert('画像を追加する前にメモを保存してください');
      return;
    }
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const form = new FormData();
      form.append('file', file);
      form.append('memo_id', String(memo.id));
      fetch(`${apiBase}/images`, {
        method: 'POST',
        body: form,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('uploaded', data.id);
        })
        .catch(() => alert('画像アップロードに失敗しました'));
    });
  };

  const applyStyle = (style: string) => {
    if (readOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = content.slice(0, start);
    const selected = content.slice(start, end);
    const after = content.slice(end);
    const open = `<span style="${style}">`;
    const close = '</span>';
    const newContent = before + open + selected + close + after;
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + open.length;
      textarea.selectionEnd = start + open.length + selected.length;
    });
  };

  const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffa500'];
  const sizes = ['12px', '16px', '20px', '24px'];

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
            {!readOnly && (
              <div className="flex items-center gap-2 mb-1 text-sm">
                <select
                  className="border p-1"
                  onChange={(e) => {
                    if (e.target.value) {
                      applyStyle(`color:${e.target.value}`);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">色</option>
                  {colors.map((c) => (
                    <option key={c} value={c} style={{ color: c }}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className="border p-1"
                  onChange={(e) => {
                    if (e.target.value) {
                      applyStyle(`font-size:${e.target.value}`);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">サイズ</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="border px-1 rounded"
                  onClick={() => applyStyle('text-decoration: underline')}
                >
                  <u>U</u>
                </button>
                <button
                  type="button"
                  className="border px-1 rounded"
                  onClick={() => applyStyle('text-decoration: line-through')}
                >
                  <s>S</s>
                </button>
                <button
                  type="button"
                  className="border px-1 rounded"
                  onClick={() => fileInputRef.current?.click()}
                >
                  画像追加
                </button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>
            )}
            <ImeTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border p-1 flex-1"
              disabled={readOnly}
              ref={textareaRef}
              onDragOver={(e) => {
                if (!readOnly) e.preventDefault();
              }}
              onDrop={(e) => {
                if (readOnly) return;
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              onPaste={(e) => {
                if (readOnly) return;
                const items = Array.from(e.clipboardData.items);
                const fileItem = items.find((it) => it.type.startsWith('image/'));
                if (fileItem) {
                  const file = fileItem.getAsFile();
                  if (file) {
                    e.preventDefault();
                    handleFiles([file]);
                  }
                }
              }}
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
              <Markdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw]}
              >
                {content}
              </Markdown>
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
