"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal'; // Import the Modal component
import sendSMS from '../../../app/semaphoreClient'; // Import the sendSMS function

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

      // Calculate estimated departure time (30 minutes from now + 30 minutes for each subsequent van)
      const estimatedDepartureTime = new Date(new Date().getTime() + nextOrder * 30 * 60 * 1000).toISOString();

      // Calculate estimated arrival time (3 hours from departure time)
      const estimatedArrivalTime = new Date(new Date(estimatedDepartureTime).getTime() + 3 * 60 * 60 * 1000).toISOString();

      // Update status to queued with the new order, queuedAt time, estimated departure, and arrival times
      await updateAssignment(id, 'queued', currentTerminal, nextOrder, estimatedArrivalTime, estimatedDepartureTime, queuedAt);

      // Send SMS to the driver
      const assignment = assignmentsData.find((assignment: any) => assignment.id === id);
      const driverPhoneNumber = assignment.VanDriverOperator.Driver.contact;
      const message = `Your van is queued. Estimated departure time: ${new Date(estimatedDepartureTime).toLocaleTimeString()}`;
      await sendSMS(driverPhoneNumber, message);
      console.log(`SMS sent to ${driverPhoneNumber}: ${message}`);
    } else if (newStatus === 'departed') {
      const assignmentsData = await fetchAssignments('queued', currentTerminal);
      const firstInQueueId = assignmentsData.length > 0 ? assignmentsData[0].id : null;

      if (id !== firstInQueueId) {
        // Force depart logic
        await updateAssignment(id, 'departed', currentTerminal, undefined, undefined, currentTime);

        // Recalculate times for the remaining vans in the queue
        const remainingAssignments = assignmentsData.filter((assignment: any) => assignment.id !== id);
        for (let i = 0; i < remainingAssignments.length; i++) {
          const assignment = remainingAssignments[i];
          const departureTime = new Date(new Date().getTime() + (i + 1) * 30 * 60 * 1000).toISOString();
          const arrivalTime = new Date(new Date(departureTime).getTime() + 3 * 60 * 60 * 1000).toISOString();
          await updateAssignment(assignment.id, 'queued', currentTerminal, assignment.queue_order, arrivalTime, departureTime, assignment.queued_at);
        }
      } else {
        // Change status to departed
        await updateAssignment(id, 'departed', currentTerminal, undefined, undefined, currentTime);

        // Calculate estimated arrival time (3 hours from now)
        const estimatedArrivalTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString();

        // Recalculate times for the remaining vans in the queue
        const remainingAssignments = assignmentsData.slice(1);
        for (let i = 0; i < remainingAssignments.length; i++) {
          const assignment = remainingAssignments[i];
          const departureTime = new Date(new Date().getTime() + (i + 1) * 30 * 60 * 1000).toISOString();
          const arrivalTime = new Date(new Date(departureTime).getTime() + 3 * 60 * 60 * 1000).toISOString();
          await updateAssignment(assignment.id, 'queued', currentTerminal, assignment.queue_order, arrivalTime, departureTime, assignment.queued_at);
        }
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
      // Fetch current queued assignments to determine the starting order
      const currentQueuedAssignments = await fetchAssignments('queued', currentTerminal);
      const startingOrder = currentQueuedAssignments.length;
  
      for (let i = 0; i < selectedIdleAssignments.length; i++) {
        const id = selectedIdleAssignments[i];
        const nextOrder = startingOrder + i + 1; // Calculate the next order number
        const queuedAt = new Date().toISOString(); // Store the queued at time in ISO format
  
        // Calculate estimated departure time (30 minutes from now + 30 minutes for each subsequent van)
        const estimatedDepartureTime = new Date(new Date().getTime() + nextOrder * 30 * 60 * 1000).toISOString();
  
        // Calculate estimated arrival time (3 hours from departure time)
        const estimatedArrivalTime = new Date(new Date(estimatedDepartureTime).getTime() + 3 * 60 * 60 * 1000).toISOString();
  
        await updateAssignment(id, 'queued', currentTerminal, nextOrder, estimatedArrivalTime, estimatedDepartureTime, queuedAt);
        // Send SMS to the driver
        const assignment = idleAssignments.find((assignment: any) => assignment.id === id);
        const driverPhoneNumber = assignment.VanDriverOperator.Driver.contact;
        const message = `Your van is queued. Estimated departure time: ${new Date(estimatedDepartureTime).toLocaleTimeString()}`;
        await sendSMS(driverPhoneNumber, message);
        console.log(`SMS sent to ${driverPhoneNumber}: ${message}`);
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
    const currentTerminal = 'terminal1';
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
  const updatedAllAssignments = calculateEstimatedTimes(allAssignments);

  return (
    <div className="p-6">
      <div className="flex justify-end">
        
      </div>
      
      <div className="text-center mb-6 ml-[-60rem]">
        <span className="text-xl font-semibold text-gray-700">Current Time: {currentTime}</span>
      </div>
      <button
          className="mt-[-4rem] absolute right-16 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={() => setIsModalOpen(true)}
        >
          INCOMING / DEPARTED VANS
        </button>
      <section className="mb-8 border-2 border-dashed border-gray-400 rounded-lg p-4">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Vans</h2>


        

        <button
          className="mt-[-2rem] absolute right-16  bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={handleQueueAll}
          disabled={selectedIdleAssignments.length === 0}
        >
          QUEUE
        </button>

        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
        <tr className='text-left'>
          <th className="py-2 px-4 border-b uppercase">Driver</th>
          <th className="py-2 px-4 border-b uppercase">Plate Number</th>
          <th className="py-2 px-4 border-b uppercase">Select</th>
        </tr>
          </thead>
          <tbody>
        {idleAssignments.map((assignment: any) => (
          <tr key={assignment.id}>
            <td className="py-2 px-4 border-b uppercase">{assignment.VanDriverOperator.Driver.firstname} {assignment.VanDriverOperator.Driver.lastname}</td>
            <td className="py-2 px-4 border-b uppercase">{assignment.VanDriverOperator.Van.plate_number}</td>
            <td className="py-2 px-4 border-b text-left">
          <input
            type="checkbox"
            checked={selectedIdleAssignments.includes(assignment.id)}
            onChange={() => handleCheckboxChange(assignment.id)}
          />
            </td>
          </tr>
        ))}
          </tbody>
        </table>
        
      </section>
      
      <section className="mb-8 border-2">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Queued Vans</h2>
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b uppercase">Date</th>
              <th className="py-2 px-4 border-b uppercase">Plate Number</th>
              <th className="py-2 px-4 border-b uppercase">Queued At</th>
              <th className="py-2 px-4 border-b uppercase">Est. Departure Time</th>
              <th className="py-2 px-4 border-b uppercase">Est. Arrival Time</th>
              <th className="py-2 px-4 border-b uppercase">Actions</th>
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

      

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">INCOMING VANS</h2>
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">DRIVER</th>
              <th className="py-2 px-4 border-b">PLATE NUMBER</th>
              <th className="py-2 px-4 border-b">TERMINAL</th>
              <th className="py-2 px-4 border-b">DEPARTED AT</th>
              <th className="py-2 px-4 border-b">ESTIMATED ARRIVAL</th>
              <th className="py-2 px-4 border-b">ARRIVED AT</th>
              <th className="py-2 px-4 border-b">STATUS</th>
              <th className="py-2 px-4 border-b">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {updatedAllAssignments
              .filter((assignment: any) => assignment.status === 'departed' && assignment.terminal === 'terminal2')
              .map((assignment: any) => {
          const canArrive = new Date().getTime() >= new Date(assignment.departureTime).getTime() + 1 * 60 * 1000;
          return (
            <tr key={assignment.id}>
          <td className="py-2 px-4 border-b">{assignment.VanDriverOperator.Driver.firstname.toUpperCase()} {assignment.VanDriverOperator.Driver.lastname.toUpperCase()}</td>
          <td className="py-2 px-4 border-b">{assignment.VanDriverOperator.Van.plate_number.toUpperCase()}</td> 
          <td className="py-2 px-4 border-b">{getDestination(assignment.terminal).toUpperCase()}</td>
          <td className="py-2 px-4 border-b">{assignment.departureTime ? new Date(assignment.departureTime).toLocaleTimeString().toUpperCase() : 'N/A'}</td>
          <td className="py-2 px-4 border-b">{assignment.estimatedArrivalTime.toUpperCase()}</td>
          <td className="py-2 px-4 border-b">{assignment.arrivalTime ? new Date(assignment.arrivalTime).toLocaleTimeString().toUpperCase() : 'N/A'}</td>
          <td className="py-2 px-4 border-b">ARRIVING</td>
          <td className="py-2 px-4 border-b">
          {assignment.status === 'departed' && assignment.terminal === 'terminal1' && canArrive && (
            <button
              className={`bg-green-500 text-white px-3 py-1 rounded-lg `}
              onClick={() => handleConfirmArrival(assignment.id)}
              
            >
              ARRIVED
            </button>
          )}
              </td>
            </tr>
          );
              })}
          </tbody>
        </table>
      <br />
      <br />
      <br />
      <br />
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">DEPARTED VANS</h2>
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">DRIVER</th>
              <th className="py-2 px-4 border-b">PLATE NUMBER</th>
              <th className="py-2 px-4 border-b">TERMINAL</th>
              <th className="py-2 px-4 border-b">DEPARTED AT</th>
              <th className="py-2 px-4 border-b">ESTIMATED ARRIVAL</th>
              <th className="py-2 px-4 border-b">ARRIVED AT</th>
              <th className="py-2 px-4 border-b">STATUS</th>
              
            </tr>
          </thead>
          <tbody>
            {updatedAllAssignments
              .filter((assignment: any) => assignment.status === 'departed' && assignment.terminal === 'terminal1')
              .map((assignment: any) => {
          return (
            <tr key={assignment.id}>
                <td className="py-2 px-4 border-b">{assignment.VanDriverOperator.Driver.firstname.toUpperCase()} {assignment.VanDriverOperator.Driver.lastname.toUpperCase()}</td>
                <td className="py-2 px-4 border-b">{assignment.VanDriverOperator.Van.plate_number.toUpperCase()}</td> 
                <td className="py-2 px-4 border-b">{getDestination(assignment.terminal).toUpperCase()}</td>
                <td className="py-2 px-4 border-b">{assignment.departureTime ? new Date(assignment.departureTime).toLocaleTimeString().toUpperCase() : 'N/A'}</td>
                <td className="py-2 px-4 border-b">{assignment.estimatedArrivalTime.toUpperCase()}</td>
                <td className="py-2 px-4 border-b">{assignment.arrivalTime ? new Date(assignment.arrivalTime).toLocaleTimeString().toUpperCase() : 'N/A'}</td>
                <td className="py-2 px-4 border-b">DEPARTED</td>
                
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