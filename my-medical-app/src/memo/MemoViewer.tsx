import type { MemoItem, MemoTag } from './MemoApp';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { useState } from 'react';
import ImageModal from '../components/ImageModal';

interface Props {
  memo: MemoItem | null;
  tagOptions: MemoTag[];
  onEdit: () => void;
  onToggleDelete: () => void;
  onShowHistory: () => void;
}

export default function MemoViewer({ memo, tagOptions, onEdit, onToggleDelete, onShowHistory }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState<string>('');
  if (!memo) return <div className="flex-1 p-4">メモを選択してください</div>;
  const tagObjs = memo.tag_ids
    .map((id) => tagOptions.find((t) => t.id === id))
    .filter(Boolean) as MemoTag[];

  const getContrast = (hex?: string) => {
    if (!hex) return '#000';
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
  };
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex justify-end mb-2 space-x-2">
        <button
          className="bg-green-500 text-white px-2 py-1 rounded mr-2"
          onClick={onEdit}
        >
          編集
        </button>
        <button
          className="bg-blue-500 text-white px-2 py-1 rounded"
          onClick={onShowHistory}
        >
          履歴
        </button>
        <button
          className="bg-gray-500 text-white px-2 py-1 rounded"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('memoId', String(memo.id));
            const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(url).catch((e) => console.error(e));
            } else {
              const textarea = document.createElement('textarea');
              textarea.value = url;
              textarea.style.position = 'fixed';
              textarea.style.top = '-1000px';
              textarea.style.left = '-1000px';
              document.body.appendChild(textarea);
              textarea.focus();
              textarea.select();
              try {
                document.execCommand('copy');
              } catch (e) {
                console.error(e);
              }
              document.body.removeChild(textarea);
            }
          }}
        >
          リンクコピー
        </button>
        <button
          className="bg-red-500 text-white px-2 py-1 rounded"
          onClick={onToggleDelete}
        >
          {memo.deleted ? '復元' : '削除'}
        </button>
      </div>
      <div className="prose max-w-none">
        <Markdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
          components={{
            img(props: React.ImgHTMLAttributes<HTMLImageElement>) {
              const src = props.src || '';
              const alt = props.alt as string | undefined;
              return (
                <img
                  {...props}
                  className="cursor-pointer max-w-full"
                  onClick={() => {
                    setImageSrc(src);
                    setImageAlt(alt || '');
                  }}
                />
              );
            },
          }}
        >
          {memo.content}
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
      {tagObjs.length > 0 && (
        <div className="mt-2 text-sm flex flex-wrap gap-1">
          {tagObjs.map((t) => (
            <span
              key={t.id}
              className="px-1 rounded"
              style={{ backgroundColor: t.color || '#bfdbfe', color: getContrast(t.color) }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
