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
}

export default function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allFunctions, setAllFunctions] = useState<FunctionMaster[]>([]);

  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchText, setModalSearchText] = useState('');

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
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          表示項目変更
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
                        <td key={col.key} className="py-2 px-4 border whitespace-nowrap">
                          {fEntry
                            ? `${fEntry.selected_values.join(', ')}（${fEntry.remarks || '備考なし'}）`
                            : '-'}
                        </td>
                      );
                    } else {
                      const val = (facility as any)[col.key];
                      return (
                        <td key={col.key} className="py-2 px-4 border whitespace-nowrap">
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
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
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
                      onClick={() => setIsModalOpen(false)}
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
    </div>
  );
}
