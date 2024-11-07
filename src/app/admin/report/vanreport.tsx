import { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const VanDriverOperatorsReportPage = () => {
    const [vanDriverOperators, setVanDriverOperators] = useState<any[]>([]);
    const [selectedVanDriverOperator, setSelectedVanDriverOperator] = useState<number | null>(null);
    const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedDriverName, setSelectedDriverName] = useState<string>('');
    const [selectedDriverPlateNumber, setSelectedDriverPlateNumber] = useState<string>('');
    const [terminalFilter, setTerminalFilter] = useState<string>('');
    const [eventFilter, setEventFilter] = useState<string>('');

    useEffect(() => {
        const fetchVanDriverOperators = async () => {
            const response = await axios.get('/api/report?type=vanDriverOperators');
            setVanDriverOperators(response.data);
        };
        fetchVanDriverOperators();
    }, []);

    useEffect(() => {
        if (selectedVanDriverOperator !== null && startDate && endDate) {
            const fetchAssignmentHistory = async () => {
                const response = await axios.get(`/api/report?type=assignmentHistory&vanDriverOperatorId=${selectedVanDriverOperator}&startDate=${startDate}&endDate=${endDate}`);
                const history = response.data;
                console.log('Assignment History:', history); // Log the response data
                setAssignmentHistory(history);

                // Set the selected driver's name
                const selectedDriver = vanDriverOperators.find(operator => operator.id === selectedVanDriverOperator);
                if (selectedDriver) {
                    setSelectedDriverName(`${selectedDriver.Driver.firstname} ${selectedDriver.Driver.lastname}`);
                    setSelectedDriverPlateNumber(selectedDriver.Van.plate_number);
                }
            };
            fetchAssignmentHistory();
        }
    }, [selectedVanDriverOperator, startDate, endDate]);

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
        pdf.text('Van/Driver Report', 70, 30);
        
    
        // Add selected driver's name and plate number
        pdf.setFontSize(10);
        pdf.text(`Start Date: ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 10, 40);
        pdf.text(`End Date: ${new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 10, 45);
        pdf.text(`Driver: ${selectedDriverName}`, 10, 50);
        pdf.text(`Plate No.: ${selectedDriverPlateNumber}`, 10, 55);
    
        // Add table
        const tableColumn = ["Date", "Driver" , "Arrived", "Terminal", "Departed" , "Temporary Driver"];
        const tableRows: any[] = [];
    
        assignmentHistory
            .filter(history => (eventFilter ? history.event === eventFilter : true))
            .filter(history => (terminalFilter ? history.terminal === terminalFilter : true))
            .forEach((history, index, array) => {
                if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
                    const historyData = [
                        new Date(history.timestamp).toLocaleDateString(),
                        history.Assignment.Driver ? `` : selectedDriverName,
                        new Date(history.timestamp).toLocaleTimeString(),
                        new Date(array[index + 1].timestamp).toLocaleTimeString(),
                        history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal,
                        history.Assignment.Driver ? `${history.Assignment.Driver.firstname} ${history.Assignment.Driver.lastname}` : ''
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
        pdf.save(`report_${currentDate}.pdf`);
    };

    return (
        <div className="p-6 ml-96">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Van Report Page</h1>
            
            <div className="flex space-x-8 mb-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Van</h2>
                    <select
                        className="p-2 border rounded uppercase"
                        onChange={(e) => setSelectedVanDriverOperator(parseInt(e.target.value))}
                    >
                        <option value="">Select Van</option>
                        {vanDriverOperators.map((operator) => (
                            <option className='uppercase' key={operator.id} value={operator.id}>
                               {operator.Van.plate_number}
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
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <input
                            type="date"
                            className="p-2 border rounded"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </section>
            </div>

            {selectedVanDriverOperator && (
                <section id="report-content" className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Trip History for {selectedDriverPlateNumber}</h2>
                    
                    <h2 className="font-medium text-gray-900">Date Range: {startDate} to {endDate}</h2>
                    
                    <table className="min-w-full bg-white shadow-md rounded-lg">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 border-b">Date</th>
                                <th className="py-2 px-4 border-b">Departed</th>
                                <th className="py-2 px-4 border-b">Arrived</th>
                                <th className="py-2 px-4 border-b">Terminal</th>
                                <th className="py-2 px-4 border-b">Driver</th>
                                <th className="py-2 px-4 border-b">Temporary Driver</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignmentHistory
                                .filter(history => (eventFilter ? history.event === eventFilter : true))
                                .filter(history => (terminalFilter ? history.terminal === terminalFilter : true))
                                .map((history, index, array) => {
                                    if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
                                        return (
                                            <tr key={history.id}>
                                                <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleDateString()}</td>
                                                <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleTimeString()}</td>
                                                <td className="py-2 px-4 border-b">{new Date(array[index + 1].timestamp).toLocaleTimeString()}</td>
                                                <td className="py-2 px-4 border-b">
                                                    {history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal}
                                                </td>
                                                <td className="py-2 px-4 border-b">{history.Assignment.Driver ? `` : selectedDriverName}</td>
                                                <td className="py-2 px-4 border-b">
                                                    {history.Assignment.Driver ? `${history.Assignment.Driver.firstname} ${history.Assignment.Driver.lastname}` : ''}
                                                </td>
                                            </tr>
                                        );
                                    }
                                    return null;
                                })}
                        </tbody>
                    </table>
                </section>
            )}

            <button
                onClick={generatePDF}
                className="mt-4 p-2 bg-blue-500 text-white rounded"
            >
                Generate PDF
            </button>
        </div>
    );
};

export default VanDriverOperatorsReportPage;