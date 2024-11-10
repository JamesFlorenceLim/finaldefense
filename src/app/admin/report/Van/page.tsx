"use client";
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
        pdf.text(`Plate No.: ${selectedDriverPlateNumber}`, 10, 50);
        pdf.text(`Driver: ${selectedDriverName}`, 10, 55);
    
        // Add table
        const tableColumn = ["Date", "Temporary Driver", "Departed", "Arrived", "Terminal"];
        const tableRows: any[] = [];
    
        assignmentHistory
            .filter(history => (eventFilter ? history.event === eventFilter : true))
            .filter(history => (terminalFilter ? history.terminal === terminalFilter : true))
            .forEach((history, index, array) => {
                if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
                    const historyData = [
                        new Date(history.timestamp).toLocaleDateString(),
                        history.Assignment.Driver ? `${history.Assignment.Driver.firstname} ${history.Assignment.Driver.lastname}` : '',
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
        pdf.save(`report_${currentDate}${selectedDriverPlateNumber}.pdf`);
    };

    return (
        <div className="flex justify-center items-center">
            <div className="w-full p-6">
                <div className="p-4 sm:p-6 lg:p-8 ml-[11rem] mt-[-3rem] mb-5">
                    <h2 className="text-2xl font-normal text-gray-600">Van Report</h2>
                    <p className="text-gray-500 dark:text-gray-400">View and generate detailed reports on van and driver activities</p>
                </div>
                
                <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-8 mb-8">
                    <section>
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 ml-[14rem]">
                            <h2 className="text-lg font-semibold text-gray-700 sm:mr-[-0.7rem]">Date Range:</h2>
                            <input
                                type="date"
                                className="p-2 border rounded w-full sm:w-auto"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <input
                                type="date"
                                className="p-2 border rounded w-full sm:w-auto"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <h2 className="text-lg font-semibold text-gray-700 sm:mr-[-0.7rem]">Van:</h2>
                            <select
                                className="p-2 border rounded uppercase w-full sm:w-auto"
                                onChange={(e) => setSelectedVanDriverOperator(parseInt(e.target.value))}
                            >
                                <option value="">Select Van</option>
                                {vanDriverOperators.map((operator) => (
                                    <option className='uppercase' key={operator.id} value={operator.id}>
                                        {operator.Van.plate_number}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>
                </div>

                <section id="report-content" className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-700 ml-52 uppercase">Van Driver -{selectedDriverName}</h2>
                        <h2 className="text-2xl font-semibold text-gray-700 ml-52 uppercase">Trip History</h2>
                        <button onClick={generatePDF} className="p-2 bg-blue-500 text-white rounded">
                            Generate PDF
                        </button>
                    </div>

                    <table className="w-full bg-white ml-52" style={{ tableLayout: 'fixed', width: '87%' }}>
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="py-2 px-4 border-b text-left">Date</th>
                                <th className="py-2 px-4 border-b text-left">Temporary Driver</th>
                                <th className="py-2 px-4 border-b text-left">Departed</th>
                                <th className="py-2 px-4 border-b text-left">Arrived</th>
                                <th className="py-2 px-4 border-b text-left">Terminal</th>
                                {/* <th className="py-2 px-4 border-b text-left">Driver</th> */}
                                
                            </tr>
                        </thead>
                        <tbody>
                            {assignmentHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-32     ">No data available</td>
                                </tr>
                            ) : (
                                assignmentHistory
                                    .filter(history => (eventFilter ? history.event === eventFilter : true))
                                    .filter(history => (terminalFilter ? history.terminal === terminalFilter : true))
                                    .map((history, index, array) => {
                                        if (history.event === 'departed' && array[index + 1] && array[index + 1].event === 'arrived') {
                                            return (
                                                <tr key={history.id} className="hover:bg-gray-100">
                                                    <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleDateString()}</td>
                                                    <td className="py-2 px-4 border-b">
                                                        {history.Assignment.Driver ? `${history.Assignment.Driver.firstname} ${history.Assignment.Driver.lastname}` : ''}
                                                    </td>
                                                    <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleTimeString()}</td>
                                                    <td className="py-2 px-4 border-b">{new Date(array[index + 1].timestamp).toLocaleTimeString()}</td>
                                                    <td className="py-2 px-4 border-b">
                                                        {history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal}
                                                    </td>
                                                    {/* <td className="py-2 px-4 border-b">{history.Assignment.Driver ? `` : selectedDriverName}</td> */}
                                                    
                                                </tr>
                                            );
                                        }
                                        return null;
                                    })
                            )}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
};

export default VanDriverOperatorsReportPage;