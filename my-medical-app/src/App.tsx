// App.tsx
import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';

interface FacilityFunctionEntry {
  id: number;
  selected_values: string[];
  remarks: string;
  function: {
    id: number;
    name: string;
    selection_type?: 'single' | 'multi'; // 選択肢のタイプ
    choices?: string[]; // 選択肢
  };
}

interface Facility {
  id: number;
  short_name: string;
  official_name?: string;
  prefecture?: string;
  city?: string;
  address_detail?: string;
  phone_numbers: string[];
  fax?: string;
  functions: FacilityFunctionEntry[];
}

interface FunctionMaster {
  id: number;
  name: string;
  selection_type?: 'single' | 'multi';
  choices?: string[];
}

export default function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allFunctions, setAllFunctions] = useState<FunctionMaster[]>([]);

  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  //const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
  const [isFunctionMasterModalOpen, setIsFunctionMasterModalOpen] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [newSelectionType, setNewSelectionType] = useState<'single' | 'multi'>('single');
  const [newChoices, setNewChoices] = useState<string>('');
  const [modalSearchText, setModalSearchText] = useState('');

  // 機能編集モーダル用
  const [editingEntry, setEditingEntry] = useState<FacilityFunctionEntry | null>(null);
  
  useEffect(() => {
    fetch('http://192.168.174.29:8001/facilities')
      .then(res => res.json())
      .then(data => setFacilities(data))
      .catch(err => console.error('施設情報取得エラー:', err));
  }, []);

  useEffect(() => {
    fetch('http://192.168.174.29:8001/functions')
      .then(res => res.json())
      .then(data => {
        setAllFunctions(data);
        const newColumns: Record<string, boolean> = {
          id: true,
          short_name: true,
          official_name: true,
          prefecture: true,
          city: true,
          address_detail: true,
          phone_numbers: true,
          fax: true,
        };
        data.forEach((func: FunctionMaster) => {
          newColumns[`func_${func.id}`] = true;
        });
        setVisibleColumns(newColumns);
      })
      .catch(err => console.error('機能マスタ取得エラー:', err));
  }, []);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'short_name', label: '略名' },
    { key: 'official_name', label: '正式名称' },
    { key: 'prefecture', label: '都道府県' },
    { key: 'city', label: '市町村' },
    { key: 'address_detail', label: '住所詳細' },
    { key: 'phone_numbers', label: '電話番号' },
    { key: 'fax', label: 'FAX' },
    ...allFunctions.map((func) => ({
      key: `func_${func.id}`,
      label: func.name,
    })),
  ];

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleRightClick = (e, facilityId, funcId) => {
    e.preventDefault();
    const facility = facilities.find((f) => f.id === facilityId);
    let entry = facility?.functions.find((f) => f.function.id === funcId);

    if (!entry) {
      // 機能が未設定の場合は、新規の空エントリを作る
      const funcMaster = allFunctions.find((f) => f.id === funcId);
      if (funcMaster) {
        entry = {
          id: 0, // IDは仮（新規登録時にAPIで決まる）
          selected_values: [],
          remarks: '',
          function: funcMaster,
        };
      }
    }

    if (entry) {
      setEditingEntry(entry);
      setIsFunctionModalOpen(true);
    }
  };


  const handleSaveFunctionEntry = () => {
    if (!editingEntry) return;
    fetch(`http://192.168.174.29:8001/facility-function-entries/${editingEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingEntry),
    })
      .then(res => res.json())
      .then(() => {
        // 保存成功時にモーダルを閉じる
        setIsFunctionModalOpen(false);
        
        // 保存成功後に再取得
        fetch('http://192.168.174.29:8001/facilities')
          .then(res => res.json())
          .then(data => setFacilities(data));
        setIsModalOpen(false);
      })
      .catch(err => console.error('保存エラー:', err));
  };

  // 検索フィルタ
  const filteredFacilities = facilities.filter((facility) => {
    const targets: string[] = [
      facility.id.toString(),
      facility.short_name,
      facility.official_name || '',
      facility.prefecture || '',
      facility.city || '',
      facility.address_detail || '',
      facility.phone_numbers.join(', '),
      facility.fax || '',
    ];
    facility.functions.forEach((f) => {
      targets.push(f.function.name);
      targets.push(f.selected_values.join(', '));
      if (f.remarks) targets.push(f.remarks);
    });
    return targets.some((t) =>
      t.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  // ソート
  const sortedFacilities = [...filteredFacilities].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    if (sortKey.startsWith('func_')) {
      const funcId = parseInt(sortKey.replace('func_', ''));
      const aFunc = a.functions.find((f) => f.function.id === funcId);
      const bFunc = b.functions.find((f) => f.function.id === funcId);
      aVal = aFunc ? aFunc.selected_values.join(', ') : '';
      bVal = bFunc ? bFunc.selected_values.join(', ') : '';
    } else {
      aVal = (a as any)[sortKey] || '';
      bVal = (b as any)[sortKey] || '';
      if (Array.isArray(aVal)) aVal = aVal.join(', ');
      if (Array.isArray(bVal)) bVal = bVal.join(', ');
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // モーダル内の検索フィルタ
  const filteredColumns = columns.filter((col) =>
    col.label.toLowerCase().includes(modalSearchText.toLowerCase())
  );

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">医療機関一覧</h1>

      {/* 検索 */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          placeholder="キーワードで検索"
          className="border p-2 w-64"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button
          onClick={() => setIsColumnModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          表示項目変更
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={() => setIsFunctionMasterModalOpen(true)}
        >
    新規機能マスタ追加
  </button>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200 text-left">
              {columns
                .filter((col) => visibleColumns[col.key])
                .map((col) => (
                  <th
                    key={col.key}
                    className="py-2 px-4 border cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label} {sortKey === col.key && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {sortedFacilities.map((facility) => (
              <tr key={facility.id} className="hover:bg-gray-50">
                {columns
                  .filter((col) => visibleColumns[col.key])
                  .map((col) => {
                    if (col.key.startsWith('func_')) {
                      const funcId = parseInt(col.key.replace('func_', ''));
                      const fEntry = facility.functions.find(
                        (f) => f.function.id === funcId
                      );
                      return (
                        <td
                          key={col.key}
                          className="py-2 px-4 border whitespace-nowrap"
                          onContextMenu={(e) =>
                            handleRightClick(e, facility.id, funcId)
                          }
                        >
                          {fEntry
                            ? `${fEntry.selected_values.join(', ')}（${fEntry.remarks || '備考なし'}）`
                            : '-'}
                        </td>
                      );
                    } else {
                      const val = (facility as any)[col.key];
                      return (
                        <td
                          key={col.key}
                          className="py-2 px-4 border whitespace-nowrap"
                        >
                          {Array.isArray(val) ? val.join(', ') : val || '-'}
                        </td>
                      );
                    }
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      <Transition appear show={isColumnModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsColumnModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium mb-4">
                    表示項目を選択
                  </Dialog.Title>

                  {/* モーダル内の検索 */}
                  <input
                    type="text"
                    placeholder="検索"
                    value={modalSearchText}
                    onChange={(e) => setModalSearchText(e.target.value)}
                    className="border p-2 mb-4 w-full"
                  />

                  {/* トグルリスト */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredColumns.map((col) => (
                      <div key={col.key} className="flex justify-between items-center py-2">
                        <span>{col.label}</span>
                        <Switch
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className={`${
                            visibleColumns[col.key] ? 'bg-blue-500' : 'bg-gray-300'
                          } relative inline-flex h-6 w-11 items-center rounded-full`}
                        >
                          <span
                            className={`${
                              visibleColumns[col.key] ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                          />
                        </Switch>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setIsColumnModalOpen(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded"
                    >
                      閉じる
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* 機能編集モーダル */}
      <Transition appear show={isFunctionModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsFunctionModalOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <h3 className="text-lg font-bold mb-4">
                機能編集: {editingEntry?.function.name}
              </h3>
              {editingEntry && (
                <div>
                  <Switch
                    checked={!!editingEntry.selected_values.length}
                    onChange={(v) => {
                      setEditingEntry((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          selected_values: v
                            ? prev.function.choices && prev.function.choices.length > 0
                              ? [prev.function.choices[0]] // 例: 最初の選択肢をデフォルトで選択
                              : []
                            : [], // OFFの時は空配列
                        };
                      });
                    }}
                    className={`${
                      editingEntry.selected_values.length ? 'bg-green-500' : 'bg-gray-300'
                    } relative inline-flex h-6 w-11 items-center rounded-full mb-4`}
                  >
                    <span
                      className={`${
                        editingEntry.selected_values.length ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white shadow transition`}
                    />
                  </Switch>

                  {/* 備考欄 */}
                  <textarea
                    value={editingEntry.remarks || ''}
                    onChange={(e) =>
                      setEditingEntry((prev) =>
                        prev ? { ...prev, remarks: e.target.value } : prev
                      )
                    }
                    className="border p-2 w-full"
                    placeholder="備考"
                  />

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setIsFunctionModalOpen(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded mr-2"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveFunctionEntry}
                      className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                      保存
                    </button>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
      
      {/* 新規機能マスタ追加モーダル */}
      <Transition appear show={isFunctionMasterModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsFunctionMasterModalOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <h3 className="text-lg font-bold mb-4">新規機能マスタ追加</h3>

              {/* 機能名 */}
              <input
                type="text"
                placeholder="機能名"
                value={newFunctionName}
                onChange={(e) => setNewFunctionName(e.target.value)}
                className="border p-2 w-full mb-4"
              />

              {/* 選択タイプ */}
              <div className="mb-4">
                <label className="mr-2">選択タイプ:</label>
                <label className="mr-2">
                  <input
                    type="radio"
                    value="single"
                    checked={newSelectionType === 'single'}
                    onChange={() => setNewSelectionType('single')}
                  /> 単一
                </label>
                <label>
                  <input
                    type="radio"
                    value="multiple"
                    checked={newSelectionType === 'multiple'}
                    onChange={() => setNewSelectionType('multiple')}
                  /> 複数
                </label>
              </div>

              {/* 選択肢 */}
              <textarea
                placeholder="選択肢をカンマ区切りで入力"
                value={newChoices}
                onChange={(e) => setNewChoices(e.target.value)}
                className="border p-2 w-full mb-4"
              />

              <div className="flex justify-end">
                <button
                  onClick={() => setIsFunctionMasterModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded mr-2"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    // 保存リクエスト
                    fetch('http://192.168.174.29:8001/functions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: newFunctionName,
                        selection_type: newSelectionType,
                        choices: newChoices.split(',').map(c => c.trim()).filter(c => c),
                      }),
                    })
                      .then((res) => res.json())
                      .then(() => {
                        // 保存成功後：モーダル閉じる＆機能マスタ再取得
                        setIsFunctionMasterModalOpen(false);
                        setNewFunctionName('');
                        setNewSelectionType('single');
                        setNewChoices('');
                        fetch('http://192.168.174.29:8001/functions')
                          .then(res => res.json())
                          .then(data => setAllFunctions(data))
                          .catch(err => console.error('機能マスタ再取得エラー:', err));
                      })
                      .catch((err) => console.error('保存エラー:', err));
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  保存
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

    </div>
  );
}
