import React, { useState, useEffect } from 'react';
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

  // Expand all nodes by default and include newly added memos
  useEffect(() => {
    setExpanded((prev) => {
      const all = new Set(prev);
      memos.forEach((m) => all.add(m.id));
      return all;
    });
  }, [memos]);

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

  const isAncestorOrSelf = (id: number | null, potentialAncestor: number): boolean => {
    let current = memos.find((m) => m.id === id);
    while (current) {
      if (current.id === potentialAncestor) return true;
      current =
        current.parent_id != null
          ? memos.find((m) => m.id === current!.parent_id)
          : undefined;
    }
    return false;
  };

  const buildTreeFromList = (list: MemoItem[]): MemoTreeItem[] => {
    const map = new Map<number, MemoTreeItem>();
    list.forEach((m) => map.set(m.id, { ...m, children: [] }));
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

  const flattenTree = (nodes: MemoTreeItem[], out: MemoItem[] = []): MemoItem[] => {
    nodes.forEach((n) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children, ...rest } = n;
      out.push(rest);
      flattenTree(n.children, out);
    });
    return out;
  };

  const findNode = (
    nodes: MemoTreeItem[],
    id: number,
    parent: MemoTreeItem | null = null,
  ): { node: MemoTreeItem; parent: MemoTreeItem | null } | null => {
    for (const n of nodes) {
      if (n.id === id) return { node: n, parent };
      const res = findNode(n.children, id, n);
      if (res) return res;
    }
    return null;
  };

  const moveSubtree = (
    list: MemoItem[],
    dragId: number,
    beforeId: number | null,
    parentId: number | null,
  ) => {
    const roots = buildTreeFromList(list);
    const dragInfo = findNode(roots, dragId);
    if (!dragInfo) return list;
    const from = dragInfo.parent ? dragInfo.parent.children : roots;
    const dragIndex = from.findIndex((n) => n.id === dragId);
    if (dragIndex === -1) return list;
    const [dragNode] = from.splice(dragIndex, 1);
    dragNode.parent_id = parentId;

    const targetParent =
      parentId === null ? null : findNode(roots, parentId)?.node || null;
    const to = targetParent ? targetParent.children : roots;

    let insertIndex = to.length;
    if (beforeId !== null) {
      const idx = to.findIndex((n) => n.id === beforeId);
      if (idx !== -1) insertIndex = idx;
    }
    to.splice(insertIndex, 0, dragNode);

    const flattened = flattenTree(roots);
    flattened.forEach((m, i) => (m.sort_order = i + 1));
    return flattened;
  };

  const handleDropAsChild = (dragId: number, parentId: number | null) => {
    if (dragId === parentId) return;
    if (parentId !== null && isAncestorOrSelf(parentId, dragId)) return;
    const list = moveSubtree([...memos], dragId, null, parentId);
    onReorder(list);
  };

  const handleDropAt = (
    dragId: number,
    beforeId: number | null,
    parentId: number | null,
  ) => {
  console.log('handleDropAt called', { dragId, beforeId, parentId });
    if (dragId === beforeId) return;
    if (parentId !== null && isAncestorOrSelf(parentId, dragId)) return;
    // prevent dropping a node before one of its own descendants
    if (beforeId !== null && isAncestorOrSelf(dragId, beforeId)) return;
    const list = moveSubtree([...memos], dragId, beforeId, parentId);
    onReorder(list);
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
      <div
        className="flex-1 overflow-y-auto"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const dragId = Number(e.dataTransfer.getData('text/plain'));
          handleDropAt(dragId, null, null);
        }}
      >
        <ul className="space-y-1">
          <DropZone
            onDrop={(id) => handleDropAt(id, tree()[0]?.id ?? null, null)}
          />
          {tree().map((node, idx) => (
            <React.Fragment key={node.id}>
              <MemoNode
                node={node}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                onDropAsChild={handleDropAsChild}
                onDropAt={handleDropAt}
                expanded={expanded}
                toggle={toggle}
              />
              <DropZone
                onDrop={(id) =>
                  handleDropAt(
                    id,
                    tree()[idx + 1]?.id ?? null,
                    null,
                  )
                }
              />
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface DropZoneProps {
  onDrop: (dragId: number) => void;
}

function DropZone({ onDrop }: DropZoneProps) {
  const [over, setOver] = useState(false);

  return (
    <li
      // 高さは常に 1px だけ確保（ほぼ見えない）
      className="relative h-px my-0"   // h-px = 1px, my-0 = 余白ゼロ
      onDragOver={(e) => {
        e.preventDefault();
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const dragId = Number(e.dataTransfer.getData('text/plain'));
        onDrop(dragId);
        setOver(false);
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {/* 線だけを描画するレイヤー。普段は透明なので“改行”に見えない */}
      <div
        className={`absolute inset-0 border-t-2 transition-colors duration-75 ${
          over ? 'border-blue-500' : 'border-transparent'
        } pointer-events-none`}
      />
    </li>
  );
}



interface NodeProps {
  node: MemoTreeItem;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDropAsChild: (dragId: number, parentId: number | null) => void;
  onDropAt: (dragId: number, beforeId: number | null, parentId: number | null) => void;
  expanded: Set<number>;
  toggle: (id: number) => void;
}

function MemoNode({
  node,
  depth,
  selectedId,
  onSelect,
  onDropAsChild,
  onDropAt,
  expanded,
  toggle,
}: NodeProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(node.id));
    e.stopPropagation();
  };
  const handleDropNode = (e: React.DragEvent) => {
    const dragId = Number(e.dataTransfer.getData('text/plain'));
    onDropAsChild(dragId, node.id);
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
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
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
          <DropZone
            onDrop={(id) =>
              onDropAt(id, node.children[0]?.id ?? null, node.id)
            }
          />
          {node.children.map((child, idx) => (
            <React.Fragment key={child.id}>
              <MemoNode
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onDropAsChild={onDropAsChild}
                onDropAt={onDropAt}
                expanded={expanded}
                toggle={toggle}
              />
              <DropZone
                onDrop={(id) =>
                  onDropAt(
                    id,
                    node.children[idx + 1]?.id ?? null,
                    node.id,
                  )
                }
              />
            </React.Fragment>
          ))}
        </ul>
      )}
    </li>
  );
}
