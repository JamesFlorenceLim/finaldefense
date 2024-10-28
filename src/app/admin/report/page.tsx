"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ReportPage = () => {
    const [vanDriverOperators, setVanDriverOperators] = useState<any[]>([]);
    const [selectedVanDriverOperator, setSelectedVanDriverOperator] = useState<number | null>(null);
    const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
    const [roundTrips, setRoundTrips] = useState<number>(0);
    const [averageTripDuration, setAverageTripDuration] = useState<number>(0);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedDriverName, setSelectedDriverName] = useState<string>('');

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
        const input = document.getElementById('report-content');
        if (input) {
            const canvas = await html2canvas(input);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const currentDate = new Date().toISOString().split('T')[0];
            
            
            pdf.save(`report_${currentDate}.pdf`);
        }
    };

    const roundTripData = countRoundTrips(assignmentHistory);

    // Group trips by day
    const tripsPerDay = roundTripData.reduce((acc: { [key: string]: number }, trip) => {
        const date = new Date(trip.start).toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date]++;
        return acc;
    }, {});

    const roundTripGraphData = {
        labels: Object.keys(tripsPerDay),
        datasets: [
            {
                label: 'Trips per Day',
                data: Object.values(tripsPerDay),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
        ],
    };

    return (
        <div className="p-6 ml-96">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Report Page</h1>
            
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Van Driver Operators</h2>
                <select
                    className="p-2 border rounded"
                    onChange={(e) => setSelectedVanDriverOperator(parseInt(e.target.value))}
                >
                    <option value="">Select a Van Driver Operator</option>
                    {vanDriverOperators.map((operator) => (
                        <option key={operator.id} value={operator.id}>
                            {operator.Driver.firstname} {operator.Driver.lastname} - Plate Number: {operator.Van.plate_number}
                        </option>
                    ))}
                </select>
            </section>

            <section className="mb-8">
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

            {selectedVanDriverOperator && (
                <section id="report-content" className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Trip History for {selectedDriverName}</h2>
                    
                        <h2 className="font-medium text-gray-900">Date Range: {startDate} to {endDate}</h2>
                    
                    <table className="min-w-full bg-white shadow-md rounded-lg">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 border-b">Event</th>
                                <th className="py-2 px-4 border-b">Timestamp</th>
                                <th className="py-2 px-4 border-b">Terminal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignmentHistory.map((history) => (
                                <tr key={history.id}>
                                    <td className="py-2 px-4 border-b">{history.event}</td>
                                    <td className="py-2 px-4 border-b">{new Date(history.timestamp).toLocaleString()}</td>
                                    <td className="py-2 px-4 border-b">{history.terminal}</td>
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
                    <div className="mt-8" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <Bar data={roundTripGraphData} />
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

export default ReportPage;