import { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';


const TerminalsReportPage = () => {
    const [terminalReport, setTerminalReport] = useState<any[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        if (startDate && endDate) {
            const fetchTerminalReport = async () => {
                const response = await axios.get(`/api/report?type=terminalReport&startDate=${startDate}&endDate=${endDate}&status=${status}`);
                const report = response.data;
                console.log('Terminal Report:', report); // Log the response data
                setTerminalReport(report);
            };
            fetchTerminalReport();
        }
    }, [startDate, endDate, status]);

    const generatePDF = async () => {
        const pdf = new jsPDF();
        
        // Add logo
        // const logo = new Image();
        // logo.src = '../../images/logo.png'; // Replace with the path to your logo
        // pdf.addImage(logo, 'PNG', 10, 10, 50, 20);

        // Add company name
        pdf.setFontSize(18);
        pdf.text('Markadz', 70, 20);

        // Add report title
        pdf.setFontSize(14);
        pdf.text(`Terminal Report: ${startDate} to ${endDate}`, 10, 40);

        // Add table
        const tableColumn = ["Terminal", "Count"];
        const tableRows: any[] = [];

        terminalReport.forEach(report => {
            const reportData = [
                report.terminal === 'terminal1' ? 'Gensan' : report.terminal === 'terminal2' ? 'Palimbang' : report.terminal,
                report._count.terminal
            ];
            tableRows.push(reportData);
        });

        (pdf as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'grid'
        });

        const currentDate = new Date().toISOString().split('T')[0];
        pdf.save(`report_${currentDate}.pdf`);
    };

    return (
        <div className="p-6 ml-96">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Terminals Report Page</h1>
            
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

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Status</h2>
                <select
                    className="p-2 border rounded"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="">Select Status</option>
                    <option value="queued">Queued</option>
                    <option value="arrived">Arrived</option>
                </select>
            </section>

            <section id="report-content" className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Terminal Report</h2>
                
                <h2 className="font-medium text-gray-900">Date Range: {startDate} to {endDate}</h2>
                
                <table className="min-w-full bg-white shadow-md rounded-lg">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Terminal</th>
                            <th className="py-2 px-4 border-b">Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {terminalReport.map((report) => (
                            <tr key={report.terminal}>
                                <td className="py-2 px-4 border-b">
                                    {report.terminal === 'terminal1' ? 'Gensan' : report.terminal === 'terminal2' ? 'Palimbang' : report.terminal}
                                </td>
                                <td className="py-2 px-4 border-b">{report._count.terminal}</td>
                            </tr>
                        ))}
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
};

export default TerminalsReportPage;