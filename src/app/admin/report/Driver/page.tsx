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
    pdf.text('Driver Report', 70, 30);
  
    // Add selected driver's name and plate number
    pdf.setFontSize(10);
    pdf.text(`Start Date: ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 10, 40);
    pdf.text(`End Date: ${new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 10, 45);
    if (selectedDriverId !== null) {
      const selectedDriver = uniqueDrivers.find(driver => driver!.id === selectedDriverId);
      if (selectedDriver) {
        pdf.text(`Driver: ${selectedDriver!.firstname} ${selectedDriver!.lastname}`, 10, 50);
        const vanPlateNumber = filteredData.find(history => history.Assignment.VanDriverOperator.Driver?.id === selectedDriverId)?.Assignment.VanDriverOperator.Van.plate_number;
        if (vanPlateNumber) {
          pdf.text(`Van Plate Number: ${vanPlateNumber}`, 10, 55);
        }
      }
    }
  
    // Add table
    const tableColumn = ["Date", "Temporary Plate Number", "Departed Time", "Arrived Time", "To"];
    const tableRows: any[] = [];
  
    filteredData.forEach((history, index, array) => {
      if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
        const isTemporary = history.Assignment.VanDriverOperator.Driver?.id !== selectedDriverId;
        const historyData = [
          new Date(history.timestamp).toLocaleDateString(),
          isTemporary ? history.Assignment.VanDriverOperator.Van.plate_number : '',
          new Date(history.timestamp).toLocaleTimeString(),
          new Date(array[index + 1].timestamp).toLocaleTimeString(),
          history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal
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
    if (selectedDriverId !== null) {
      const selectedDriver = uniqueDrivers.find(driver => driver!.id === selectedDriverId);
      if (selectedDriver) {
      pdf.save(`history_report_${selectedDriver!.firstname}_${selectedDriver!.lastname}_${currentDate}.pdf`);
      } else {
      pdf.save(`history_report_${currentDate}.pdf`);
      }
    } else {
      pdf.save(`history_report_${currentDate}.pdf`);
    }
  };

    

  return (
    <div className="flex justify-center items-center ">
      <div className="w-full p-6 ">

        <div className="p-4 sm:p-6 lg:p-8 ml-[11rem] mt-[-3rem] mb-5">
          <h2 className="text-2xl font-normal text-gray-600">Driver Report</h2>
          <p className="text-gray-500 dark:text-gray-400">View and generate detailed reports on driver performance, schedules, and activities</p>
        </div>
      
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-8 mb-8">
           {/* date range*/}

           <section>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 ml-[14rem]">
                <h2 className="text-lg font-semibold text-gray-700 sm:mr-[-0.7rem]">Date Range:</h2>
                <input
                  type="date"
                  className="p-2 border rounded w-full sm:w-auto "
                  value={startDate}
                  onChange={handleStartDateChange}
                />
                <input
                  type="date"
                  className="p-2 border rounded w-full sm:w-auto"
                  value={endDate}
                  onChange={handleEndDateChange}
                />
              </div>
            </section>

        {/* driver */}
        <section>
  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
    <h2 className="text-lg font-semibold text-gray-700 sm:mr-[-0.7rem">Driver:</h2>
    <select
      className="p-2 border rounded uppercase w-full sm:w-auto"
      onChange={handleDriverChange}
    >
      <option value="">Select a driver</option>
      {filteredUniqueDrivers.map(driver => (
        <option key={driver!.id} value={driver!.id}>
          {driver!.firstname} {driver!.lastname}
        </option>
      ))}
    </select>
  </div>
</section>

        </div>

        <section id="report-content" className="mb-8">
            <div className="flex justify-between items-center mb-4 ">
            {selectedDriverId && startDate && endDate && (
              <div className="text-lg font-medium text-gray-600 ml-52">
              Van Plate Number: {filteredData.find(history => history.Assignment.VanDriverOperator.Driver?.id === selectedDriverId)?.Assignment.VanDriverOperator.Van.plate_number}
              </div>
            )}
            <h2 className="text-2xl font-semibold text-gray-700 ml-52">Trip History</h2>
            
            <button onClick={generatePDF} className="p-2 bg-blue-500 text-white rounded">
              Generate PDF
            </button>
            </div>

            <table className="w-full bg-white  ml-52" style={{tableLayout:'fixed',width:'87%'}}>
            <thead>
              <tr className="bg-gray-200">
              <th className="py-2 px-4 border-b text-left">Date</th>
              <th className="py-2 px-4 border-b text-left">Temporary Plate Number</th>
              <th className="py-2 px-4 border-b text-left">Departed Time</th>
              <th className="py-2 px-4 border-b text-left">Arrived Time</th>
              <th className="py-2 px-4 border-b text-left">To</th>
              
              </tr>
            </thead>
            <tbody>
              {selectedDriverId && startDate && endDate ? (
              filteredData.map((history, index, array) => {
                if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
                const isTemporary = history.Assignment.VanDriverOperator.Driver?.id !== selectedDriverId;
                return (
                  <tr key={history.id} className="hover:bg-gray-100">
                  <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b">{isTemporary ? history.Assignment.VanDriverOperator.Van.plate_number : ''}</td>
                  <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 px-4 border-b">{new Date(array[index + 1].timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 px-4 border-b">
                    {history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal}
                  </td>
                  
                  </tr>
                );
                }
                return null;
              })
              ) : (
              <tr>
                <td className=" text-center py-32" colSpan={5}>No data available</td>
              </tr>
              )}
            </tbody>
            </table>

        </section>

      </div>
    </div>
  );
}