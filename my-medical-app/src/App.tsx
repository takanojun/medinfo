// App.tsx
import React, { useEffect, useState, Fragment } from 'react';
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

interface ContactInfo {
  value: string;
  comment: string;
}

interface Facility {
  id: number;
  short_name: string;
  official_name?: string;
  prefecture?: string;
  city?: string;
  address_detail?: string;
  phone_numbers: ContactInfo[];
  emails: ContactInfo[];
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
  const [functionOrder, setFunctionOrder] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  //const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
  const [isFunctionMasterModalOpen, setIsFunctionMasterModalOpen] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [newSelectionType, setNewSelectionType] = useState<'single' | 'multiple'>('single');
  const [newChoices, setNewChoices] = useState<string>('');
  const [editingFunctionMaster, setEditingFunctionMaster] = useState<FunctionMaster | null>(null);
  const [modalSearchText, setModalSearchText] = useState('');

  // 医療機関編集モーダル用
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  // 機能編集モーダル用
  const [editingEntry, setEditingEntry] = useState<FacilityFunctionEntry | null>(null);
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeFacility = (f: any): Facility => ({
    ...f,
    official_name: f.official_name || '',
    prefecture: f.prefecture || '',
    city: f.city || '',
    address_detail: f.address_detail || '',
    phone_numbers: Array.isArray(f.phone_numbers) ? f.phone_numbers : [],
    emails: Array.isArray(f.emails) ? f.emails : [],
    fax: f.fax || '',
    remarks: f.remarks || '',
  });

