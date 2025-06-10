import { useEffect, useState } from 'react';

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

function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allFunctions, setAllFunctions] = useState<FunctionMaster[]>([]);

  useEffect(() => {
    fetch('http://192.168.174.29:8001/facilities')
      .then(res => res.json())
      .then(data => setFacilities(data))
      .catch(err => console.error('施設情報取得エラー:', err));
  }, []);

  useEffect(() => {
    fetch('http://192.168.174.29:8001/functions')
      .then(res => res.json())
      .then(data => setAllFunctions(data))
      .catch(err => console.error('機能マスタ取得エラー:', err));
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">医療機関一覧（機能横並び表示）</h1>
      <div className="overflow-x-auto relative">
        <table className="min-w-max border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th
                className="py-2 px-4 border border-gray-300 sticky left-0 z-10 bg-gray-200"
                style={{ width: '50px' }} // ID列の幅手動設定
              >
                ID
              </th>
              <th
                className="py-2 px-4 border border-gray-300 sticky left-[50px] z-10 bg-gray-200"
                style={{ width: '150px' }} // 略名列の幅手動設定
              >
                略名
              </th>
              <th className="py-2 px-4 border border-gray-300 bg-gray-200">正式名称</th>
              <th className="py-2 px-4 border border-gray-300 bg-gray-200">所在地</th>
              <th className="py-2 px-4 border border-gray-300 bg-gray-200">電話番号</th>
              <th className="py-2 px-4 border border-gray-300 bg-gray-200">FAX</th>
              {allFunctions.map(func => (
                <th key={func.id} className="py-2 px-4 border border-gray-300 bg-gray-200 whitespace-nowrap">
                  {func.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilities.map(facility => (
              <tr key={facility.id} className="hover:bg-gray-50">
                <td
                  className="py-2 px-4 border border-gray-300 sticky left-0 z-10 bg-white"
                  style={{ width: '50px' }}
                >
                  {facility.id}
                </td>
                <td
                  className="py-2 px-4 border border-gray-300 sticky left-[50px] z-10 bg-white"
                  style={{ width: '150px' }}
                >
                  {facility.short_name}
                </td>
                <td className="py-2 px-4 border border-gray-300 bg-white">{facility.official_name || '-'}</td>
                <td className="py-2 px-4 border border-gray-300 bg-white">
                  {facility.prefecture} {facility.city} {facility.address_detail}
                </td>
                <td className="py-2 px-4 border border-gray-300 bg-white">{facility.phone_numbers.join(', ')}</td>
                <td className="py-2 px-4 border border-gray-300 bg-white">{facility.fax || '-'}</td>
                {allFunctions.map(func => {
                  const foundFunc = facility.functions.find(f => f.function.id === func.id);
                  return (
                    <td key={func.id} className="py-2 px-4 border border-gray-300 bg-white">
                      {foundFunc
                        ? `${foundFunc.selected_values.join(', ')}（${foundFunc.remarks || '備考なし'}）`
                        : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
