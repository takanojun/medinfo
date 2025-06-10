import { useEffect, useState } from 'react';

interface Facility {
  id: number;
  short_name: string;
  official_name: string;
  prefecture: string;
  city: string;
  address_detail: string;
  phone_numbers: string[];
  fax: string;
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
      <div className="grid gap-4">
        {facilities.map(facility => (
          <div key={facility.id} className="bg-white shadow rounded p-4">
            <h2 className="text-xl font-bold mb-2">{facility.short_name}</h2>
            <p>所在地: <span className="font-semibold">{facility.prefecture} {facility.city} {facility.address_detail}</span></p>
            <p>電話番号: <span className="font-semibold">{facility.phone_numbers.join(', ')}</span></p>
            <p>FAX: <span className="font-semibold">{facility.fax}</span></p>
            <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">詳細</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