  const fetchFacilities = () =>
    fetch('http://192.168.174.29:8001/facilities')
      .then((res) => res.json())
      .then((data) => setFacilities(data.map(normalizeFacility)))
      .catch((err) => console.error('施設情報取得エラー:', err));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    fetch('http://192.168.174.29:8001/functions')
      .then(res => res.json())
      .then(data => {
        setAllFunctions(data);
        let order = data.map((f: FunctionMaster) => f.id);
        const savedOrder = getCookie('functionOrder');
        if (savedOrder) {
          const parsed = savedOrder
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => data.some((f: FunctionMaster) => f.id === v));
          const missing = data
            .map((f: FunctionMaster) => f.id)
            .filter((id: number) => !parsed.includes(id));
          order = [...parsed, ...missing];
        }
        setFunctionOrder(order);
        setCookie('functionOrder', order.join(','));
        const newColumns: Record<string, boolean> = {
          id: true,
          short_name: true,
          official_name: true,
          prefecture: true,
          city: true,
          address_detail: true,
          phone_numbers: true,
          emails: true,
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

  const refreshData = () => {
    Promise.all([
      fetch('http://192.168.174.29:8001/functions').then((res) => res.json()),
      fetch('http://192.168.174.29:8001/facilities').then((res) => res.json()),
    ])
      .then(([funcData, facData]) => {
        setAllFunctions(funcData);
        setFacilities(facData.map(normalizeFacility));
        let order = funcData.map((f: FunctionMaster) => f.id);
        const savedOrder = getCookie('functionOrder');
        if (savedOrder) {
          const parsed = savedOrder
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => funcData.some((f: FunctionMaster) => f.id === v));
          const missing = funcData
            .map((f: FunctionMaster) => f.id)
            .filter((id: number) => !parsed.includes(id));
          order = [...parsed, ...missing];
        }
        setFunctionOrder(order);
        setCookie('functionOrder', order.join(','));
        const cols: Record<string, boolean> = {
          id: visibleColumns['id'] ?? true,
          short_name: visibleColumns['short_name'] ?? true,
          official_name: visibleColumns['official_name'] ?? true,
          prefecture: visibleColumns['prefecture'] ?? true,
          city: visibleColumns['city'] ?? true,
          address_detail: visibleColumns['address_detail'] ?? true,
          phone_numbers: visibleColumns['phone_numbers'] ?? true,
          emails: visibleColumns['emails'] ?? true,
          fax: visibleColumns['fax'] ?? true,
          remarks: visibleColumns['remarks'] ?? true,
        };
        funcData.forEach((f: FunctionMaster) => {
          cols[`func_${f.id}`] = visibleColumns[`func_${f.id}`] ?? true;
        });
        setVisibleColumns(cols);
        setCookie('visibleColumns', JSON.stringify(cols));
      })
      .catch((err) => console.error('再取得エラー:', err));
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'short_name', label: '略名' },
    { key: 'official_name', label: '正式名称' },
    { key: 'prefecture', label: '都道府県' },
    { key: 'city', label: '市町村' },
    { key: 'address_detail', label: '住所詳細' },
    { key: 'phone_numbers', label: '電話番号' },
    { key: 'emails', label: 'メール' },
    { key: 'fax', label: 'FAX' },
    { key: 'remarks', label: '備考' },
    ...functionOrder
      .map((id: number) => allFunctions.find((f) => f.id === id))
      .filter((f): f is FunctionMaster => !!f)
      .map((func) => ({
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
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortOrder('none');
      } else {
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleRightClick = (
    e: React.MouseEvent<HTMLTableCellElement, MouseEvent>,
    facilityId: number,
    funcId: number
  ) => {
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

  const handleFacilityCellRightClick = (
    e: React.MouseEvent<HTMLTableCellElement, MouseEvent>,
    facility: Facility
  ) => {
    e.preventDefault();
    setEditingFacility(normalizeFacility(facility));
    setIsFacilityModalOpen(true);
  };

  const handleSaveFacility = () => {
    if (!editingFacility) return;

    const payload = {
      short_name: editingFacility.short_name,
      official_name: editingFacility.official_name,
      prefecture: editingFacility.prefecture,
      city: editingFacility.city,
      address_detail: editingFacility.address_detail,
      phone_numbers: editingFacility.phone_numbers,
      emails: editingFacility.emails,
      fax: editingFacility.fax,
      remarks: editingFacility.remarks,
    };

    const request =
      editingFacility.id === 0
        ? fetch('http://192.168.174.29:8001/facilities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : fetch(`http://192.168.174.29:8001/facilities/${editingFacility.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

    request
      .then((res) => res.json())
      .then(() => {
        setIsFacilityModalOpen(false);
        setEditingFacility(null);
        fetchFacilities();
      })
      .catch((err) => console.error('保存エラー:', err));
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
        fetchFacilities();
      })
      .catch((err) => console.error('保存エラー:', err));
  };

  const openNewFunctionMasterModal = () => {
    setEditingFunctionMaster(null);
    setNewFunctionName('');
    setNewSelectionType('single');
    setNewChoices('');
    setIsFunctionMasterModalOpen(true);
  };

  const openEditFunctionMasterModal = (func: FunctionMaster) => {
    setEditingFunctionMaster(func);
    setNewFunctionName(func.name);
    setNewSelectionType(func.selection_type || 'single');
    setNewChoices((func.choices || []).join('\n'));
    setIsFunctionMasterModalOpen(true);
  };

  const handleSaveFunctionMaster = () => {
    const payload = {
      name: newFunctionName,
      selection_type: newSelectionType,
      choices: newChoices
        .split('\n')
        .map((c) => c.trim())
        .filter((c) => c),
    };
    const url = editingFunctionMaster
      ? `http://192.168.174.29:8001/functions/${editingFunctionMaster.id}`
      : 'http://192.168.174.29:8001/functions';
    const method = editingFunctionMaster ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then(() => {
        setIsFunctionMasterModalOpen(false);
        setEditingFunctionMaster(null);
        setNewFunctionName('');
        setNewSelectionType('single');
        setNewChoices('');
        refreshData();
      })
      .catch((err) => console.error('保存エラー:', err));
  };

  const handleDeleteFunctionMaster = (id: number) => {
    if (!window.confirm('削除してよろしいですか？')) return;
    fetch(`http://192.168.174.29:8001/functions/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => {
        refreshData();
      })
      .catch((err) => console.error('削除エラー:', err));
  };

  const handleExportCsv = () => {
    const visibleCols = columns.filter((c) => visibleColumns[c.key]);
    const header = visibleCols.map((c) => c.label).join(',');
    const formatVal = (v: string) => `="${v.replace(/"/g, '""')}"`;

    const rows = sortedFacilities.map((fac) => {
      return visibleCols
        .map((col) => {
          if (col.key.startsWith('func_')) {
            const id = parseInt(col.key.replace('func_', ''));
            const entry = fac.functions.find((f) => f.function.id === id);
            if (!entry) return '';
            return entry.selected_values.join('|');
          }
          const val = (fac as unknown as Record<string, unknown>)[col.key];
          if (Array.isArray(val)) {
            return (val as ContactInfo[])
              .map((v) => formatVal(v.value))
              .join('|');
          }
          if (typeof val === 'string') {
            return formatVal(val);
          }
          return String(val ?? '');
        })
        .join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'facilities.csv';
    link.click();
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
      facility.phone_numbers.map(p => p.value).join(', '),
      facility.emails.map(e => e.value).join(', '),
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
    if (sortOrder === 'none') {
      return a.id - b.id;
    }
      let aVal: string | number | ContactInfo[] = '';
      let bVal: string | number | ContactInfo[] = '';
    if (sortKey.startsWith('func_')) {
      const funcId = parseInt(sortKey.replace('func_', ''));
      const aFunc = a.functions.find((f) => f.function.id === funcId);
      const bFunc = b.functions.find((f) => f.function.id === funcId);
      aVal = aFunc ? aFunc.selected_values.join(', ') : '';
      bVal = bFunc ? bFunc.selected_values.join(', ') : '';
    } else {
      const aRecord = a as unknown as Record<string, unknown>;
      const bRecord = b as unknown as Record<string, unknown>;
      aVal = aRecord[sortKey] as string | number | ContactInfo[] | undefined || '';
      bVal = bRecord[sortKey] as string | number | ContactInfo[] | undefined || '';
      if (Array.isArray(aVal)) {
        aVal = (aVal as ContactInfo[])
          .map((v) =>
            v.value ? `${v.value}${v.comment ? `（${v.comment}）` : ''}` : ''
          )
          .filter((v) => v)
          .join(', ');
      }
      if (Array.isArray(bVal)) {
        bVal = (bVal as ContactInfo[])
          .map((v) =>
            v.value ? `${v.value}${v.comment ? `（${v.comment}）` : ''}` : ''
          )
          .filter((v) => v)
          .join(', ');
      }
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
          onClick={() => {
            setEditingFacility({
              id: 0,
              short_name: '',
              official_name: '',
              prefecture: '',
              city: '',
              address_detail: '',
              phone_numbers: [],
              emails: [],
              fax: '',
              remarks: '',
              functions: [],
            });
            setIsFacilityModalOpen(true);
          }}
        >
          新規医療機関追加
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={handleExportCsv}
        >
          CSV出力
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={openNewFunctionMasterModal}
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
                    {col.label}{' '}
                    {sortKey === col.key && sortOrder !== 'none' &&
                      (sortOrder === 'asc' ? '▲' : '▼')}
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
                      const val = (facility as unknown as Record<string, unknown>)[col.key];
                      return (
                        <td
                          key={col.key}
                          className="py-2 px-4 border whitespace-nowrap"
                          onContextMenu={(e) => handleFacilityCellRightClick(e, facility)}
                        >
                          {(
                            Array.isArray(val)
                              ? val
                                  .map((v: ContactInfo) =>
                                    v.value ? `${v.value}${v.comment ? `（${v.comment}）` : ''}` : ''
                                  )
                                  .filter((v) => v)
                                  .join(', ')
                              : val || '-'
                          ) as React.ReactNode}
                        </td>
                      ) as React.ReactNode;
                    }
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-2">機能マスタ一覧</h2>
      <table className="min-w-max border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-2 py-1 border">ID</th>
            <th className="px-2 py-1 border">名称</th>
            <th className="px-2 py-1 border">操作</th>
          </tr>
        </thead>
        <tbody>
          {functionOrder
            .map((id: number) => allFunctions.find((f) => f.id === id))
            .filter((f): f is FunctionMaster => !!f)
            .map((func, idx) => (
            <tr
              key={func.id}
              className="hover:bg-gray-50"
              draggable
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex === null) return;
                const newOrder = [...functionOrder];
                const [moved] = newOrder.splice(dragIndex, 1);
                newOrder.splice(idx, 0, moved);
                setFunctionOrder(newOrder);
                setCookie('functionOrder', newOrder.join(','));
                setDragIndex(null);
              }}
            >
              <td className="border px-2">{func.id}</td>
              <td className="border px-2">{func.name}</td>
              <td className="border px-2">
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded mr-2"
                  onClick={() => openEditFunctionMasterModal(func)}
                >
                  編集
                </button>
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => handleDeleteFunctionMaster(func.id)}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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

      {/* 医療機関編集モーダル */}
      <Transition appear show={isFacilityModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsFacilityModalOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <h3 className="text-lg font-bold mb-4">
                {editingFacility?.id === 0 ? '新規医療機関追加' : `医療機関編集: ${editingFacility?.short_name}`}
              </h3>
              {editingFacility && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="略名"
                    value={editingFacility.short_name}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, short_name: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <input
                    type="text"
                    placeholder="正式名称"
                    value={editingFacility.official_name || ''}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, official_name: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <input
                    type="text"
                    placeholder="都道府県"
                    value={editingFacility.prefecture || ''}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, prefecture: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <input
                    type="text"
                    placeholder="市町村"
                    value={editingFacility.city || ''}
                    onChange={(e) => setEditingFacility({ ...editingFacility, city: e.target.value })}
                    className="border p-2 w-full"
                  />
                  <input
                    type="text"
                    placeholder="住所詳細"
                    value={editingFacility.address_detail || ''}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, address_detail: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <div className="space-y-2">
                    {editingFacility.phone_numbers.map((p, idx) => (
                      <div className="flex gap-2" key={idx}>
                        <input
                          type="text"
                          placeholder="電話番号"
                          value={p.value}
                          onChange={(e) => {
                            const list = [...editingFacility.phone_numbers];
                            list[idx] = { ...list[idx], value: e.target.value };
                            setEditingFacility({ ...editingFacility, phone_numbers: list });
                          }}
                          className="border p-2 w-full"
                        />
                        <input
                          type="text"
                          placeholder="コメント"
                          value={p.comment}
                          onChange={(e) => {
                            const list = [...editingFacility.phone_numbers];
                            list[idx] = { ...list[idx], comment: e.target.value };
                            setEditingFacility({ ...editingFacility, phone_numbers: list });
                          }}
                          className="border p-2 w-full"
                        />
                        <button
                          onClick={() => {
                            const list = [...editingFacility.phone_numbers];
                            list.splice(idx, 1);
                            setEditingFacility({ ...editingFacility, phone_numbers: list });
                          }}
                          className="px-2 bg-red-500 text-white rounded"
                        >削除</button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setEditingFacility({
                          ...editingFacility,
                          phone_numbers: [...editingFacility.phone_numbers, { value: '', comment: '' }],
                        })
                      }
                      className="px-2 py-1 bg-blue-500 text-white rounded"
                    >追加</button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {editingFacility.emails.map((m, idx) => (
                      <div className="flex gap-2" key={idx}>
                        <input
                          type="text"
                          placeholder="メールアドレス"
                          value={m.value}
                          onChange={(e) => {
                            const list = [...editingFacility.emails];
                            list[idx] = { ...list[idx], value: e.target.value };
                            setEditingFacility({ ...editingFacility, emails: list });
                          }}
                          className="border p-2 w-full"
                        />
                        <input
                          type="text"
                          placeholder="コメント"
                          value={m.comment}
                          onChange={(e) => {
                            const list = [...editingFacility.emails];
                            list[idx] = { ...list[idx], comment: e.target.value };
                            setEditingFacility({ ...editingFacility, emails: list });
                          }}
                          className="border p-2 w-full"
                        />
                        <button
                          onClick={() => {
                            const list = [...editingFacility.emails];
                            list.splice(idx, 1);
                            setEditingFacility({ ...editingFacility, emails: list });
                          }}
                          className="px-2 bg-red-500 text-white rounded"
                        >削除</button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setEditingFacility({
                          ...editingFacility,
                          emails: [...editingFacility.emails, { value: '', comment: '' }],
                        })
                      }
                      className="px-2 py-1 bg-blue-500 text-white rounded"
                    >メール追加</button>
                  </div>
                  <input
                    type="text"
                    placeholder="FAX"
                    value={editingFacility.fax || ''}
                    onChange={(e) => setEditingFacility({ ...editingFacility, fax: e.target.value })}
                    className="border p-2 w-full"
                  />
                  <textarea
                    placeholder="備考"
                    value={editingFacility.remarks || ''}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, remarks: e.target.value })
                    }
                    className="border p-2 w-full"
                  />

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setIsFacilityModalOpen(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded mr-2"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveFacility}
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

      {/* 機能編集モーダル */}
      <Transition appear show={isFunctionModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsFunctionModalOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <h3 className="text-lg font-bold mb-2">
                機能編集: {editingEntry?.function.name}
              </h3>
              <p className="mb-4">
                医療機関: {facilities.find(f => f.id === editingFacilityId)?.short_name}
              </p>
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
      
      {/* 機能マスタ追加/編集モーダル */}
      <Transition appear show={isFunctionMasterModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsFunctionMasterModalOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <h3 className="text-lg font-bold mb-4">
                {editingFunctionMaster ? '機能マスタ編集' : '新規機能マスタ追加'}
              </h3>

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
                rows={5}
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
                  onClick={handleSaveFunctionMaster}
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
