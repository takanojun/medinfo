// App.tsx
import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
};

const getCookie = (name: string): string | null => {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
};

interface FacilityFunctionEntry {
  id: number;
  selected_values: string[];
  remarks?: string;
  function: {
    id: number;
    name: string;
    selection_type?: 'single' | 'multiple'; // 選択肢のタイプ
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
  remarks?: string;
  functions: FacilityFunctionEntry[];
}

interface FunctionMaster {
  id: number;
  name: string;
  selection_type?: 'single' | 'multiple';
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
  const [newSelectionType, setNewSelectionType] = useState<'single' | 'multiple'>('single');
  const [newChoices, setNewChoices] = useState<string>('');
  const [modalSearchText, setModalSearchText] = useState('');

  // 機能編集モーダル用
  const [editingEntry, setEditingEntry] = useState<FacilityFunctionEntry | null>(null);
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(null);
  
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
          remarks: true,
        };
        data.forEach((func: FunctionMaster) => {
          newColumns[`func_${func.id}`] = true;
        });
        const saved = getCookie('visibleColumns');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            Object.keys(parsed).forEach((k) => {
              if (k in newColumns) {
                newColumns[k] = parsed[k];
              }
            });
          } catch (e) {
            console.error('Cookie parse error', e);
          }
        }
        setVisibleColumns(newColumns);
        setCookie('visibleColumns', JSON.stringify(newColumns));
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
    { key: 'remarks', label: '備考' },
    ...allFunctions.map((func) => ({
      key: `func_${func.id}`,
      label: func.name,
    })),
  ];

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setCookie('visibleColumns', JSON.stringify(updated));
      return updated;
    });
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
      setEditingFacilityId(facilityId);
      setIsFunctionModalOpen(true);
    }
  };


  const handleSaveFunctionEntry = () => {
    if (!editingEntry || editingFacilityId === null) return;

    const payload = {
      selected_values: editingEntry.selected_values,
      remarks: editingEntry.remarks,
    };

    const request =
      editingEntry.id === 0
        ? fetch('http://192.168.174.29:8001/facility-function-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              facility_id: editingFacilityId,
              function_id: editingEntry.function.id,
              ...payload,
            }),
          })
        : fetch(
            `http://192.168.174.29:8001/facility-function-entries/${editingEntry.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          );

    request
      .then((res) => res.json())
      .then(() => {
        setIsFunctionModalOpen(false);
        fetch('http://192.168.174.29:8001/facilities')
          .then((res) => res.json())
          .then((data) => setFacilities(data));
      })
      .catch((err) => console.error('保存エラー:', err));
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
      facility.remarks || '',
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aVal = (a as any)[sortKey] || '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                            ? fEntry.selected_values.length || fEntry.remarks
                              ? `${fEntry.selected_values.join(', ')}${fEntry.remarks ? `（${fEntry.remarks}）` : ''}`
                              : '-'
                            : '-'}
                        </td>
                      );
                    } else {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                  {editingEntry.function.selection_type === 'single' ? (
                    <Switch
                      checked={editingEntry.selected_values[0] === '〇'}
                      onChange={(v) =>
                        setEditingEntry((prev) =>
                          prev ? { ...prev, selected_values: [v ? '〇' : '×'] } : prev
                        )
                      }
                      className={`${
                        editingEntry.selected_values[0] === '〇' ? 'bg-green-500' : 'bg-gray-300'
                      } relative inline-flex h-6 w-11 items-center rounded-full mb-4`}
                    >
                      <span
                        className={`${
                          editingEntry.selected_values[0] === '〇' ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white shadow transition`}
                      />
                    </Switch>
                  ) : (
                    <div className="space-y-1 mb-4">
                      {editingEntry.function.choices?.map((c) => (
                        <label key={c} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingEntry.selected_values.includes(c)}
                            onChange={() =>
                              setEditingEntry((prev) => {
                                if (!prev) return prev;
                                const values = prev.selected_values.includes(c)
                                  ? prev.selected_values.filter((v) => v !== c)
                                  : [...prev.selected_values, c];
                                return { ...prev, selected_values: values };
                              })
                            }
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  )}

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
                placeholder="選択肢を改行で入力"
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
                    // 機能マスタ登録APIへPOST
                    fetch('http://192.168.174.29:8001/functions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        // API側はIDを要求しない
                        name: newFunctionName,
                        selection_type: newSelectionType,
                        // 改行区切り文字列を配列に変換して送信
                        choices: newChoices
                          .split('\n')
                          .map((c) => c.trim())
                          .filter((c) => c),
                      }),
                    })
                      .then((res) => res.json())
                      .then(() => {
                        // 保存成功後：モーダル閉じる＆機能マスタ再取得
                        setIsFunctionMasterModalOpen(false);
                        setNewFunctionName('');
                        setNewSelectionType('single');
                        setNewChoices('');
                        Promise.all([
                          fetch('http://192.168.174.29:8001/functions').then((res) => res.json()),
                          fetch('http://192.168.174.29:8001/facilities').then((res) => res.json()),
                        ])
                          .then(([funcData, facData]) => {
                            setAllFunctions(funcData);
                            setFacilities(facData);
                            const cols: Record<string, boolean> = {
                              id: true,
                              short_name: true,
                              official_name: true,
                              prefecture: true,
                              city: true,
                              address_detail: true,
                              phone_numbers: true,
                              fax: true,
                              remarks: true,
                            };
                            funcData.forEach((f: FunctionMaster) => {
                              cols[`func_${f.id}`] = true;
                            });
                            const savedCols = getCookie('visibleColumns');
                            if (savedCols) {
                              try {
                                const parsed = JSON.parse(savedCols);
                                Object.keys(parsed).forEach((k) => {
                                  if (k in cols) {
                                    cols[k] = parsed[k];
                                  }
                                });
                              } catch (e) {
                                console.error('Cookie parse error', e);
                              }
                            }
                            setVisibleColumns(cols);
                            setCookie('visibleColumns', JSON.stringify(cols));
                          })
                          .catch((err) => console.error('再取得エラー:', err));
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
