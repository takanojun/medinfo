import React, { useState } from 'react';
import type { MemoItem } from './MemoApp';

type MemoTreeItem = MemoItem & { children: MemoTreeItem[] };
import ImeInput from '../components/ImeInput';
import TagSearchInput from '../components/TagSearchInput';
import type { Option } from '../components/TagSearchInput';
import type { MemoTag } from './MemoApp';

interface Props {
  memos: MemoItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  showDeleted: boolean;
  onToggleDeleted: () => void;
  search: string;
  onSearch: (v: string) => void;
  tagOptions: MemoTag[];
  tagFilter: number[];
  onTagFilterChange: (v: number[]) => void;
  onCreate: () => void;
  onReorder: (newMemos: MemoItem[]) => void;
  className?: string;
}

export default function MemoList({
  memos,
  selectedId,
  onSelect,
  showDeleted,
  onToggleDeleted,
  search,
  onSearch,
  tagOptions,
  tagFilter,
  onTagFilterChange,
  onCreate,
  onReorder,
  className = '',
}: Props) {
  const options: Option[] = tagOptions.map((t) => ({
    value: t.id,
    label: t.name,
    color: t.color,
  }));

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const tree = (): MemoTreeItem[] => {
    const map = new Map<number, MemoTreeItem>();
    memos.forEach((m) => map.set(m.id, { ...m, children: [] }));
    const roots: MemoTreeItem[] = [];
    map.forEach((m) => {
      if (m.parent_id && map.has(m.parent_id)) {
        map.get(m.parent_id)!.children.push(m);
      } else {
        roots.push(m);
      }
    });
    const sort = (items: MemoTreeItem[]) => {
      items.sort((a, b) => a.sort_order - b.sort_order);
      items.forEach((it) => sort(it.children));
    };
    sort(roots);
    return roots;
  };

  const handleDrop = (dragId: number, targetId: number | null) => {
    const newMemos = memos.map((m) =>
      m.id === dragId ? { ...m, parent_id: targetId } : m
    );
    onReorder(newMemos);
  };
  return (
    <div className={`flex flex-col h-full p-2 space-y-2 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <ImeInput
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="タイトル検索"
          className="border p-1 flex-1 mr-2"
        />
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            className="mr-1"
            checked={showDeleted}
            onChange={onToggleDeleted}
          />
          削除済み
        </label>
      </div>
      <TagSearchInput
        options={options}
        selected={tagFilter}
        onChange={onTagFilterChange}
        placeholder="タグで絞り込み"
        className="mb-2"
      />
      <button
        className="bg-blue-500 text-white px-2 py-1 rounded w-full mb-2"
        onClick={onCreate}
      >
        ＋新規作成
      </button>
      <div className="flex-1 overflow-y-auto">
        <ul
          className="space-y-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const dragId = Number(e.dataTransfer.getData('text/plain'));
            handleDrop(dragId, null);
          }}
        >
          {tree().map((node) => (
            <MemoNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onDrop={handleDrop}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface NodeProps {
  node: MemoTreeItem;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDrop: (dragId: number, targetId: number | null) => void;
  expanded: Set<number>;
  toggle: (id: number) => void;
}

function MemoNode({ node, depth, selectedId, onSelect, onDrop, expanded, toggle }: NodeProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(node.id));
  };
  const handleDropNode = (e: React.DragEvent) => {
    const dragId = Number(e.dataTransfer.getData('text/plain'));
    onDrop(dragId, node.id);
    e.stopPropagation();
    e.preventDefault();
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const expandedHere = expanded.has(node.id);
  return (
    <li
      className={`px-2 py-1 cursor-pointer select-none ${
        selectedId === node.id ? 'bg-blue-100' : ''
      }`}
      style={{ paddingLeft: depth * 16 }}
      draggable
      onDragStart={handleDragStart}
      onDrop={handleDropNode}
      onDragOver={handleDragOver}
      onClick={() => onSelect(node.id)}
    >
      <div className="flex items-center">
        {node.children.length > 0 && (
          <span
            className="mr-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggle(node.id);
            }}
          >
            {expandedHere ? '▼' : '▶'}
          </span>
        )}
        <span>{node.title}</span>
      </div>
      {expandedHere && node.children.length > 0 && (
        <ul className="mt-1">
          {node.children.map((child) => (
            <MemoNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDrop={onDrop}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
