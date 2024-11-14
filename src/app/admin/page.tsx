"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import WithAuth from '../withAuth';

const fetchAssignments = async (status: string, terminal: string) => {
  try {
    const response = await axios.get(`/api/scheduling?terminal=${terminal}&status=${status}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
};

const updateAssignment = async (id: number, status: string, terminal: string, order?: number, arrivalTime?: string, departureTime?: string, queuedAt?: string) => {
  await axios.put('/api/scheduling', { id, status, terminal, order, arrivalTime, departureTime, queuedAt });
};

const Terminal1 = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [idleAssignments, setIdleAssignments] = useState<any[]>([]);
  const [selectedIdleAssignments, setSelectedIdleAssignments] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('queued');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 6;

  const loadAssignments = async () => {
    const statuses = ['queued', 'departed'];
    const terminal1Assignments = await Promise.all(statuses.map(status => fetchAssignments(status, 'terminal1')));
    const terminal2Assignments = await Promise.all(statuses.map(status => fetchAssignments(status, 'terminal2')));
    const data = [...terminal1Assignments.flat(), ...terminal2Assignments.flat()];
    data.sort((a: any, b: any) => a.queue_order - b.queue_order); // Sort by queue_order
    setAssignments(data);
  };

  const loadIdleAssignments = async () => {
    const data = await fetchAssignments('idle', 'terminal1');
    data.sort((a: any, b: any) => a.queue_order - b.queue_order); // Sort by queue_order
    setIdleAssignments(data);
  };

  const loadAllAssignments = async () => {
    const statuses = ['queued', 'departed', 'arrived', 'idle'];
    const terminal1Assignments = await Promise.all(statuses.map(status => fetchAssignments(status, 'terminal1')));
    const terminal2Assignments = await Promise.all(statuses.map(status => fetchAssignments(status, 'terminal2')));
    setAllAssignments([...terminal1Assignments.flat(), ...terminal2Assignments.flat()]);
  };

  useEffect(() => {
    loadAssignments();
    loadIdleAssignments();
    loadAllAssignments();
    const intervalId = setInterval(() => {
      loadAssignments();
      loadIdleAssignments();
      loadAllAssignments();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [statusFilter]);

  useEffect(() => {
    const timeIntervalId = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timeIntervalId);
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    const currentTerminal = 'terminal1';
    const currentTime = new Date().toLocaleTimeString();

    try {
      if (newStatus === 'queued') {
        // Fetch current queued assignments to determine the next order
        const assignmentsData = await fetchAssignments('queued', currentTerminal);
        const nextOrder = assignmentsData.length + 1; // Next order number
        const queuedAt = new Date().toISOString(); // Store the queued at time in ISO format

        // Calculate estimated departure time (30 minutes from now)
        const estimatedDepartureTime = new Date(new Date().getTime() + 30 * 60 * 1000).toISOString();

        // Calculate estimated arrival time (3 hours from departure time)
        const estimatedArrivalTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString();

        // Update status to queued with the new order, queuedAt time, estimated departure, and arrival times
        await updateAssignment(id, 'queued', currentTerminal, nextOrder, estimatedArrivalTime, estimatedDepartureTime, queuedAt);
      } else if (newStatus === 'departed') {
        const assignmentsData = await fetchAssignments('queued', currentTerminal);
        const firstInQueueId = assignmentsData.length > 0 ? assignmentsData[0].id : null;

        if (id !== firstInQueueId) {
          alert('Only the first van in the queue can be marked as departed.');
          return;
        }

        // Change status to departed
        await updateAssignment(id, 'departed', currentTerminal, undefined, undefined, currentTime);

        // Calculate estimated arrival time (3 hours from now)
        const estimatedArrivalTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString();
        //await updateAssignment(id, 'arrived', currentTerminal, undefined, estimatedArrivalTime);

        // Recalculate times for the remaining vans in the queue
        const remainingAssignments = assignmentsData.slice(1);
        for (let i = 0; i < remainingAssignments.length; i++) {
          const assignment = remainingAssignments[i];
          const departureTime = new Date(new Date().getTime() + (i + 1) * 10 * 1000).toLocaleTimeString();
          const arrivalTime = new Date(new Date().getTime() + (i + 2) * 10 * 1000).toLocaleTimeString();
          await updateAssignment(assignment.id, 'queued', currentTerminal, assignment.queue_order, arrivalTime, departureTime, assignment.queued_at);
        }
      } else if (newStatus === 'arrived') {
        await updateAssignment(id, 'arrived', currentTerminal, undefined, currentTime);
      } else {
        await updateAssignment(id, newStatus, currentTerminal);
      }

      // Refresh assignments after any status change
      await loadAssignments();
      await loadIdleAssignments();
      await loadAllAssignments();
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedIdleAssignments((prevSelected) =>
      prevSelected.includes(id) ? prevSelected.filter((assignmentId) => assignmentId !== id) : [...prevSelected, id]
    );
  };

  const handleQueueAll = async () => {
    const currentTerminal = 'terminal1';
    try {
      for (let i = 0; i < selectedIdleAssignments.length; i++) {
        const id = selectedIdleAssignments[i];
        const nextOrder = assignments.length + i + 1; // Calculate the next order number
        const queuedAt = new Date().toISOString(); // Store the queued at time in ISO format

        // Calculate estimated departure time (30 minutes from now)
        const estimatedDepartureTime = new Date(new Date().getTime() + 30 * 60 * 1000).toISOString();

        // Calculate estimated arrival time (3 hours from departure time)
        const estimatedArrivalTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString();

        await updateAssignment(id, 'queued', currentTerminal, nextOrder, estimatedArrivalTime, estimatedDepartureTime, queuedAt);
      }
      // Refresh assignments after queuing all
      await loadAssignments();
      await loadIdleAssignments();
      await loadAllAssignments();
      setSelectedIdleAssignments([]); // Clear selected idle assignments
    } catch (error) {
      console.error('Error queuing all assignments:', error);
    }
  };

  const getDestination = (terminal: string) => {
    switch (terminal) {
      case 'terminal1':
        return 'Gensan Terminal';
      case 'terminal2':
        return 'Palimbang Terminal';
      default:
        return 'Unknown Destination';
    }
  };

  const calculateEstimatedTimes = (assignments: any[]) => {
    if (assignments.length === 0) return assignments;

    return assignments.map((assignment, index) => {
      const baseTime = new Date(assignment.queued_at).getTime();
      const departureTime = new Date(baseTime + (index + 1) * 30 * 60 * 1000); // 30 minutes for each order
      const arrivalTime = new Date(departureTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours from departure time

      return {
        ...assignment,
        estimatedDepartureTime: departureTime.toLocaleTimeString(),
        estimatedArrivalTime: arrivalTime.toLocaleTimeString(),
      };
    });
  };

  const handleConfirmArrival = async (id: number) => {
    const currentTerminal = 'terminal2';
    const currentTime = new Date().toISOString(); // Store the arrival time in ISO format

    try {
      // Update status to arrived with the arrival time
      await updateAssignment(id, 'arrived', currentTerminal, undefined, currentTime);

      // Update status to idle
      await updateAssignment(id, 'idle', currentTerminal, undefined, currentTime);

      // Refresh assignments after confirming arrival
      await loadAssignments();
      await loadIdleAssignments();
      await loadAllAssignments();
    } catch (error) {
      console.error('Error confirming arrival:', error);
    }
  };

  const updatedAssignments = calculateEstimatedTimes(assignments);
  const updatedAllAssignments = {
    terminal1: calculateEstimatedTimes(allAssignments.filter(a => a.terminal === 'terminal1')),
    terminal2: calculateEstimatedTimes(allAssignments.filter(a => a.terminal === 'terminal2'))
  };

  // Pagination logic
  const totalPages = Math.ceil([...updatedAllAssignments.terminal1, ...updatedAllAssignments.terminal2].length / rowsPerPage);
  const paginatedAssignments = [...updatedAllAssignments.terminal1, ...updatedAllAssignments.terminal2].slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="p-6 ml-64">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Admin Schedule Dashboard</h1>
      {/* <div className="text-center mb-6">
        <span className="text-xl font-semibold text-gray-700">Current Time: {currentTime}</span>
      </div> */}

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Vans Across Terminals</h2>

        <div className="flex flex-col sm:-mx-6 lg:-mx-7">
  <div className="inline-block min-w-full relative " style={{width:'80.3rem', marginLeft:'-2.3rem'}}>
    <table className="bg-white rounded-lg mx-auto overflow-hidden" style={{ tableLayout: 'fixed' }}>
      <thead className="bg-blue-400 text-xs" >
        <tr className="text-white">
          <th className="px-4 py-2 text-left font-normal rounded-l-lg whitespace-nowrap">Driver</th>
          <th className="px-4 py-2 w-32 text-left font-normal whitespace-nowrap">Plate Number</th>
          <th className="px-4 py-2 text-left font-normal whitespace-nowrap">Terminal</th>
          <th className="px-4 py-2 w-32 text-left font-normal whitespace-nowrap">Queued At</th>
          <th className="px-4 py-2 w-48 text-left font-normal whitespace-nowrap">Estimated Departure</th>
          <th className="px-4 py-2 w-28 text-left font-normal whitespace-nowrap">Departed At</th>
          <th className="px-4 py-2 w-40 text-left font-normal whitespace-nowrap">Estimated Arrival</th>
          <th className="px-5 py-2 w-28 text-left font-normal whitespace-nowrap">Arrived At</th>
          <th className="px-12 py-2 text-left font-normal whitespace-nowrap">Status</th>
          <th className="px-4 py-2 text-center font-normal rounded-r-lg whitespace-nowrap">Actions</th>
        </tr>
      </thead>
      <tbody className="text-xs">
        {paginatedAssignments.length === 0 ? (
          <tr>
            <td colSpan={10} className="px-4 py-52 text-center text-lg font-medium text-gray-400">
              No Vans Across Terminals
            </td>
          </tr>
        ) : (
          paginatedAssignments.map((assignment: any) => {
            const isArrivalTimeReached = new Date().getTime() >= new Date(assignment.estimatedArrivalTime).getTime();
            return (
                <tr key={assignment.id} className="border-b">
                <td className="px-4 py-4 uppercase text-nowrap">
                  {assignment.VanDriverOperator.Driver.firstname.toUpperCase()} {assignment.VanDriverOperator.Driver.lastname.toUpperCase()}
                </td>
                <td className="px-4 py-4 uppercase text-nowrap">
                  {assignment.VanDriverOperator.Van.plate_number.toUpperCase()}
                </td>
                <td className="px-4 py-4 uppercase text-nowrap">
                  {getDestination(assignment.terminal).toUpperCase()}
                </td>
                <td className="px-4 py-4 uppercase text-nowrap">
                  {assignment.queued_at ? new Date(assignment.queued_at).toLocaleTimeString().toUpperCase() : 'N/A'}
                </td>
                <td className="px-4 py-4 uppercase text-nowrap">
                  {assignment.estimatedDepartureTime.toUpperCase()}
                </td>
                <td className="px-4 py-4 uppercase text-nowrap">
                  {assignment.departureTime ? new Date(assignment.departureTime).toLocaleTimeString().toUpperCase() : 'N/A'}
                </td>
                <td className="px-4 py-4 uppercase text-nowrap">
                  {assignment.estimatedArrivalTime.toUpperCase()}
                </td>
                <td className="px-4 py-4 uppercase text-nowrap">
                  {assignment.arrivalTime ? new Date(assignment.arrivalTime).toLocaleTimeString().toUpperCase() : 'N/A'}
                </td>
                <td className="px-4 py-4 text-center">
                  <div className={`flex items-center justify-center ${assignment.status === 'queued' ? 'bg-green-100' : assignment.status === 'departed' ? 'bg-red-100' : 'bg-gray-100'} rounded-full px-2 py-1`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${assignment.status === 'queued' ? 'bg-green-500' : assignment.status === 'departed' ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                  <span className={`${assignment.status === 'queued' ? 'text-green-500' : assignment.status === 'departed' ? 'text-red-500' : 'text-gray-500'}`}>
                    {assignment.status.toUpperCase()}
                  </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    className={`bg-green-500 text-white px-3 py-2 rounded-2xl ${!(assignment.status === 'departed' || assignment.status === 'arrived') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'}`}
                    onClick={() => handleConfirmArrival(assignment.id)}
                    disabled={!(assignment.status === 'departed' || assignment.status === 'arrived')}
                  >
                    ARRIVED
                  </button>
                </td>
                </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
</div>
      </section>

      {/* PAGINATION */}
      <nav className="pagination-bottom flex items-center -space-x-px ml-[750px] mb-16" aria-label="Pagination">
        <button
          type="button"
          className="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center 
          items-center gap-x-1.5 text-sm first:rounded-s-lg last:rounded-e-lg border border-blue-300
          text-gray-800 hover:bg-blue-500 hover:text-white focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Previous"
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          <svg className="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
          <span className="hidden sm:block">Previous</span>
        </button>
        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            type="button"
            className={`min-h-[38px] min-w-[38px] flex justify-center items-center border border-blue-300
              py-2 px-3 text-sm first:rounded-s-lg last:rounded-e-lg focus:outline-none
              ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'text-gray-800 hover:text-white hover:bg-blue-500'}`}
            aria-current={currentPage === index + 1 ? 'page' : undefined}
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </button>
        ))}
        <button
          type="button"
          className="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center
          gap-x-1.5 text-sm first:rounded-s-lg last:rounded-e-lg border border-blue-300 text-gray-800
          hover:bg-blue-500 hover:text-white  focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Next"
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          <span className="hidden sm:block">Next</span>
          <svg className="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      </nav>
    </div>
  );
};

export default WithAuth(Terminal1);