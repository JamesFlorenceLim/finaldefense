// pages/assignment-history.tsx
"use client"
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AssignmentHistory {
  id: number;
  assignment_id: number;
  event: string;
  timestamp: string;
  terminal: string;
  temporary_driver_id: number | null;
  Assignment: {
    id: number;
    van_driver_operator_id: number;
    schedule_id: number;
    assigned_at: string;
    status: string;
    queued_at: string | null;
    terminal: string;
    order: number;
    queue_order: number | null;
    arrivalTime: string | null;
    departureTime: string | null;
    temporary_driver_id: number | null;
    Schedule: {
      id: number;
      date: string;
      startTime: string;
      endTime: string;
    };
    VanDriverOperator: {
      id: number;
      van_id: number;
      driver_id: number | null;
      operator_id: number;
      Driver: {
        id: number;
        firstname: string;
        lastname: string;
      } | null;
      Operator: {
        id: number;
        firstname: string;
        lastname: string;
      };
      Van: {
        id: number;
        plate_number: string;
      };
    };
    Driver: {
      id: number;
      firstname: string;
      lastname: string;
    } | null;
    AssignmentHistory: AssignmentHistory[];
    Queue: {
      id: number;
      assignment_id: number;
      status: string;
      current_terminal: number | null;
      queued_at: string | null;
    }[];
  };
  Driver: {
    id: number;
    firstname: string;
    lastname: string;
  } | null;
}

export default function AssignmentHistoryPage() {
  const [data, setData] = useState<AssignmentHistory[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetch('/api/troubleshoot')
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  const handleDriverChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDriverId(event.target.value ? parseInt(event.target.value) : null);
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  const uniqueDrivers = Array.from(new Set(data.flatMap(history => [
    history.Driver,
    history.Assignment.VanDriverOperator.Driver
  ].filter(driver => driver !== null))));

  const uniqueDriverNames = new Set<string>();
  const filteredUniqueDrivers = uniqueDrivers.filter(driver => {
    const driverName = `${driver!.firstname} ${driver!.lastname}`;
    if (uniqueDriverNames.has(driverName)) {
      return false;
    } else {
      uniqueDriverNames.add(driverName);
      return true;
    }
  });

  const filteredData = data.filter(history => {
    const driverIdMatches = selectedDriverId === null || history.Driver?.id === selectedDriverId;
    const vanDriverIdMatches = selectedDriverId === null || history.Assignment.VanDriverOperator.Driver?.id === selectedDriverId;
    const dateMatches = (!startDate || new Date(history.timestamp) >= new Date(startDate)) &&
                        (!endDate || new Date(history.timestamp) <= new Date(endDate));
  
    return (
      (driverIdMatches || vanDriverIdMatches) &&
      (history.Driver === null || driverIdMatches) &&
      (history.event === 'departed' || history.event === 'arrived') &&
      dateMatches
    );
  });

  const generatePDF = async () => {
    const pdf = new jsPDF();
    
    // Add logo
    const logo = new Image();
    logo.src = '/logo.png'; // Ensure this path is correct
    await new Promise((resolve) => {
        logo.onload = resolve;
    });
    pdf.addImage(logo, 'PNG', 10, 10, 20, 20);

    // Add company name
    pdf.setFontSize(18);
    pdf.text('Markadz TransCo.', 70, 20);

    pdf.setFontSize(14);
    pdf.text('34 Pres. Sergio Osmena Avenue', 60, 25);
    pdf.text('Assignment History Report', 70, 30);

    // Add selected driver's name and plate number
    pdf.setFontSize(10);
    pdf.text(`Start Date: ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 10, 40);
    pdf.text(`End Date: ${new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 10, 45);
    if (selectedDriverId !== null) {
      const selectedDriver = uniqueDrivers.find(driver => driver!.id === selectedDriverId);
      if (selectedDriver) {
        pdf.text(`Driver: ${selectedDriver!.firstname} ${selectedDriver!.lastname}`, 10, 50);
      }
    }

    // Add table
    const tableColumn = ["Date", "Departed", "Arrived", "Terminal", "Van Plate Number"];
    const tableRows: any[] = [];

    filteredData.forEach((history, index, array) => {
      if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
        const isTemporary = history.Assignment.VanDriverOperator.Driver?.id !== selectedDriverId;
        const historyData = [
          new Date(history.timestamp).toLocaleDateString(),
          new Date(history.timestamp).toLocaleTimeString(),
          new Date(array[index + 1].timestamp).toLocaleTimeString(),
          history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal,
          history.Assignment.VanDriverOperator.Van.plate_number + (isTemporary ? ' (temporary)' : '')
        ];
        tableRows.push(historyData);
      }
    });

    (pdf as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: 'grid'
    });

    const currentDate = new Date().toISOString().split('T')[0];
    pdf.save(`assignment_history_report_${currentDate}.pdf`);
  };

  return (
    <div className="p-6 ml-96">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Assignment History</h1>
      
      <div className="flex space-x-8 mb-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Driver</h2>
          <select
            className="p-2 border rounded uppercase"
            onChange={handleDriverChange}
          >
            <option value="">All Drivers</option>
            {filteredUniqueDrivers.map(driver => (
              <option key={driver!.id} value={driver!.id}>
                {driver!.firstname} {driver!.lastname}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Date Range</h2>
          <div className="flex space-x-4">
            <input
              type="date"
              className="p-2 border rounded"
              value={startDate}
              onChange={handleStartDateChange}
            />
            <input
              type="date"
              className="p-2 border rounded"
              value={endDate}
              onChange={handleEndDateChange}
            />
          </div>
        </section>
      </div>

      <section id="report-content" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Trip History</h2>
        
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Departed</th>
              <th className="py-2 px-4 border-b">Arrived</th>
              <th className="py-2 px-4 border-b">Terminal</th>
              <th className="py-2 px-4 border-b">Van Plate Number</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((history, index, array) => {
              if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
                const isTemporary = history.Assignment.VanDriverOperator.Driver?.id !== selectedDriverId;
                return (
                  <tr key={history.id}>
                    <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 px-4 border-b">{new Date(array[index + 1].timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 px-4 border-b">
                      {history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal}
                    </td>
                    <td className="py-2 px-4 border-b">{history.Assignment.VanDriverOperator.Van.plate_number}{isTemporary ? ' (temporary)' : ''}</td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </table>
      </section>

      <button
        onClick={generatePDF}
        className="mt-4 p-2 bg-blue-500 text-white rounded"
      >
        Generate PDF
      </button>
    </div>
  );
}