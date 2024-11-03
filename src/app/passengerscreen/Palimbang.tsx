
"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import van from '../images/van.png';

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
    const queuedData = await fetchAssignments('queued', 'terminal1');
    const departedData = await fetchAssignments('departed', 'terminal1');
    const data = [...queuedData, ...departedData];
    data.sort((a: any, b: any) => a.queue_order - b.queue_order); // Sort by queue_order
    setAssignments(data);
  };

  const loadIdleAssignments = async () => {
    const data = await fetchAssignments('queued', 'terminal1');
    data.sort((a: any, b: any) => a.queue_order - b.queue_order); // Sort by queue_order
    setIdleAssignments(data);
  };

  const loadAllAssignments = async () => {
    const statuses = ['queued', 'departed', 'arrived'];
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
      const baseTime = assignment.departureTime ? new Date(assignment.departureTime).getTime() : new Date(assignment.queued_at).getTime();
      const departureTime = assignment.departureTime ? new Date(baseTime) : new Date(baseTime + (index + 1) * 30 * 60 * 1000); // 30 minutes for each order if not forced departed
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
  const updatedAllAssignments = {
    terminal1: calculateEstimatedTimes(allAssignments.filter(a => a.terminal === 'terminal1')),
    terminal2: calculateEstimatedTimes(allAssignments.filter(a => a.terminal === 'terminal2'))
  };
  // Filter assignments to show only queued from terminal1 and departed from terminal2
  const filteredAssignments = [
    ...updatedAllAssignments.terminal1.filter(a => a.status === 'departed'),
    ...updatedAllAssignments.terminal2.filter(a => a.status === 'queued')
  ];

  return (
    <div className="bg-blue-400 text-white h-[242rem]">
      <div className="flex justify-between items-center bg-blue-400 mx-[-2rem] mt-[-2rem] px-4 py-6">
        <Image src={van} alt="logo" className='w-52 mr-[-20rem] ml-10 rounded-md' />
        <h1 className="text-5xl font-light uppercase ml-[-15rem]">Markadz Terminal</h1>
        <span className="text-4xl font-extralight uppercase mt-[-3rem] mr-8 font-mono">{currentTime.toUpperCase()}</span>
      </div>

      <section className="mb-8">
        {/* <h2 className="text-3xl font-semibold mb-4 uppercase">Vans Across Terminals</h2> */}
        <table className="min-w-full text-white shadow-md rounded-lg">
          <thead className="bg-transparent border-gray-300 uppercase">
            <tr>
              <th className="py-2 px-4 text-xl font-medium">Order</th>
              <th className="py-2 px-4 text-xl">Plate Number</th>
              <th className="py-2 px-4 text-xl">Queued At</th>
              <th className="py-2 px-4 text-xl">Estimated Departure</th>
              <th className="py-2 px-4 text-xl">Estimated Arrival</th>
              <th className="py-2 px-4 text-xl">Destination</th>
              <th className="py-2 px-4 text-xl">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.map((assignment: any, index: number) => {
              const isDeparted = assignment.status === 'departed';
              const departureTime = new Date(assignment.departureTime).getTime();
              const currentTime = new Date().getTime();
              const timeDifference = currentTime - departureTime;

              if (isDeparted && timeDifference > 15 * 60 * 1000) {
                return null; // Skip rendering this row if departed and more than 1 minute has passed
              }

              return (
                <tr key={assignment.id} className={`${index % 2 === 0 ? 'bg-blue-500' : 'bg-blue-400'} hover:bg-blue-300`}>
                  <td className="py-2 px-4 text-center text-xl uppercase">
                    {assignment.status === 'departed' ? '' : assignment.order}
                  </td>
                  <td className="py-2 px-4 text-center text-xl uppercase">{assignment.VanDriverOperator.Van.plate_number.toUpperCase()}</td>
                  <td className="py-2 px-4 text-center text-xl uppercase font-mono">{assignment.queued_at ? new Date(assignment.queued_at).toLocaleTimeString().toUpperCase() : 'N/A'}</td>
                  <td className="py-2 px-4 text-center text-xl uppercase font-mono">{assignment.estimatedDepartureTime.toUpperCase()}</td>
                  <td className="py-2 px-4 text-center text-xl uppercase font-mono">{assignment.estimatedArrivalTime.toUpperCase()}</td>
                  <td className="py-2 px-4 text-center text-xl uppercase">
                    {assignment.status === 'queued' && assignment.terminal === 'terminal2'
                      ? 'GENSAN TERMINAL'
                      : getDestination(assignment.terminal).toUpperCase()}
                  </td>
                  <td className="py-2 px-4 text-center text-xl">
                    <span className={`px-2 py-2 rounded ${assignment.status === 'queued' ? 'bg-emerald-500 text-white' : assignment.status === 'departed' ? 'bg-rose-500 text-white' : 'bg-ye text-white'}`}>
                      {assignment.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Terminal1;