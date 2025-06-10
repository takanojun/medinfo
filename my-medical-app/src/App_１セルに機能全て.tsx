import { useEffect, useState } from 'react';

interface FacilityFunctionEntry {
  id: number;
  selected_values: string[];
  remarks: string;
  function: {
    id: number;
    name: string;
    description?: string;
    selection_type: string;
    choices: string[];
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

function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    fetch('http://192.168.174.29:8001/facilities')
      .then(res => res.json())
      .then(data => setFacilities(data))
      .catch(err => console.error('APIエラー:', err));
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">医療機関一覧</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="py-2 px-4 border-b">ID</th>
              <th className="py-2 px-4 border-b">略名</th>
              <th className="py-2 px-4 border-b">正式名称</th>
              <th className="py-2 px-4 border-b">所在地</th>
              <th className="py-2 px-4 border-b">電話番号</th>
              <th className="py-2 px-4 border-b">FAX</th>
              <th className="py-2 px-4 border-b">機能情報</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map(facility => (
              <tr key={facility.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{facility.id}</td>
                <td className="py-2 px-4 border-b">{facility.short_name}</td>
                <td className="py-2 px-4 border-b">{facility.official_name || '-'}</td>
                <td className="py-2 px-4 border-b">
                  {facility.prefecture} {facility.city} {facility.address_detail}
                </td>
                <td className="py-2 px-4 border-b">{facility.phone_numbers.join(', ')}</td>
                <td className="py-2 px-4 border-b">{facility.fax || '-'}</td>
                <td className="py-2 px-4 border-b">
                  {facility.functions.length > 0 ? (
                    <ul className="list-disc pl-4">
                      {facility.functions.map(func => (
                        <li key={func.id}>
                          <span className="font-semibold">{func.function.name}</span>:
                          {func.selected_values.join(', ')}（{func.remarks || '備考なし'}）
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
