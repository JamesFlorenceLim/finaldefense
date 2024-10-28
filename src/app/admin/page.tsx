"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';

const fetchAssignments = async (status: string, terminal: string) => {
  const response = await axios.get(`/api/scheduling?terminal=${terminal}&status=${status}`);
  return response.data;
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

  return (
    <div className="p-6 ml-64">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Admin Schedule Dashboard</h1>
      <div className="text-center mb-6">
        <span className="text-xl font-semibold text-gray-700">Current Time: {currentTime}</span>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Vans Across Terminals</h2>
        <div className="flex flex-col overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full overflow-x-auto relative">
            <table className="bg-white rounded-lg mx-auto overflow-hidden" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-blue-400 text-xs">
                <tr className="text-white">
                  <th className="px-4 py-2 w-32 text-left font-normal rounded-l-lg">Driver</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Plate Number</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Terminal</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Queued At</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Estimated Departure</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Departed At</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Estimated Arrival</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Arrived At</th>
                  <th className="px-4 py-2 w-32 text-left font-normal">Status</th>
                  <th className="px-4 py-2 w-32 text-center font-normal rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {updatedAllAssignments.terminal1.length === 0 && updatedAllAssignments.terminal2.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-52 text-center text-lg font-medium text-gray-400">
                      No Vans Across Terminals
                    </td>
                  </tr>
                ) : (
                  [...updatedAllAssignments.terminal1, ...updatedAllAssignments.terminal2].map((assignment: any) => {
                    const isArrivalTimeReached = new Date().getTime() >= new Date(assignment.estimatedArrivalTime).getTime();
                    return (
                      <tr key={assignment.id} className="border-b">
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {assignment.VanDriverOperator.Driver.firstname.toUpperCase()} {assignment.VanDriverOperator.Driver.lastname.toUpperCase()}
                        </td>
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {assignment.VanDriverOperator.Van.plate_number.toUpperCase()}
                        </td>
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {getDestination(assignment.terminal).toUpperCase()}
                        </td>
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {assignment.queued_at ? new Date(assignment.queued_at).toLocaleTimeString().toUpperCase() : 'N/A'}
                        </td>
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {assignment.estimatedDepartureTime.toUpperCase()}
                        </td>
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {assignment.departureTime ? new Date(assignment.departureTime).toLocaleTimeString().toUpperCase() : 'N/A'}
                        </td>
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {assignment.estimatedArrivalTime.toUpperCase()}
                        </td>
                        <td className="px-4 py-2 uppercase" style={{ wordBreak: 'break-word' }}>
                          {assignment.arrivalTime ? new Date(assignment.arrivalTime).toLocaleTimeString().toUpperCase() : 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`${assignment.status === 'queued' ? 'text-green-500' : assignment.status === 'departed' ? 'text-red-500' : ''}`}>
                            {assignment.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {(assignment.status === 'departed' || assignment.status === 'arrived') && (assignment.terminal === 'terminal1' || assignment.terminal === 'terminal2') && (
                            <button
                              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                              onClick={() => handleConfirmArrival(assignment.id)}
                            >
                              ARRIVED
                            </button>
                          )}
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
    </div>
  );
};

export default Terminal1;