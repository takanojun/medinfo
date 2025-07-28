import { useState, useRef, useEffect } from 'react';
import ImageModal from '../components/ImageModal';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import ImeInput from '../components/ImeInput';
import ImeTextarea from '../components/ImeTextarea';
import TagSearchInput from '../components/TagSearchInput';
import type { Option } from '../components/TagSearchInput';
import type { MemoItem, MemoTag } from './MemoApp';
import TemplateEditModal, { type TemplateData } from './TemplateEditModal';

interface Props {
  memo: MemoItem;
  tagOptions: MemoTag[];
  onSave: (m: MemoItem) => void;
  onCancel: () => void;
  onOpenTagMaster: () => void;
  onOpenTemplateSelect: () => void;
  readOnly?: boolean;
  message?: string;
}

export default function MemoEditor({ memo, tagOptions, onSave, onCancel, onOpenTagMaster, onOpenTemplateSelect, readOnly = false, message }: Props) {
  const [title, setTitle] = useState(memo.title);
  const [content, setContent] = useState(memo.content);
  const [tags, setTags] = useState<number[]>(memo.tag_ids);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState<string>('');
  const [templateEdit, setTemplateEdit] = useState<TemplateData | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizingIdRef = useRef<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const resizeDirRef = useRef<'right'>('right');
  const dragPosRef = useRef(0);

  const caretIndexFromPoint = (e: { clientX: number; clientY: number }): number => {
    const ta = textareaRef.current;
    if (!ta) return 0;
    const rect = ta.getBoundingClientRect();
    const x = e.clientX - rect.left + ta.scrollLeft;
    const y = e.clientY - rect.top + ta.scrollTop;
    const style = getComputedStyle(ta);
    const lh = parseInt(style.lineHeight || '16', 10);
    const approxLine = Math.floor(y / lh);
    const lines = ta.value.split('\n');
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      if (i < approxLine) {
        pos += lines[i].length + 1;
      } else {
        const line = lines[i] || '';
        const cw = ta.clientWidth / Math.max(line.length, 1);
        const approxChar = Math.floor(x / cw);
        pos += Math.min(approxChar, line.length);
        break;
      }
    }
    return Math.min(pos, ta.value.length);
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!resizingIdRef.current) return;
      const dx = e.clientX - startXRef.current;
      const delta = dx;
      const newWidth = Math.max(50, startWidthRef.current + delta);
      updateImageWidth(resizingIdRef.current, newWidth);
    };
    const up = () => {
      resizingIdRef.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  const generateTag = (id: string, name: string, width = 300) =>
    `<img data-id="${id}" alt="${name}" src="${apiBase}/images/${id}" style="width:${width}px;max-width:100%;" />`;

  const extractTag = (id: string) => {
    const regex = new RegExp(`<img[^>]*data-id="${id}"[^>]*>`);
    const match = content.match(regex);
    return match ? match[0] : '';
  };

  const removeImage = (id: string) => {
    setContent((prev) => prev.replace(new RegExp(`<img[^>]*data-id="${id}"[^>]*>`), ''));
  };

  const updateImageWidth = (id: string, width: number) => {
    setContent((prev) => {
      const regex = new RegExp(`<img[^>]*data-id="${id}"[^>]*>`);
      const m = prev.match(regex);
      if (!m) return prev;
      const newTag = generateTag(id, '', width);
      return prev.replace(regex, newTag);
    });
  };

  const insertTagAt = (tag: string, pos: number) => {
    setContent((prev) => {
      const before = prev.slice(0, pos);
      const after = prev.slice(pos);
      return before + tag + after;
    });
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = pos + tag.length;
      }
    });
  };

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
          const textarea = textareaRef.current;
          const pos = textarea ? textarea.selectionStart || content.length : content.length;
          const tag = generateTag(data.id, file.name);
          insertTagAt(tag, pos);
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
    <>
    <div
      className="fixed inset-0 bg-black bg-opacity-30 overflow-y-auto flex items-center justify-center z-[70]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white w-11/12 max-w-3xl p-4 rounded shadow flex flex-col h-[80%] min-h-0">
        {message && (
          <div className="text-sm text-red-600 mb-2">{message}</div>
        )}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {!readOnly && (
              <div className="flex gap-1 mb-2 self-start">
                <button
                  type="button"
                  className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                  onClick={onOpenTemplateSelect}
                >
                  テンプレ
                </button>
                <button
                  type="button"
                  className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                  onClick={() =>
                    setTemplateEdit({
                      id: 0,
                      name: title,
                      title,
                      content,
                      tag_ids: tags,
                    })
                  }
                >
                  テンプレ保存
                </button>
              </div>
            )}
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
              className="border p-1 flex-1 overflow-y-auto resize-none"
              disabled={readOnly}
              ref={textareaRef}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
                const pos = caretIndexFromPoint(e);
                const ta = textareaRef.current;
                if (ta) {
                  ta.setSelectionRange(pos, pos);
                  dragPosRef.current = pos;
                }
              }}
              onDrop={(e) => {
                if (readOnly) return;
                const imgId = e.dataTransfer.getData('text/image-id');
                if (imgId) {
                  e.preventDefault();
                  const pos = dragPosRef.current;
                  const tag = extractTag(imgId);
                  if (tag) {
                    removeImage(imgId);
                    insertTagAt(tag, pos);
                  }
                  return;
                }
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
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                    onClick={onOpenTagMaster}
                  >
                      タグ管理
                    </button>
                </div>
              )}
              <TagSearchInput
                options={options}
                selected={tags}
                onChange={setTags}
                placeholder="タグを選択"
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 border rounded bg-gray-50 min-h-0">
            <div
              className="prose max-w-none"
              onDragOver={(e) => {
                if (e.dataTransfer.getData('text/image-id')) {
                  e.preventDefault();
                  const pos = caretIndexFromPoint(e);
                  const ta = textareaRef.current;
                  if (ta) {
                    ta.setSelectionRange(pos, pos);
                    dragPosRef.current = pos;
                  }
                }
              }}
              onDrop={(e) => {
                const imgId = e.dataTransfer.getData('text/image-id');
                if (imgId) {
                  e.preventDefault();
                  const pos = dragPosRef.current;
                  const tag = extractTag(imgId);
                  if (tag) {
                    removeImage(imgId);
                    insertTagAt(tag, pos);
                  }
                }
              }}
            >
              <Markdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  img(props: React.ImgHTMLAttributes<HTMLImageElement> & { 'data-id'?: string }) {
                    const id = props['data-id'];
                    const width =
                      parseInt((props.style as React.CSSProperties)?.width as string) || 300;
                    return (
                      <span
                        className="inline-block relative"
                        draggable={!readOnly}
                        onDragStart={(e) => {
                          if (id) {
                            e.dataTransfer.setData('text/image-id', id);
                            const ta = textareaRef.current;
                            dragPosRef.current = ta ? ta.selectionStart || 0 : 0;
                          }
                        }}
                        onContextMenu={(e) => {
                          if (!readOnly && id && confirm('画像を削除しますか？')) {
                            e.preventDefault();
                            removeImage(id);
                          }
                        }}
                      >
                        <img
                          {...props}
                          className="max-w-full cursor-pointer"
                          onClick={() => {
                            setImageSrc(props.src || '');
                            setImageAlt(props.alt as string || '');
                          }}
                        />
                        {!readOnly && id && (
                          <span
                            className="absolute w-3 h-3 bg-blue-500 bottom-0 right-0 cursor-se-resize"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startXRef.current = e.clientX;
                              startWidthRef.current = width;
                              resizeDirRef.current = 'right';
                              resizingIdRef.current = id;
                            }}
                          />
                        )}
                      </span>
                    );
                  },
                }}
              >
                {content}
              </Markdown>
              {imageSrc && (
                <ImageModal
                  src={imageSrc}
                  alt={imageAlt}
                  isOpen={!!imageSrc}
                  onClose={() => setImageSrc(null)}
                />
              )}
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
    {templateEdit && (
      <TemplateEditModal
        isOpen={!!templateEdit}
        template={templateEdit}
        tagOptions={tagOptions}
        onSave={() => setTemplateEdit(null)}
        onClose={() => setTemplateEdit(null)}
      />
    )}
    </>
  );
}
