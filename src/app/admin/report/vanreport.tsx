import { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const VanDriverOperatorsReportPage = () => {
    const [vanDriverOperators, setVanDriverOperators] = useState<any[]>([]);
    const [selectedVanDriverOperator, setSelectedVanDriverOperator] = useState<number | null>(null);
    const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
    const [roundTrips, setRoundTrips] = useState<number>(0);
    const [averageTripDuration, setAverageTripDuration] = useState<number>(0);
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
                const roundTripData = countRoundTrips(history);
                setAverageTripDuration(calculateAverageTripDuration(history));
                setRoundTrips(roundTripData.length);

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

    const countRoundTrips = (history: any[]) => {
        const roundTripData = [];
        for (let i = 0; i < history.length - 1; i++) {
            if (history[i].terminal === 'terminal1' && history[i + 1].terminal === 'terminal2') {
                roundTripData.push({
                    start: new Date(history[i].timestamp).toLocaleString(),
                    end: new Date(history[i + 1].timestamp).toLocaleString(),
                });
            }
        }
        return roundTripData;
    };

    const calculateAverageTripDuration = (history: any[]) => {
        let totalDuration = 0;
        let tripCount = 0;

        for (let i = 0; i < history.length - 1; i++) {
            if (history[i].terminal === 'terminal1' && history[i + 1].terminal === 'terminal2') {
                const startTime = new Date(history[i].timestamp).getTime();
                const endTime = new Date(history[i + 1].timestamp).getTime();
                totalDuration += (endTime - startTime);
                tripCount++;
            }
        }

        return tripCount > 0 ? totalDuration / tripCount / 1000 / 60 : 0; // Convert to minutes
    };

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
        const tableColumn = ["Event", "Timestamp", "Terminal"];
        const tableRows: any[] = [];
    
        assignmentHistory
            .filter(history => (eventFilter ? history.event === eventFilter : true))
            .filter(history => (terminalFilter ? history.terminal === terminalFilter : true))
            .forEach(history => {
                const historyData = [
                    history.event,
                    new Date(history.timestamp).toLocaleString(),
                    history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal
                ];
                tableRows.push(historyData);
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
    const roundTripData = countRoundTrips(assignmentHistory);

    return (
        <div className="p-6 ml-96">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Van/Driver Report Page</h1>
            
            <div className="flex space-x-8 mb-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Van Driver</h2>
                    <select
                        className="p-2 border rounded"
                        onChange={(e) => setSelectedVanDriverOperator(parseInt(e.target.value))}
                    >
                        <option value="">Select a Van Driver</option>
                        {vanDriverOperators.map((operator) => (
                            <option key={operator.id} value={operator.id}>
                               {operator.Driver.lastname} - Plate Number: {operator.Van.plate_number}
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
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Trip History for {selectedDriverName}</h2>
                    
                    <h2 className="font-medium text-gray-900">Date Range: {startDate} to {endDate}</h2>
                    
                    <table className="min-w-full bg-white shadow-md rounded-lg">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 border-b">Event 
                                    <select
                                        className="p-2 border rounded"
                                        onChange={(e) => setEventFilter(e.target.value)}
                                    >
                                        <option value="">All Events</option>
                                        {Array.from(new Set(assignmentHistory.map(history => history.event))).map(event => (
                                            <option key={event} value={event}>{event}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className="py-2 px-4 border-b">Timestamp</th>
                                <th className="py-2 px-4 border-b">Terminal
                                    <select
                                        className="p-2 border rounded"
                                        onChange={(e) => setTerminalFilter(e.target.value)}
                                    >
                                        <option value="">All Terminals</option>
                                        {Array.from(new Set(assignmentHistory.map(history => history.terminal))).map(terminal => (
                                            <option key={terminal} value={terminal}>
                                                {terminal === 'terminal1' ? 'Gensan' : terminal === 'terminal2' ? 'Palimbang' : terminal}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignmentHistory
                                .filter(history => (eventFilter ? history.event === eventFilter : true))
                                .filter(history => (terminalFilter ? history.terminal === terminalFilter : true))
                                .map((history) => (
                                    <tr key={history.id}>
                                        <td className="py-2 px-4 border-b">{history.event}</td>
                                        <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleString()}</td>
                                        <td className="py-2 px-4 border-b">
                                            {history.terminal === 'terminal1' ? 'Gensan' : history.terminal === 'terminal2' ? 'Palimbang' : history.terminal}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    <div className="mt-4">
                        <span className="font-medium text-gray-900">Round Trips: {roundTrips}</span>
                    </div>
                    <div className="mt-4">
                        <span className="font-medium text-gray-900">Average Trip Duration: {averageTripDuration.toFixed(2)} minutes</span>
                    </div>
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