import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';

interface Version {
  id: number;
  memo_id: number;
  version_no: number;
  content: string | null;
  created_at: string;
  ip_address: string | null;
  action: string | null;
}

interface Props {
  memoId: number;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (versionNo: number) => void;
  onView: (version: Version) => void;
}

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const actionLabels: Record<string, string> = {
  create: '新規',
  edit: '修正',
  delete: '削除',
  restore: '復元',
};

export default function MemoHistoryModal({ memoId, isOpen, onClose, onRestore, onView }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [ip, setIp] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams();
    if (start) params.append('start_date', start);
    if (end) params.append('end_date', `${end}T23:59`);
    if (ip) params.append('ip_address', ip);
    fetch(`${apiBase}/memos/${memoId}/versions?${params.toString()}`)
      .then((res) => res.json())
      .then((data: Version[]) => setVersions(data));
  }, [memoId, isOpen, start, end, ip]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg bg-white rounded p-4 shadow">
            <Dialog.Title className="text-lg font-bold mb-2">履歴</Dialog.Title>
            <div className="flex flex-wrap gap-2 mb-2">
              <input
                type="date"
                className="border p-1"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <input
                type="date"
                className="border p-1"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
              <input
                type="text"
                className="border p-1"
                placeholder="IPアドレス"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
              />
            </div>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.id} className="border p-2 flex justify-between items-center gap-2">
                  <span>
                    {`#${v.version_no}`} {new Date(v.created_at).toLocaleString()} {v.ip_address ?? ''} {v.action ? actionLabels[v.action] || v.action : ''}
                  </span>
                  <div className="space-x-2">
                    <button
                      className="px-2 py-1 bg-green-500 text-white text-sm rounded"
                      onClick={() => onView(v)}
                    >
                      表示
                    </button>
                    <button
                      className="px-2 py-1 bg-blue-500 text-white text-sm rounded"
                      onClick={() => onRestore(v.version_no)}
                    >
                      復元
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
  );
}
