// App.tsx
import React, { useEffect, useState, Fragment, useRef } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import './App.css';
import ImeInput from './components/ImeInput';
import ImeTextarea from './components/ImeTextarea';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001';

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
    memo?: string;
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
  memo?: string;
  selection_type?: 'single' | 'multiple';
  choices?: string[];
  category_id?: number;
  is_deleted?: boolean;
}

interface FunctionCategory {
  id: number;
  name: string;
  description?: string;
  is_deleted?: boolean;
}

export default function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allFunctions, setAllFunctions] = useState<FunctionMaster[]>([]);
  const [allCategories, setAllCategories] = useState<FunctionCategory[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<number[]>([]);
  const [categoryMasterOrder, setCategoryMasterOrder] = useState<number[]>([]);
  const [functionOrder, setFunctionOrder] = useState<number[]>([]);
  const [facilityOrder, setFacilityOrder] = useState<number[]>([]);
  const [dragCategoryIndex, setDragCategoryIndex] = useState<number | null>(null);
  const [dragCategoryForFuncList, setDragCategoryForFuncList] = useState<number | null>(null);
  const [dragFunctionId, setDragFunctionId] = useState<number | null>(null);
  const [dragFacilityIndex, setDragFacilityIndex] = useState<number | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('AND');
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  //const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
  const [isFunctionMasterModalOpen, setIsFunctionMasterModalOpen] = useState(false);
  const [isFunctionMasterListOpen, setIsFunctionMasterListOpen] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [newSelectionType, setNewSelectionType] = useState<'single' | 'multiple'>('single');
  const [newChoices, setNewChoices] = useState<string>('');
  const [newMemo, setNewMemo] = useState<string>('');
  const [newFunctionCategoryId, setNewFunctionCategoryId] = useState<number | null>(null);
  const [editingFunctionMaster, setEditingFunctionMaster] = useState<FunctionMaster | null>(null);
  const [isCategoryMasterListOpen, setIsCategoryMasterListOpen] = useState(false);
  const [isCategoryMasterModalOpen, setIsCategoryMasterModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FunctionCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [modalSearchText, setModalSearchText] = useState('');
  const [modalSearchMode, setModalSearchMode] = useState<'AND' | 'OR'>('AND');

  // 表示医療機関制御用
  const [visibleFacilities, setVisibleFacilities] = useState<Record<number, boolean>>({});
  const [isFacilityVisibilityModalOpen, setIsFacilityVisibilityModalOpen] = useState(false);
  const [facilityModalSearchText, setFacilityModalSearchText] = useState('');
  const [facilityModalSearchMode, setFacilityModalSearchMode] = useState<'AND' | 'OR'>('AND');

  // 一時的な列・行非表示用
  const [tempHiddenColumns, setTempHiddenColumns] = useState<Record<string, boolean>>({});
  const [headerContextMenu, setHeaderContextMenu] = useState<{ x: number; y: number; key: string } | null>(null);
  const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number; facility: Facility } | null>(null);

  // 機能マスタ・カテゴリマスタ用検索/フィルタ
  const [functionListSearchText, setFunctionListSearchText] = useState('');
  const [functionListSearchMode, setFunctionListSearchMode] = useState<'AND' | 'OR'>('AND');
  const [functionCategoryFilter, setFunctionCategoryFilter] = useState<number | ''>('');
  const [categoryListSearchText, setCategoryListSearchText] = useState('');
  const [categoryListSearchMode, setCategoryListSearchMode] = useState<'AND' | 'OR'>('AND');
  const [showDeletedFunctions, setShowDeletedFunctions] = useState(false);
  const [showDeletedCategories, setShowDeletedCategories] = useState(false);
  const [showFunctionRemarks, setShowFunctionRemarks] = useState(true);

  const [notification, setNotification] = useState<string | null>(null);

  const showError = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    const closeMenus = () => {
      setHeaderContextMenu(null);
      setRowContextMenu(null);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const matchesKeywords = (
    text: string,
    keywords: string[],
    mode: 'AND' | 'OR'
  ) => {
    if (keywords.length === 0) return true;
    const lower = text.toLowerCase();
    if (mode === 'AND') {
      return keywords.every((k) => lower.includes(k));
    }
    return keywords.some((k) => lower.includes(k));
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('click', handleOutside);
      window.addEventListener('contextmenu', handleOutside);
    }
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('contextmenu', handleOutside);
    };
  }, [isMenuOpen]);

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
    fetch(`${apiBase}/facilities`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.map(normalizeFacility);
        setFacilities(list);
        setVisibleFacilities((prev) => {
          const updated = { ...prev };
          list.forEach((f: Facility) => {
            if (!(f.id in updated)) updated[f.id] = true;
          });
          return updated;
        });
        let order = list.map((f: Facility) => f.id);
        const saved = getCookie('facilityOrder');
        if (saved) {
          const parsed = saved
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => list.some((f: Facility) => f.id === v));
          const missing = list
            .map((f: Facility) => f.id)
            .filter((id: number) => !parsed.includes(id));
          order = [...parsed, ...missing];
        } else {
          order = list
            .slice()
            .sort((a, b) => a.short_name.localeCompare(b.short_name))
            .map((f) => f.id);
        }
        setFacilityOrder(order);
        setCookie('facilityOrder', order.join(','));
      })
      .catch((err) => {
        console.error('施設情報取得エラー:', err);
        showError('施設情報の取得に失敗しました');
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/function-categories?include_deleted=true`).then((res) => res.json()),
      fetch(`${apiBase}/functions?include_deleted=true`).then((res) => res.json()),
    ])
      .then(([catData, funcData]) => {
        setAllCategories(catData);
        let funcCatOrder = catData.map((c: FunctionCategory) => c.id);
        const savedFunc = getCookie('functionCategoryOrder');
        if (savedFunc) {
          const parsed = savedFunc
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => catData.some((c: FunctionCategory) => c.id === v));
          const missing = catData
            .map((c: FunctionCategory) => c.id)
            .filter((id: number) => !parsed.includes(id));
          funcCatOrder = [...parsed, ...missing];
        }
        setCategoryOrder(funcCatOrder);
        setCookie('functionCategoryOrder', funcCatOrder.join(','));

        let catMasterOrder = catData.map((c: FunctionCategory) => c.id);
        const savedMaster = getCookie('categoryMasterOrder');
        if (savedMaster) {
          const parsed = savedMaster
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => catData.some((c: FunctionCategory) => c.id === v));
          const missing = catData
            .map((c: FunctionCategory) => c.id)
            .filter((id: number) => !parsed.includes(id));
          catMasterOrder = [...parsed, ...missing];
        }
        setCategoryMasterOrder(catMasterOrder);
        setCookie('categoryMasterOrder', catMasterOrder.join(','));

        const hasUncategorized = funcData.some(
          (f: FunctionMaster) => f.category_id === null,
        );

        const g: Record<string, boolean> = { facility: true };
        funcCatOrder.forEach((id: number) => {
          g[`cat_${id}`] = true;
        });
        if (hasUncategorized) {
          g['cat_null'] = true;
        }
        const savedGroups = getCookie('visibleColumnGroups');
        if (savedGroups) {
          try {
            const parsed = JSON.parse(savedGroups);
            Object.keys(parsed).forEach((k) => {
              if (k in g) g[k] = parsed[k];
            });
          } catch (e) {
            console.error('Cookie parse error', e);
          }
        }
        setVisibleGroups(g);
        setCookie('visibleColumnGroups', JSON.stringify(g));

        const c: Record<string, boolean> = { facility: false };
        funcCatOrder.forEach((id: number) => {
          c[`cat_${id}`] = false;
        });
        if (hasUncategorized) {
          c['cat_null'] = false;
        }
        const savedColl = getCookie('collapsedColumnGroups');
        if (savedColl) {
          try {
            const parsed = JSON.parse(savedColl);
            Object.keys(parsed).forEach((k) => {
              if (k in c) c[k] = parsed[k];
            });
          } catch (e) {
            console.error('Cookie parse error', e);
          }
        }
        setCollapsedGroups(c);
        setCookie('collapsedColumnGroups', JSON.stringify(c));

        setAllFunctions(funcData);
        let orderF = funcData.map((f: FunctionMaster) => f.id);
        const savedOrder = getCookie('functionOrder');
        if (savedOrder) {
          const parsed = savedOrder
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => funcData.some((f: FunctionMaster) => f.id === v));
          const missing = funcData
            .map((f: FunctionMaster) => f.id)
            .filter((id: number) => !parsed.includes(id));
          orderF = [...parsed, ...missing];
        }
        setFunctionOrder(orderF);
        setCookie('functionOrder', orderF.join(','));
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
        funcData.forEach((func: FunctionMaster) => {
          newColumns[`func_${func.id}`] = true;
        });
        const savedCols = getCookie('visibleColumns');
        if (savedCols) {
          try {
            const parsed = JSON.parse(savedCols);
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
      .catch((err) => {
        console.error('初期データ取得エラー:', err);
        showError('データの取得に失敗しました');
      });
  }, []);

  const refreshData = () => {
    Promise.all([
      fetch(`${apiBase}/function-categories?include_deleted=true`).then((res) => res.json()),
      fetch(`${apiBase}/functions?include_deleted=true`).then((res) => res.json()),
      fetch(`${apiBase}/facilities`).then((res) => res.json()),
    ])
      .then(([catData, funcData, facData]) => {
        setAllCategories(catData);
        let funcCatOrder = catData.map((c: FunctionCategory) => c.id);
        const savedFunc = getCookie('functionCategoryOrder');
        if (savedFunc) {
          const parsed = savedFunc
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => catData.some((c: FunctionCategory) => c.id === v));
          const missing = catData
            .map((c: FunctionCategory) => c.id)
            .filter((id: number) => !parsed.includes(id));
          funcCatOrder = [...parsed, ...missing];
        }
        setCategoryOrder(funcCatOrder);
        setCookie('functionCategoryOrder', funcCatOrder.join(','));

        let catMasterOrder = catData.map((c: FunctionCategory) => c.id);
        const savedMaster = getCookie('categoryMasterOrder');
        if (savedMaster) {
          const parsed = savedMaster
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => catData.some((c: FunctionCategory) => c.id === v));
          const missing = catData
            .map((c: FunctionCategory) => c.id)
            .filter((id: number) => !parsed.includes(id));
          catMasterOrder = [...parsed, ...missing];
        }
        setCategoryMasterOrder(catMasterOrder);
        setCookie('categoryMasterOrder', catMasterOrder.join(','));

        const hasUncategorized = funcData.some((f: FunctionMaster) => f.category_id === null);

        const g: Record<string, boolean> = { facility: visibleGroups['facility'] ?? true };
        funcCatOrder.forEach((id: number) => {
          g[`cat_${id}`] = visibleGroups[`cat_${id}`] ?? true;
        });
        if (hasUncategorized) {
          g['cat_null'] = visibleGroups['cat_null'] ?? true;
        }
        const savedGroups = getCookie('visibleColumnGroups');
        if (savedGroups) {
          try {
            const parsed = JSON.parse(savedGroups);
            Object.keys(parsed).forEach((k) => {
              if (k in g) g[k] = parsed[k];
            });
          } catch (e) {
            console.error('Cookie parse error', e);
          }
        }
        setVisibleGroups(g);
        setCookie('visibleColumnGroups', JSON.stringify(g));

        const c: Record<string, boolean> = { facility: collapsedGroups['facility'] ?? false };
        funcCatOrder.forEach((id: number) => {
          c[`cat_${id}`] = collapsedGroups[`cat_${id}`] ?? false;
        });
        if (hasUncategorized) {
          c['cat_null'] = collapsedGroups['cat_null'] ?? false;
        }
        const savedColl = getCookie('collapsedColumnGroups');
        if (savedColl) {
          try {
            const parsed = JSON.parse(savedColl);
            Object.keys(parsed).forEach((k) => {
              if (k in c) c[k] = parsed[k];
            });
          } catch (e) {
            console.error('Cookie parse error', e);
          }
        }
        setCollapsedGroups(c);
        setCookie('collapsedColumnGroups', JSON.stringify(c));

        setAllFunctions(funcData);
        const facList = facData.map(normalizeFacility);
        setFacilities(facList);
        setVisibleFacilities((prev) => {
          const updated = { ...prev };
          facList.forEach((f: Facility) => {
            if (!(f.id in updated)) updated[f.id] = true;
          });
          return updated;
        });
        let facOrder = facList.map((f: Facility) => f.id);
        const savedFacOrder = getCookie('facilityOrder');
        if (savedFacOrder) {
          const parsed = savedFacOrder
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => facList.some((f: Facility) => f.id === v));
          const missing = facList
            .map((f: Facility) => f.id)
            .filter((id: number) => !parsed.includes(id));
          facOrder = [...parsed, ...missing];
        } else {
          facOrder = facList
            .slice()
            .sort((a, b) => a.short_name.localeCompare(b.short_name))
            .map((f) => f.id);
        }
        setFacilityOrder(facOrder);
        setCookie('facilityOrder', facOrder.join(','));
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
      .catch((err) => {
        console.error('再取得エラー:', err);
        showError('データの再取得に失敗しました');
      });
  };

  const hasUncategorizedColumn = allFunctions.some(
    (f) => !f.is_deleted && f.category_id === null,
  );

  const columnGroups = [
    { id: 'facility', label: '医療機関情報' },
    ...categoryOrder
      .map((id) => allCategories.find((c) => c.id === id))
      .filter(
        (c): c is FunctionCategory =>
          !!c && (showDeletedCategories || !c.is_deleted)
      )
      .map((cat) => ({ id: `cat_${cat.id}`, label: cat.name })),
    ...(hasUncategorizedColumn ? [{ id: 'cat_null', label: '未選択' }] : []),
  ];

  const columns = [
    { key: 'id', label: 'ID', group: 'facility' },
    { key: 'short_name', label: '略名', group: 'facility' },
    { key: 'official_name', label: '正式名称', group: 'facility' },
    { key: 'prefecture', label: '都道府県', group: 'facility' },
    { key: 'city', label: '市町村', group: 'facility' },
    { key: 'address_detail', label: '住所詳細', group: 'facility' },
    { key: 'phone_numbers', label: '電話番号', group: 'facility' },
    { key: 'emails', label: 'メール', group: 'facility' },
    { key: 'fax', label: 'FAX', group: 'facility' },
    { key: 'remarks', label: '備考', group: 'facility' },
    ...functionOrder
      .map((id: number) => allFunctions.find((f) => f.id === id))
      .filter(
        (f): f is FunctionMaster => !!f && (showDeletedFunctions || !f.is_deleted)
      )
      .map((func) => ({
        key: `func_${func.id}`,
        label: func.name,
        group: `cat_${func.category_id}`,
      })),
  ];

  const toggleColumn = (key: string, groupId: string) => {
    const newVal = !visibleColumns[key];
    if (newVal && !visibleGroups[groupId]) {
      setVisibleGroups((prev) => {
        const updated = { ...prev, [groupId]: true };
        setCookie('visibleColumnGroups', JSON.stringify(updated));
        return updated;
      });
    }
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: newVal };
      setCookie('visibleColumns', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleGroup = (groupId: string) => {
    setVisibleGroups((prev) => {
      const updated = { ...prev, [groupId]: !prev[groupId] };
      setCookie('visibleColumnGroups', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const updated = { ...prev, [groupId]: !prev[groupId] };
      setCookie('collapsedColumnGroups', JSON.stringify(updated));
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

  const handleHeaderContextMenu = (
    e: React.MouseEvent<HTMLTableCellElement, MouseEvent>,
    key: string,
  ) => {
    e.preventDefault();
    setHeaderContextMenu({ x: e.clientX, y: e.clientY, key });
  };

  const handleHideColumn = (key: string) => {
    setTempHiddenColumns((prev) => ({ ...prev, [key]: true }));
  };

  const handleFacilityCellRightClick = (
    e: React.MouseEvent<HTMLTableCellElement, MouseEvent>,
    facility: Facility,
  ) => {
    e.preventDefault();
    setRowContextMenu({ x: e.clientX, y: e.clientY, facility });
  };

  const handleHideFacility = (id: number) => {
    setVisibleFacilities((prev) => ({ ...prev, [id]: false }));
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
        ? fetch(`${apiBase}/facilities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : fetch(`${apiBase}/facilities/${editingFacility.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

    request
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          showError(data.detail ?? '保存に失敗しました');
          throw new Error('save failed');
        }
        return data;
      })
      .then(() => {
        setIsFacilityModalOpen(false);
        setEditingFacility(null);
        fetchFacilities();
      })
      .catch((err) => {
        if (err.message !== 'save failed') {
          console.error('保存エラー:', err);
          showError('保存に失敗しました');
        }
      });
  };

  const handleDeleteFacility = () => {
    if (!editingFacility || editingFacility.id === 0) return;
    if (!window.confirm('削除してよろしいですか？')) return;
    fetch(`${apiBase}/facilities/${editingFacility.id}`, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then(() => {
        setIsFacilityModalOpen(false);
        setEditingFacility(null);
        fetchFacilities();
      })
      .catch((err) => {
        console.error('削除エラー:', err);
        showError('削除に失敗しました');
      });
  };


  const handleSaveFunctionEntry = () => {
    if (!editingEntry || editingFacilityId === null) return;

    const payload = {
      selected_values: editingEntry.selected_values,
      remarks: editingEntry.remarks,
    };

    const request =
      editingEntry.id === 0
        ? fetch(`${apiBase}/facility-function-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              facility_id: editingFacilityId,
              function_id: editingEntry.function.id,
              ...payload,
            }),
          })
        : fetch(
            `${apiBase}/facility-function-entries/${editingEntry.id}`,
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
      .catch((err) => {
        console.error('保存エラー:', err);
        showError('保存に失敗しました');
      });
  };

  const openNewFunctionMasterModal = () => {
    setEditingFunctionMaster(null);
    setNewFunctionName('');
    setNewSelectionType('single');
    setNewChoices('');
    setNewMemo('');
    // 新規作成時はカテゴリ未選択を初期値とする
    setNewFunctionCategoryId(null);
    setIsFunctionMasterModalOpen(true);
  };

  const openEditFunctionMasterModal = (func: FunctionMaster) => {
    setEditingFunctionMaster(func);
    setNewFunctionName(func.name);
    setNewSelectionType(func.selection_type || 'single');
    setNewChoices((func.choices || []).join('\n'));
    setNewMemo(func.memo || '');
    setNewFunctionCategoryId(func.category_id ?? null);
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
      memo: newMemo || undefined,
      // category_id は null を明示的に送信して未選択状態に戻せるようにする
      category_id: newFunctionCategoryId,
    };
    const url = editingFunctionMaster
      ? `${apiBase}/functions/${editingFunctionMaster.id}`
      : `${apiBase}/functions`;
    const method = editingFunctionMaster ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          showError(data.detail ?? '保存に失敗しました');
          throw new Error('save failed');
        }
        return data;
      })
      .then((saved) => {
        const prevCat = editingFunctionMaster?.category_id ?? null;
        const wasEditing = !!editingFunctionMaster;
        setIsFunctionMasterModalOpen(false);
        setEditingFunctionMaster(null);
        setNewFunctionName('');
        setNewSelectionType('single');
        setNewChoices('');
        setNewMemo('');

        const reorderNeeded = !wasEditing || prevCat !== saved.category_id;
        if (reorderNeeded) {
          // 既存の並び順から今回保存した機能のIDを一旦除外
          const order = functionOrder.filter((id) => id !== saved.id);
          const targetCat = saved.category_id ?? null;
          // 同一カテゴリ内の最後の位置を取得
          let insertPos = order.length;
          for (let i = order.length - 1; i >= 0; i--) {
            const f = allFunctions.find((fn) => fn.id === order[i]);
            const catId = f?.category_id ?? null;
            if (catId === targetCat) {
              insertPos = i + 1;
              break;
            }
          }
          order.splice(insertPos, 0, saved.id);
          setFunctionOrder(order);
          setCookie('functionOrder', order.join(','));
        }

        refreshData();
      })
      .catch((err) => {
        if (err.message !== 'save failed') {
          console.error('保存エラー:', err);
          showError('保存に失敗しました');
        }
      });
  };

  const handleDeleteFunctionMaster = (id: number) => {
    if (!window.confirm('削除してよろしいですか？')) return;
    fetch(`${apiBase}/functions/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => {
        refreshData();
      })
      .catch((err) => {
        console.error('削除エラー:', err);
        showError('削除に失敗しました');
      });
  };

  const handleRestoreFunctionMaster = (id: number) => {
    if (!window.confirm('復元してよろしいですか？')) return;
    fetch(`${apiBase}/functions/${id}/restore`, { method: 'PUT' })
      .then((res) => res.json())
      .then(() => refreshData())
      .catch((err) => {
        console.error('復元エラー:', err);
        showError('復元に失敗しました');
      });
  };

  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryDesc('');
    setIsCategoryMasterModalOpen(true);
  };

  const openEditCategoryModal = (cat: FunctionCategory) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryDesc(cat.description || '');
    setIsCategoryMasterModalOpen(true);
  };

  const handleSaveCategory = () => {
    const payload = { name: newCategoryName, description: newCategoryDesc || undefined };
    const url = editingCategory
      ? `${apiBase}/function-categories/${editingCategory.id}`
      : `${apiBase}/function-categories`;
    const method = editingCategory ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          showError(data.detail ?? '保存に失敗しました');
          throw new Error('save failed');
        }
        return data;
      })
      .then(() => {
        setIsCategoryMasterModalOpen(false);
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryDesc('');
        refreshData();
      })
      .catch((err) => {
        if (err.message !== 'save failed') {
          console.error('保存エラー:', err);
          showError('保存に失敗しました');
        }
      });
  };

  const handleDeleteCategory = (id: number) => {
    if (!window.confirm('削除してよろしいですか？')) return;
    fetch(`${apiBase}/function-categories/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => {
        refreshData();
      })
      .catch((err) => {
        console.error('削除エラー:', err);
        showError('削除に失敗しました');
      });
  };

  const handleRestoreCategory = (id: number) => {
    if (!window.confirm('復元してよろしいですか？')) return;
    fetch(`${apiBase}/function-categories/${id}/restore`, { method: 'PUT' })
      .then((res) => res.json())
      .then(() => refreshData())
      .catch((err) => {
        console.error('復元エラー:', err);
        showError('復元に失敗しました');
      });
  };

  const handleExportCsv = () => {
    const visibleCols = columns.filter(
      (c) => visibleGroups[c.group] && visibleColumns[c.key] && !collapsedGroups[c.group]
    );
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
  const searchKeywords = searchText
    .trim()
    .split(/[\s\u3000]+/)
    .filter((v) => v)
    .map((v) => v.toLowerCase());

  const filteredFacilities = facilities.filter((facility) => {
    const targets: string[] = [
      facility.id.toString(),
      facility.short_name,
      facility.official_name || '',
      facility.prefecture || '',
      facility.city || '',
      facility.address_detail || '',
      facility.phone_numbers.map((p) => p.value).join(', '),
      facility.phone_numbers.map((p) => p.comment || '').join(', '),
      facility.emails.map((e) => e.value).join(', '),
      facility.emails.map((e) => e.comment || '').join(', '),
      facility.fax || '',
      facility.remarks || '',
    ];
    facility.functions.forEach((f) => {
      targets.push(f.function.name);
      targets.push(f.selected_values.join(', '));
      if (f.remarks) targets.push(f.remarks);
    });
    return matchesKeywords(targets.join(' '), searchKeywords, searchMode);
  });

  // ソート
  const sortedFacilities = [...filteredFacilities].sort((a, b) => {
    if (sortOrder === 'none') {
      return (
        facilityOrder.indexOf(a.id) - facilityOrder.indexOf(b.id)
      );
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

  const displayFacilities = sortedFacilities.filter(
    (f) => visibleFacilities[f.id] !== false,
  );

  // モーダル内の検索フィルタ
  const modalKeywords = modalSearchText
    .trim()
    .split(/[\s\u3000]+/)
    .filter((v) => v)
    .map((v) => v.toLowerCase());
  const filteredColumns = columns.filter((col) =>
    matchesKeywords(col.label, modalKeywords, modalSearchMode)
  );

  const facilityModalKeywords = facilityModalSearchText
    .trim()
    .split(/[\s\u3000]+/)
    .filter((v) => v)
    .map((v) => v.toLowerCase());
  const filteredFacilitiesModal = facilities
    .slice()
    .sort((a, b) => facilityOrder.indexOf(a.id) - facilityOrder.indexOf(b.id))
    .filter((f) =>
      matchesKeywords(
        `${f.id} ${f.short_name} ${f.official_name || ''}`,
        facilityModalKeywords,
        facilityModalSearchMode,
      ),
    );

  return (
    <div className="bg-gray-100 h-screen p-0 overflow-hidden flex flex-col">
      {notification && (
        <div className="bg-red-500 text-white px-4 py-2 text-sm text-center">
          {notification}
        </div>
      )}
      <div className="flex items-center mb-2 p-2 bg-gray-100 flex-none sticky top-0 z-30">
        <h1 className="text-2xl font-bold">医療機関機能一覧</h1>
        <div className="relative ml-4" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-3 py-2 bg-gray-200 rounded"
          >
            &#9776;
          </button>
          {isMenuOpen && (
            <div className="absolute mt-2 bg-white border rounded shadow flex flex-col space-y-2 w-max z-20">
              <button
                onClick={() => {
                  setIsColumnModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="px-4 py-2 hover:bg-gray-100 text-left"
              >
                表示項目変更
              </button>
              <button
                onClick={() => {
                  setIsFacilityVisibilityModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="px-4 py-2 hover:bg-gray-100 text-left"
              >
                表示医療機関変更
              </button>
              <button
                className="px-4 py-2 hover:bg-gray-100 text-left"
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
                  setIsMenuOpen(false);
                }}
              >
                新規医療機関追加
              </button>
              <button
                className="px-4 py-2 hover:bg-gray-100 text-left"
                onClick={() => {
                  setIsFunctionMasterListOpen(true);
                  setIsMenuOpen(false);
                }}
              >
                機能マスタ保守
              </button>
              <button
                className="px-4 py-2 hover:bg-gray-100 text-left"
                onClick={() => {
                  setIsCategoryMasterListOpen(true);
                  setIsMenuOpen(false);
                }}
              >
                カテゴリマスタ保守
              </button>
              <button
                className="px-4 py-2 hover:bg-gray-100 text-left"
                onClick={() => {
                  handleExportCsv();
                  setIsMenuOpen(false);
                }}
              >
                CSV出力
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 pt-2 pb-4 flex flex-col">
      {/* 検索 */}
      <div className="mb-2 flex items-center gap-2">
        <ImeInput
          type="text"
          placeholder="キーワードで検索"
          className="border p-2 w-64"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            value="AND"
            checked={searchMode === 'AND'}
            onChange={() => setSearchMode('AND')}
          />
          <span>AND</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            value="OR"
            checked={searchMode === 'OR'}
            onChange={() => setSearchMode('OR')}
          />
          <span>OR</span>
        </label>
        <label className="flex items-center space-x-2">
          <Switch
            checked={showFunctionRemarks}
            onChange={setShowFunctionRemarks}
            className={`${
              showFunctionRemarks ? 'bg-blue-500' : 'bg-gray-300'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span
              className={`${
                showFunctionRemarks ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
          <span>備考表示</span>
        </label>
      </div>

        {/* テーブル */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="min-w-max border-collapse border border-gray-300">
          <thead className="sticky top-0 z-10 bg-gray-200">
            <tr>
              {columnGroups.map((g) => {
                if (!visibleGroups[g.id]) return null;
                const colsInGroup = columns.filter(
                  (c) =>
                    c.group === g.id &&
                    visibleColumns[c.key] &&
                    !tempHiddenColumns[c.key],
                );
                if (colsInGroup.length === 0) return null;
                const span = collapsedGroups[g.id] ? 1 : colsInGroup.length;
                return (
                  <th
                    key={g.id}
                    colSpan={span}
                    className="border px-2 cursor-pointer"
                    onClick={() => toggleCollapse(g.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{g.label}</span>
                      <button
                        onClick={() => toggleCollapse(g.id)}
                        className="ml-2 text-xl font-bold"
                      >
                        {collapsedGroups[g.id] ? '+' : '-'}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr className="text-left">
              {columnGroups.map((g) => {
                if (!visibleGroups[g.id]) return null;
                const colsInGroup = columns.filter(
                  (c) =>
                    c.group === g.id &&
                    visibleColumns[c.key] &&
                    !tempHiddenColumns[c.key],
                );
                if (colsInGroup.length === 0) return null;
                if (collapsedGroups[g.id]) {
                  return (
                    <th key={`${g.id}-collapsed`} className="py-2 px-4 border whitespace-nowrap"></th>
                  );
                }
                return colsInGroup.map((col) => {
                  const isFunc = col.key.startsWith('func_');
                  const memo = isFunc
                    ?
                        allFunctions.find(
                          (f) => f.id === parseInt(col.key.replace('func_', ''))
                        )?.memo || ''
                    : '';
                  return (
                    <th
                      key={col.key}
                      className={
                        'py-2 px-4 border cursor-pointer whitespace-nowrap' +
                        (isFunc && memo ? ' tooltip-container' : '')
                      }
                      onClick={() => handleSort(col.key)}
                      onContextMenu={(e) => handleHeaderContextMenu(e, col.key)}
                      data-tooltip={isFunc && memo ? memo : undefined}
                    >
                      {col.label}{' '}
                      {sortKey === col.key && sortOrder !== 'none' &&
                        (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                  );
                });
              })}
            </tr>
          </thead>
          <tbody>
            {displayFacilities.map((facility) => (
              <tr key={facility.id} className="hover:bg-gray-50">
                {columnGroups.map((g) => {
                  if (!visibleGroups[g.id]) return null;
                  const colsInGroup = columns.filter(
                    (c) =>
                      c.group === g.id &&
                      visibleColumns[c.key] &&
                      !tempHiddenColumns[c.key],
                  );
                  if (colsInGroup.length === 0) return null;
                  if (collapsedGroups[g.id]) {
                    return (
                      <td
                        key={`${facility.id}-${g.id}`}
                        className="py-2 px-4 border"
                      ></td>
                    );
                  }
                  return colsInGroup.map((col) => {
                    if (col.key.startsWith('func_')) {
                      const funcId = parseInt(col.key.replace('func_', ''));
                      const fEntry = facility.functions.find(
                        (f) => f.function.id === funcId
                      );
                      const remarks = fEntry?.remarks || '';
                      return (
                        <td
                          key={col.key}
                          className={
                            'py-2 px-4 border whitespace-nowrap' +
                            (remarks ? ' tooltip-container' : '')
                          }
                          data-tooltip={remarks || undefined}
                          onContextMenu={(e) =>
                            handleRightClick(e, facility.id, funcId)
                          }
                        >
                          {fEntry ? (
                            <div className="flex flex-col">
                              {fEntry.selected_values.map((v, i) => (
                                <div key={i}>{v}</div>
                              ))}
                              {showFunctionRemarks && fEntry.remarks && (
                                (() => {
                                  const lines = fEntry.remarks.split('\n');
                                  const display = lines.slice(0, 2);
                                  const truncated = lines.length > 2;
                                  return (
                                    <>
                                      {display.map((l, i) => (
                                        <div key={i}>{l}</div>
                                      ))}
                                      {truncated && <div>...</div>}
                                    </>
                                  );
                                })()
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
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
                          {Array.isArray(val) ? (
                            <div className="flex flex-col">
                              {(val as ContactInfo[])
                                .map((v) =>
                                  v.value ? `${v.value}${v.comment ? `（${v.comment}）` : ''}` : ''
                                )
                                .filter((v) => v)
                                .map((v, i) => (
                                  <div key={i}>{v}</div>
                                ))}
                            </div>
                          ) : col.key === 'remarks' && typeof val === 'string' ? (
                            (() => {
                              const lines = val.split('\n');
                              const display = lines.slice(0, 3);
                              const truncated = lines.length > 3;
                              return (
                                <div
                                  className="flex flex-col tooltip-container"
                                  data-tooltip={val}
                                >
                                  {display.map((l, i) => (
                                    <div key={i}>{l}</div>
                                  ))}
                                  {truncated && <div>...</div>}
                                </div>
                              );
                            })()
                          ) : (
                            (val as React.ReactNode) || '-'
                          )}
                        </td>
                      ) as React.ReactNode;
                    }
                  });
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {headerContextMenu && (
        <div
          className="context-menu"
          style={{ top: headerContextMenu.y, left: headerContextMenu.x }}
        >
          <button
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              handleHideColumn(headerContextMenu.key);
              setHeaderContextMenu(null);
            }}
          >
            非表示
          </button>
        </div>
      )}

      {rowContextMenu && (
        <div
          className="context-menu"
          style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
        >
          <button
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              setEditingFacility(normalizeFacility(rowContextMenu.facility));
              setIsFacilityModalOpen(true);
              setRowContextMenu(null);
            }}
          >
            医療機関情報編集
          </button>
          <button
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              handleHideFacility(rowContextMenu.facility.id);
              setRowContextMenu(null);
            }}
          >
            非表示
          </button>
        </div>
      )}


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
                  <div className="mb-2 space-y-2">
                    <ImeInput
                      type="text"
                      placeholder="検索"
                      value={modalSearchText}
                      onChange={(e) => setModalSearchText(e.target.value)}
                      className="border p-2 w-full"
                    />
                    <div className="flex gap-2">
                      <label className="flex items-center space-x-1">
                        <input
                          type="radio"
                          value="AND"
                          checked={modalSearchMode === 'AND'}
                          onChange={() => setModalSearchMode('AND')}
                        />
                        <span>AND</span>
                      </label>
                      <label className="flex items-center space-x-1">
                        <input
                          type="radio"
                          value="OR"
                          checked={modalSearchMode === 'OR'}
                          onChange={() => setModalSearchMode('OR')}
                        />
                        <span>OR</span>
                      </label>
                    </div>
                  </div>

                  {/* トグルリスト */}
                  <div className="max-h-60 overflow-y-auto">
                    {columnGroups.map((g) => {
                      const cols = filteredColumns.filter((c) => c.group === g.id);
                      if (cols.length === 0) return null;
                      return (
                        <div key={g.id} className="mb-2">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-bold">{g.label}</span>
                            <Switch
                              checked={visibleGroups[g.id]}
                              onChange={() => toggleGroup(g.id)}
                              className={`${
                                visibleGroups[g.id] ? 'bg-blue-500' : 'bg-gray-300'
                              } relative inline-flex h-6 w-11 items-center rounded-full`}
                            >
                              <span
                                className={`${
                                  visibleGroups[g.id] ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                              />
                            </Switch>
                          </div>
                          <div className="ml-4">
                            {cols.map((col) => (
                              <div key={col.key} className="flex justify-between items-center py-2">
                                <span>{col.label}</span>
                                <Switch
                                  checked={visibleColumns[col.key]}
                                  onChange={() => toggleColumn(col.key, col.group)}
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
                        </div>
                      );
                    })}
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

      <Transition appear show={isFacilityVisibilityModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsFacilityVisibilityModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <Dialog.Title as="h3" className="text-lg font-medium mb-4">
                表示医療機関を選択
              </Dialog.Title>
              <div className="mb-2 space-y-2">
                <ImeInput
                  type="text"
                  placeholder="検索"
                  value={facilityModalSearchText}
                  onChange={(e) => setFacilityModalSearchText(e.target.value)}
                  className="border p-2 w-full"
                />
                <div className="flex gap-2">
                  <label className="flex items-center space-x-1">
                    <input
                      type="radio"
                      value="AND"
                      checked={facilityModalSearchMode === 'AND'}
                      onChange={() => setFacilityModalSearchMode('AND')}
                    />
                    <span>AND</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="radio"
                      value="OR"
                      checked={facilityModalSearchMode === 'OR'}
                      onChange={() => setFacilityModalSearchMode('OR')}
                    />
                    <span>OR</span>
                  </label>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredFacilitiesModal.map((f) => (
                  <div
                    key={f.id}
                    className="flex justify-between items-center py-2"
                    draggable
                    onDragStart={() =>
                      setDragFacilityIndex(facilityOrder.indexOf(f.id))
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragFacilityIndex === null) return;
                      const target = facilityOrder.indexOf(f.id);
                      const newOrder = [...facilityOrder];
                      const [m] = newOrder.splice(dragFacilityIndex, 1);
                      newOrder.splice(target, 0, m);
                      setFacilityOrder(newOrder);
                      setCookie('facilityOrder', newOrder.join(','));
                      setDragFacilityIndex(null);
                    }}
                  >
                    <span>{f.short_name}</span>
                    <Switch
                      checked={visibleFacilities[f.id] !== false}
                      onChange={() =>
                        setVisibleFacilities((prev) => ({
                          ...prev,
                          [f.id]: !(prev[f.id] !== false),
                        }))
                      }
                      className={`${
                        visibleFacilities[f.id] !== false ? 'bg-blue-500' : 'bg-gray-300'
                      } relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                      <span
                        className={`${
                          visibleFacilities[f.id] !== false ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                      />
                    </Switch>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setIsFacilityVisibilityModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  閉じる
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* カテゴリマスタ一覧モーダル */}
      <Transition appear show={isCategoryMasterListOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsCategoryMasterListOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">カテゴリマスタ保守</h3>
                <button
                  className="px-2 py-1 bg-green-500 text-white rounded"
                  onClick={openNewCategoryModal}
                >
                  新規作成
                </button>
              </div>
              <div className="mb-2 space-y-2">
                <ImeInput
                  type="text"
                  placeholder="検索"
                  value={categoryListSearchText}
                  onChange={(e) => setCategoryListSearchText(e.target.value)}
                  className="border p-1 w-full"
                />
                <div className="flex gap-2">
                  <label className="flex items-center space-x-1">
                    <input
                      type="radio"
                      value="AND"
                      checked={categoryListSearchMode === 'AND'}
                      onChange={() => setCategoryListSearchMode('AND')}
                    />
                    <span>AND</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="radio"
                      value="OR"
                      checked={categoryListSearchMode === 'OR'}
                      onChange={() => setCategoryListSearchMode('OR')}
                    />
                    <span>OR</span>
                  </label>
                </div>
                <label className="flex items-center space-x-2">
                  <Switch
                    checked={showDeletedCategories}
                    onChange={setShowDeletedCategories}
                    className={`${
                      showDeletedCategories ? 'bg-blue-500' : 'bg-gray-300'
                    } relative inline-flex h-6 w-11 items-center rounded-full`}
                  >
                    <span
                      className={`${
                        showDeletedCategories ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                    />
                  </Switch>
                  <span>削除済みを表示</span>
                </label>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="min-w-max border-collapse border border-gray-300 mb-4 w-full">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="px-2 py-1 border">ID</th>
                      <th className="px-2 py-1 border">名称</th>
                      <th className="px-2 py-1 border">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryMasterOrder
                      .map((id) => allCategories.find((c) => c.id === id))
                      .filter((c): c is FunctionCategory => !!c)
                      .filter((c) => showDeletedCategories || !c.is_deleted)
                      .filter((c) => {
                        const keywords = categoryListSearchText
                          .trim()
                          .split(/[\s\u3000]+/)
                          .filter((v) => v)
                          .map((v) => v.toLowerCase());
                        return matchesKeywords(
                          `${c.id}${c.name}${c.description || ''}`,
                          keywords,
                          categoryListSearchMode
                        );
                      })
                      .map((cat, idx) => (
                        <tr
                          key={cat.id}
                          className="hover:bg-gray-50"
                          draggable
                          onDragStart={() => setDragCategoryIndex(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragCategoryIndex === null) return;
                            const newOrder = [...categoryMasterOrder];
                            const [m] = newOrder.splice(dragCategoryIndex, 1);
                            newOrder.splice(idx, 0, m);
                            setCategoryMasterOrder(newOrder);
                            setCookie('categoryMasterOrder', newOrder.join(','));
                            setDragCategoryIndex(null);
                          }}
                        >
                          <td className="border px-2">{cat.id}</td>
                          <td className="border px-2">{cat.name}</td>
                          <td className="border px-2">
                            <button
                              className="px-2 py-1 bg-blue-500 text-white rounded mr-2"
                              onClick={() => openEditCategoryModal(cat)}
                            >
                              編集
                            </button>
                            <button
                              className={`px-2 py-1 bg-red-500 text-white rounded mr-2 ${cat.is_deleted ? 'invisible' : ''}`}
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              削除
                            </button>
                            <button
                              className={`px-2 py-1 bg-green-500 text-white rounded ${cat.is_deleted ? '' : 'invisible'}`}
                              onClick={() => handleRestoreCategory(cat.id)}
                            >
                              復元
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                  onClick={() => setIsCategoryMasterListOpen(false)}
                >
                  閉じる
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* カテゴリマスタ追加/編集モーダル */}
      <Transition appear show={isCategoryMasterModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsCategoryMasterModalOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded p-6 shadow">
              <h3 className="text-lg font-bold mb-4">
                {editingCategory ? 'カテゴリ編集' : '新規カテゴリ追加'}
              </h3>
              <ImeInput
                type="text"
                placeholder="カテゴリ名"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="border p-2 w-full mb-4"
              />
              <ImeTextarea
                placeholder="説明"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                rows={3}
                className="border p-2 w-full mb-4"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setIsCategoryMasterModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded mr-2"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  保存
                </button>
              </div>
            </Dialog.Panel>
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
                  <ImeInput
                    type="text"
                    placeholder="略名"
                    value={editingFacility.short_name}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, short_name: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <ImeInput
                    type="text"
                    placeholder="正式名称"
                    value={editingFacility.official_name || ''}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, official_name: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <ImeInput
                    type="text"
                    placeholder="都道府県"
                    value={editingFacility.prefecture || ''}
                    onChange={(e) =>
                      setEditingFacility({ ...editingFacility, prefecture: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <ImeInput
                    type="text"
                    placeholder="市町村"
                    value={editingFacility.city || ''}
                    onChange={(e) => setEditingFacility({ ...editingFacility, city: e.target.value })}
                    className="border p-2 w-full"
                  />
                  <ImeInput
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
                        <ImeInput
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
                        <ImeInput
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
                  <ImeTextarea
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
                    {editingFacility?.id !== 0 && (
                      <button
                        onClick={handleDeleteFacility}
                        className="px-4 py-2 bg-red-500 text-white rounded mr-2"
                      >
                        削除
                      </button>
                    )}
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
                  <ImeTextarea
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

      {/* 機能マスタ一覧モーダル */}
      <Transition appear show={isFunctionMasterListOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsFunctionMasterListOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-2xl bg-white rounded p-6 shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">機能マスタ保守</h3>
                <button
                  className="px-2 py-1 bg-green-500 text-white rounded"
                  onClick={openNewFunctionMasterModal}
                >
                  新規作成
                </button>
              </div>
              <div className="flex items-center mb-2 gap-2">
                <ImeInput
                  type="text"
                  placeholder="検索"
                  value={functionListSearchText}
                  onChange={(e) => setFunctionListSearchText(e.target.value)}
                  className="border p-1 flex-grow"
                />
                <label className="flex items-center space-x-1">
                  <input
                    type="radio"
                    value="AND"
                    checked={functionListSearchMode === 'AND'}
                    onChange={() => setFunctionListSearchMode('AND')}
                  />
                  <span>AND</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="radio"
                    value="OR"
                    checked={functionListSearchMode === 'OR'}
                    onChange={() => setFunctionListSearchMode('OR')}
                  />
                  <span>OR</span>
                </label>
                <select
                  className="border p-1"
                  value={functionCategoryFilter}
                  onChange={(e) =>
                    setFunctionCategoryFilter(
                      e.target.value ? parseInt(e.target.value) : ''
                    )
                  }
                >
                  <option value="">全て</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center space-x-2">
                  <Switch
                    checked={showDeletedFunctions}
                    onChange={setShowDeletedFunctions}
                    className={`${
                      showDeletedFunctions ? 'bg-blue-500' : 'bg-gray-300'
                    } relative inline-flex h-6 w-11 items-center rounded-full`}
                  >
                    <span
                      className={`${
                        showDeletedFunctions ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                    />
                  </Switch>
                  <span>削除済みを表示</span>
                </label>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="min-w-max border-collapse border border-gray-300 mb-4 w-full">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="px-2 py-1 border">ID</th>
                      <th className="px-2 py-1 border">カテゴリ</th>
                      <th className="px-2 py-1 border">名称</th>
                      <th className="px-2 py-1 border">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {functionOrder
                      .map((id: number) => allFunctions.find((f) => f.id === id))
                      .filter((f): f is FunctionMaster => !!f)
                      .filter((f) => showDeletedFunctions || !f.is_deleted)
                      .filter((f) => {
                        const keywords = functionListSearchText
                          .trim()
                          .split(/[\s\u3000]+/)
                          .filter((v) => v)
                          .map((v) => v.toLowerCase());
                        return matchesKeywords(
                          `${f.id}${f.name}${f.memo || ''}`,
                          keywords,
                          functionListSearchMode
                        );
                      })
                      .filter(
                        (f) =>
                          functionCategoryFilter === '' ||
                          f.category_id === functionCategoryFilter
                      )
                      .map((func) => (
                        <tr
                          key={func.id}
                          className="hover:bg-gray-50"
                          draggable
                          onDragStart={() => {
                            setDragFunctionId(func.id);
                            setDragCategoryForFuncList(null);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragFunctionId === null || dragFunctionId === func.id)
                              return;
                            const fromFunc = allFunctions.find((f) => f.id === dragFunctionId);
                            if (!fromFunc || fromFunc.category_id !== func.category_id) return;
                            const fromIdx = functionOrder.indexOf(dragFunctionId);
                            const toIdx = functionOrder.indexOf(func.id);
                            if (fromIdx === -1 || toIdx === -1) return;
                            const newOrder = [...functionOrder];
                            newOrder.splice(fromIdx, 1);
                            newOrder.splice(toIdx, 0, dragFunctionId);
                            setFunctionOrder(newOrder);
                            setCookie('functionOrder', newOrder.join(','));
                            setDragFunctionId(null);
                          }}
                        >
                          <td className="border px-2">{func.id}</td>
                          <td
                            className="border px-2 cursor-move bg-gray-50"
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              if (func.category_id != null) {
                                setDragCategoryForFuncList(func.category_id);
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (
                                dragCategoryForFuncList === null ||
                                func.category_id === null ||
                                dragCategoryForFuncList === func.category_id
                              )
                                return;
                              const fromIdx = categoryOrder.indexOf(dragCategoryForFuncList);
                              const toIdx = categoryOrder.indexOf(func.category_id!);
                              if (fromIdx === -1 || toIdx === -1) return;
                              const newOrder = [...categoryOrder];
                              const [m] = newOrder.splice(fromIdx, 1);
                              newOrder.splice(toIdx, 0, m);
                              setCategoryOrder(newOrder);
                              setCookie('functionCategoryOrder', newOrder.join(','));

                              const sorted = [
                                ...newOrder.flatMap((cid) =>
                                  functionOrder
                                    .map((id) => allFunctions.find((f) => f.id === id))
                                    .filter(
                                      (f): f is FunctionMaster => !!f && f.category_id === cid,
                                    )
                                    .map((f) => f.id),
                                ),
                                ...functionOrder.filter((id) => {
                                  const f = allFunctions.find((fn) => fn.id === id);
                                  return !f || f.category_id === null;
                                }),
                              ];
                              setFunctionOrder(sorted);
                              setCookie('functionOrder', sorted.join(','));
                              setDragCategoryForFuncList(null);
                            }}
                          >
                            {allCategories.find((c) => c.id === func.category_id)?.name ||
                              '未選択'}
                          </td>
                          <td className="border px-2">{func.name}</td>
                          <td className="border px-2">
                            <button
                              className="px-2 py-1 bg-blue-500 text-white rounded mr-2"
                              onClick={() => openEditFunctionMasterModal(func)}
                            >
                              編集
                            </button>
                            <button
                              className={`px-2 py-1 bg-red-500 text-white rounded mr-2 ${func.is_deleted ? 'invisible' : ''}`}
                              onClick={() => handleDeleteFunctionMaster(func.id)}
                            >
                              削除
                            </button>
                            <button
                              className={`px-2 py-1 bg-green-500 text-white rounded ${func.is_deleted ? '' : 'invisible'}`}
                              onClick={() => handleRestoreFunctionMaster(func.id)}
                            >
                              復元
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                  onClick={() => setIsFunctionMasterListOpen(false)}
                >
                  閉じる
                </button>
              </div>
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
              <ImeInput
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
              <ImeTextarea
                placeholder="選択肢を改行で入力"
                value={newChoices}
                onChange={(e) => setNewChoices(e.target.value)}
                rows={5}
                className="border p-2 w-full mb-4"
              />

              {/* カテゴリ選択 */}
              <div className="mb-4">
                <label className="mr-2">カテゴリ:</label>
                <select
                  className="border p-2"
                  value={newFunctionCategoryId ?? ''}
                  onChange={(e) =>
                    setNewFunctionCategoryId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                >
                  <option value="">未選択</option>
                  {categoryOrder
                    .map((id) => allCategories.find((c) => c.id === id))
                    .filter((c): c is FunctionCategory => !!c && !c.is_deleted)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* メモ */}
              <ImeTextarea
                placeholder="メモ"
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                rows={3}
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
