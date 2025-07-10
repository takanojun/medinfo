import { useEffect, useState } from 'react';
import ImeInput from '../components/ImeInput';
import type { MemoTag } from './MemoApp';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export default function MemoTagManager() {
  const [tags, setTags] = useState<MemoTag[]>([]);
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');
  const [editing, setEditing] = useState<MemoTag | null>(null);

  const fetchTags = () => {
    fetch(`${apiBase}/memo-tags?include_deleted=true`)
      .then((res) => res.json())
      .then((data) => setTags(data));
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSubmit = () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${apiBase}/memo-tags/${editing.id}` : `${apiBase}/memo-tags`;
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, remark }),
    }).then(() => {
      setName('');
      setRemark('');
      setEditing(null);
      fetchTags();
    });
  };

  const handleDelete = (tag: MemoTag) => {
    fetch(`${apiBase}/memo-tags/${tag.id}`, { method: 'DELETE' }).then(fetchTags);
  };

  const handleRestore = (tag: MemoTag) => {
    fetch(`${apiBase}/memo-tags/${tag.id}/restore`, { method: 'PUT' }).then(fetchTags);
  };

  const startEdit = (tag: MemoTag) => {
    setEditing(tag);
    setName(tag.name);
    setRemark(tag.remark || '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setName('');
    setRemark('');
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">タグマスタ保守</h1>
      <div className="space-y-2">
        <ImeInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="タグ名"
          className="border p-1"
        />
        <ImeInput
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="備考"
          className="border p-1"
        />
        <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={handleSubmit}>
          {editing ? '更新' : '追加'}
        </button>
        {editing && (
          <button className="ml-2 px-2 py-1 bg-gray-300 rounded" onClick={cancelEdit}>
            キャンセル
          </button>
        )}
      </div>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border p-1">ID</th>
            <th className="border p-1">名前</th>
            <th className="border p-1">備考</th>
            <th className="border p-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr key={tag.id} className="border">
              <td className="border p-1 text-center">{tag.id}</td>
              <td className="border p-1">{tag.name}</td>
              <td className="border p-1">{tag.remark}</td>
              <td className="border p-1 space-x-1">
                <button className="px-1 bg-green-500 text-white" onClick={() => startEdit(tag)}>
                  編集
                </button>
                {tag.is_deleted ? (
                  <button className="px-1 bg-yellow-500 text-white" onClick={() => handleRestore(tag)}>
                    復元
                  </button>
                ) : (
                  <button className="px-1 bg-red-500 text-white" onClick={() => handleDelete(tag)}>
                    削除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
