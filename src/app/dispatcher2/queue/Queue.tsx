"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal'; // Import the Modal component

const fetchAssignments = async (status: string, terminal: string) => {
  const response = await axios.get(`/api/scheduling?terminal=${terminal}&status=${status}`);
  return response.data;
};

const updateAssignment = async (id: number, status: string, terminal: string, order?: number, arrivalTime?: string, departureTime?: string, queuedAt?: string) => {
  await axios.put('/api/scheduling', { id, status, terminal, order, arrivalTime, departureTime, queuedAt });
};

const Terminal2 = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [idleAssignments, setIdleAssignments] = useState<any[]>([]);
  const [selectedIdleAssignments, setSelectedIdleAssignments] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('queued');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // State for modal visibility

  const loadAssignments = async () => {
    const queuedData = await fetchAssignments('queued', 'terminal2');
    const departedData = await fetchAssignments('departed', 'terminal2');
    const data = [...queuedData, ...departedData];
    data.sort((a: any, b: any) => a.queue_order - b.queue_order); // Sort by queue_order
    setAssignments(data);
  };

  const loadIdleAssignments = async () => {
    const data = await fetchAssignments('idle', 'terminal2');
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
    const currentTerminal = 'terminal2';
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
    const currentTerminal = 'terminal2';
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
    const currentTerminal = 'terminal1';
    const currentTime = new Date().toISOString(); // Store the arrival time in ISO format

    try {
      // Update status to idle with the arrival time
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
  const updatedAllAssignments = calculateEstimatedTimes(allAssignments);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Palimbang Terminal</h1>
      <div className="text-center mb-6">
        <span className="text-xl font-semibold text-gray-700">Current Time: {currentTime}</span>
      </div>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Idle Vans</h2>
        <ul className="bg-white shadow-md rounded-lg divide-y divide-gray-200">
          {idleAssignments.map((assignment: any) => (
            <li key={assignment.id} className="p-4 flex justify-between items-center">
              <span className="font-medium text-gray-900">
                Driver: {assignment.VanDriverOperator.Driver.firstname} {assignment.VanDriverOperator.Driver.lastname} - Plate Number: {assignment.VanDriverOperator.Van.plate_number} - Status: {assignment.status}
              </span>
              <input
                type="checkbox"
                checked={selectedIdleAssignments.includes(assignment.id)}
                onChange={() => handleCheckboxChange(assignment.id)}
              />
            </li>
          ))}
        </ul>
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={handleQueueAll}
          disabled={selectedIdleAssignments.length === 0}
        >
          Queue All Selected
        </button>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Queued Vans</h2>
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Plate Number</th>
              <th className="py-2 px-4 border-b">Queued At</th>
              <th className="py-2 px-4 border-b">Est. Departure Time</th>
              <th className="py-2 px-4 border-b">Est. Arrival Time</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {updatedAssignments
            .filter((assignment: any) => assignment.status === 'queued' && assignment.terminal === 'terminal2')
            .map((assignment: any, index: number) => (
              <tr key={assignment.id}>
                <td className="py-2 px-4 border-b">{new Date(assignment.assigned_at).toLocaleDateString()}</td>
                <td className="py-2 px-4 border-b">{assignment.VanDriverOperator.Van.plate_number}</td>
                <td className="py-2 px-4 border-b">{assignment.queued_at ? new Date(assignment.queued_at).toLocaleTimeString() : 'N/A'}</td>
                <td className="py-2 px-4 border-b">{assignment.estimatedDepartureTime}</td>
                <td className="py-2 px-4 border-b">{assignment.estimatedArrivalTime}</td>
                <td className="py-2 px-4 border-b">
                  {index === 0 && assignment.status === 'queued' && (
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                      onClick={() => handleStatusChange(assignment.id, 'departed')}
                    >
                      Force Depart
                    </button>
                  )}
                  {index === 0 && assignment.status === 'queued' && new Date().getTime() >= new Date(assignment.queued_at).getTime() + 30 * 60 * 1000 && (
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                      onClick={() => handleStatusChange(assignment.id, 'departed')}
                    >
                      Confirm Depart
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        onClick={() => setIsModalOpen(true)}
      >
        View Vans Across Terminals
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Vans Across Terminals</h2>
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Driver</th>
              <th className="py-2 px-4 border-b">Plate Number</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Current or Destinated Terminal</th>
              <th className="py-2 px-4 border-b">Queued At</th>
              <th className="py-2 px-4 border-b">Estimated Departure</th>
              <th className="py-2 px-4 border-b">Departed At</th>
              <th className="py-2 px-4 border-b">Estimated Arrival</th>
              <th className="py-2 px-4 border-b">Arrived At</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {updatedAllAssignments.map((assignment: any) => {
              const isArrivalTimeReached = new Date().getTime() >= new Date(assignment.estimatedArrivalTime).getTime();
              return (
                <tr key={assignment.id}>
                  <td className="py-2 px-4 border-b">{assignment.VanDriverOperator.Driver.firstname} {assignment.VanDriverOperator.Driver.lastname}</td>
                  <td className="py-2 px-4 border-b">{assignment.VanDriverOperator.Van.plate_number}</td>
                  <td className="py-2 px-4 border-b">{assignment.status}</td>
                  <td className="py-2 px-4 border-b">{getDestination(assignment.terminal)}</td>
                  <td className="py-2 px-4 border-b">{assignment.queued_at ? new Date(assignment.queued_at).toLocaleTimeString() : 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{assignment.estimatedDepartureTime}</td>
                  <td className="py-2 px-4 border-b">{assignment.departureTime ? new Date(assignment.departureTime).toLocaleTimeString() : 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{assignment.estimatedArrivalTime}</td>
                  <td className="py-2 px-4 border-b">{assignment.arrivalTime ? new Date(assignment.arrivalTime).toLocaleTimeString() : 'N/A'}</td>
                  <td className="py-2 px-4 border-b">
                    {(assignment.status === 'departed' || assignment.status === 'arrived') && assignment.terminal === 'terminal2' && (
                      <button
                        className={`bg-green-500 text-white px-3 py-1 rounded-lg ${isArrivalTimeReached ? 'hover:bg-green-600' : 'opacity-50 cursor-not-allowed'}`}
                        onClick={() => handleConfirmArrival(assignment.id)}
                        disabled={!isArrivalTimeReached}
                      >
                        Arrived
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>
    </div>
  );
};

export default Terminal2;