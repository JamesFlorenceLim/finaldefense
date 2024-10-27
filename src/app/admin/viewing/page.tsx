"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';

interface VanDriverOperator {
  id: string;
  Van: { plate_number: string };
}

interface Driver {
  id: string;
  firstname: string;
  lastname: string;
}

interface Schedule {
  id: string;
  date: string;
  assignments?: any[];
}

export default function Assign() {
  const [vanDriverOperators, setVanDriverOperators] = useState<VanDriverOperator[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedVanDriverOperator, setSelectedVanDriverOperator] = useState<{ [key: string]: boolean }>({});
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState('terminal1');
  const [temporaryDrivers, setTemporaryDrivers] = useState<{ [key: string]: string | null }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [vanDriverOperatorsRes, driversRes, schedulesRes] = await Promise.all([
          axios.get('/api/vandriveroperators'),
          axios.get('/api/drivers'),
          axios.get('/api/schedule'),
        ]);

        const vanDriverOperatorsData = vanDriverOperatorsRes.data;
        const driversData = driversRes.data;
        const schedulesData = schedulesRes.data;

        console.log('Fetched van driver operators:', vanDriverOperatorsData);
        console.log('Fetched drivers:', driversData);
        console.log('Fetched schedules:', schedulesData);

        setVanDriverOperators(vanDriverOperatorsData);
        setDrivers(driversData);
        setSchedules(schedulesData);

        // Initialize selectedVanDriverOperator state
        const initialSelectedVanDriverOperator = vanDriverOperatorsData.reduce((acc: { [key: string]: boolean }, vdo: VanDriverOperator) => {
          acc[vdo.id] = false;
          return acc;
        }, {});
        setSelectedVanDriverOperator(initialSelectedVanDriverOperator);

        // Set the default date to the latest schedule created
        if (schedulesData.length > 0) {
          const latestSchedule = schedulesData[schedulesData.length - 1];
          setSelectedSchedule(latestSchedule.id);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }
    fetchData();
  }, []);

  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null); // Reset error message
    try {
      const selectedVdoIds = Object.keys(selectedVanDriverOperator).filter(id => selectedVanDriverOperator[id]);
      console.log('Selected Van Driver Operator IDs:', selectedVdoIds);
      console.log('Selected Schedule ID:', selectedSchedule);
      console.log('Selected Terminal:', selectedTerminal);
      console.log('Temporary Drivers:', temporaryDrivers);

      const selectedScheduleData = schedules.find(schedule => schedule.id === selectedSchedule);
      if (!selectedScheduleData) {
        alert('Selected schedule not found.');
        return;
      }

      const existingAssignments = selectedScheduleData.assignments || [];
      const duplicateAssignments = selectedVdoIds.filter(vdoId =>
        existingAssignments.some(assignment => assignment.VanDriverOperator.id === vdoId)
      );

      if (duplicateAssignments.length > 0) {
        alert('Some van driver operators are already assigned to this schedule.');
        return;
      }

      // Check for duplicate assignments across terminals on the same day
      const duplicateAcrossTerminals = selectedVdoIds.filter(vdoId =>
        schedules.some(schedule =>
          new Date(schedule.date).setHours(0, 0, 0, 0) === new Date(selectedScheduleData.date).setHours(0, 0, 0, 0) &&
          schedule.assignments?.some(assignment => assignment.VanDriverOperator.id === vdoId)
        )
      );

      if (duplicateAcrossTerminals.length > 0) {
        alert('Some van driver operators are already assigned to another terminal on this day.');
        return;
      }

      const response = await axios.post('/api/vandriveroperators', {
        vanDriverOperatorIds: selectedVdoIds,
        scheduleId: selectedSchedule,
        terminal: selectedTerminal,
        temporaryDrivers,
      });

      const newAssignments = response.data;
      setSchedules(schedules.map(schedule =>
        schedule.id === selectedSchedule ? { ...schedule, assignments: [...(schedule.assignments || []), ...newAssignments] } : schedule
      ));
      setShowAssignModal(false);
      alert('Assignment created successfully');
    } catch (error) {
      console.error('Failed to create assignment:', error);
      setErrorMessage('Failed to create assignment');
    }
  };

  const handleRemoveSchedule = async (id: string) => {
    try {
      await axios.delete(`/api/schedule/${id}`);
      setSchedules(schedules.filter(schedule => schedule.id !== id));
      alert('Schedule removed successfully');
    } catch (error) {
      console.error('Failed to remove schedule:', error);
      alert('Failed to remove schedule');
    }
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;

    try {
      const response = await axios.post('/api/schedule', {
        date,
        startTime,
        endTime,
      });

      const newSchedule = response.data;
      setSchedules([...schedules, newSchedule]);
      setShowCreateModal(false);
      alert('Schedule created successfully');
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule');
    }
  };

  const renderAssignments = (assignments: any[]) => {
    return (
      <ul>
        {assignments.map((assignment) => (
          <li key={assignment.id}>
            {assignment.VanDriverOperator?.Van?.plate_number || 'No Plate Number'}: 
            {assignment.Driver ? `${assignment.Driver.firstname} ${assignment.Driver.lastname} (Temporary)` : `${assignment.VanDriverOperator?.Driver?.firstname} ${assignment.VanDriverOperator?.Driver?.lastname}`}
          </li>
        ))}
      </ul>
    );
  };

  const today = new Date().setHours(0, 0, 0, 0);
  const futureSchedules = schedules.filter(schedule => new Date(schedule.date).setHours(0, 0, 0, 0) >= today);

  const terminal1Assignments = futureSchedules.filter(schedule => schedule.assignments && schedule.assignments.some(assignment => assignment.terminal === 'terminal1'));
  const terminal2Assignments = futureSchedules.filter(schedule => schedule.assignments && schedule.assignments.some(assignment => assignment.terminal === 'terminal2'));

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-lg w-full max-w-3xl">
        <div className="flex justify-end mb-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mr-2"
            onClick={() => setShowCreateModal(true)}
          >
            Create Schedule
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            onClick={() => setShowAssignModal(true)}
          >
            Assign Schedule
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 text-red-500">
            {errorMessage}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Scheduled Times</h2>
          <div className="flex flex-wrap gap-4">
            <div className="w-full">
              <h3 className="text-lg font-semibold mb-2">Terminal 1</h3>
              {terminal1Assignments.map((schedule) => (
                <div key={schedule.id} className="p-4 bg-gray-100 rounded-lg shadow mb-4">
                  <p><strong>Date:</strong> {new Date(schedule.date).toLocaleDateString()} </p>
                  <p><strong>Assignments:</strong></p>
                  {renderAssignments(schedule.assignments.filter(assignment => assignment.terminal === 'terminal1'))}
                </div>
              ))}
            </div>
            <div className="w-full">
              <h3 className="text-lg font-semibold mb-2">Terminal 2</h3>
              {terminal2Assignments.map((schedule) => (
                <div key={schedule.id} className="p-4 bg-gray-100 rounded-lg shadow mb-4">
                  <p><strong>Date:</strong> {new Date(schedule.date).toLocaleDateString()} </p>
                  <p><strong>Assignments:</strong></p>
                  {renderAssignments(schedule.assignments.filter(assignment => assignment.terminal === 'terminal2'))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Create Schedule</h2>
              <form onSubmit={handleCreateSubmit}>
                <div className="mb-4">
                  <label htmlFor="date" className="block text-gray-700">Date</label>
                  <input type="date" id="date" name="date" className="w-full border rounded-lg p-2" defaultValue={getCurrentDate()} required />
                </div>
                <div className="mb-4">
                  <label htmlFor="startTime" className="block text-gray-700">Start Time</label>
                  <input type="time" id="startTime" name="startTime" className="w-full border rounded-lg p-2" defaultValue="08:00" required />
                </div>
                <div className="mb-4">
                  <label htmlFor="endTime" className="block text-gray-700">End Time</label>
                  <input type="time" id="endTime" name="endTime" className="w-full border rounded-lg p-2" defaultValue="17:00" required />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg">Create</button>
                  <button
                    type="button"
                    className="ml-2 bg-red-500 text-white px-4 py-2 rounded-lg"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAssignModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Assign Schedule</h2>
              <form onSubmit={handleAssignSubmit}>
                <div className="mb-4">
                  <label htmlFor="schedule" className="block text-gray-700">Schedule</label>
                  <select
                    id="schedule"
                    value={selectedSchedule}
                    onChange={(e) => setSelectedSchedule(e.target.value)}
                    className="w-full border rounded-lg p-2"
                    required
                  >
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.date}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="terminal" className="block text-gray-700">Terminal</label>
                  <select
                    id="terminal"
                    value={selectedTerminal}
                    onChange={(e) => setSelectedTerminal(e.target.value)}
                    className="w-full border rounded-lg p-2"
                    required
                  >
                    <option value="terminal1">Terminal 1</option>
                    <option value="terminal2">Terminal 2</option>
                  </select>
                </div>
                {vanDriverOperators.map((vdo) => (
                  <div key={vdo.id} className="mb-4">
                    <label className="block text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedVanDriverOperator[vdo.id] || false}
                        onChange={(e) => setSelectedVanDriverOperator({ ...selectedVanDriverOperator, [vdo.id]: e.target.checked })}
                        className="mr-2"
                      />
                      {vdo.Van?.plate_number || 'No Plate Number'}
                    </label>
                    {selectedVanDriverOperator[vdo.id] && (
                      <select
                        value={temporaryDrivers[vdo.id] || ''}
                        onChange={(e) => setTemporaryDrivers({ ...temporaryDrivers, [vdo.id]: e.target.value || null })}
                        className="w-full border rounded-lg p-2 mt-2"
                      >
                        <option value="">Select Temporary Driver</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.firstname} {driver.lastname}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
                <div className="flex justify-end">  
                  <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg">Assign</button>
                  <button
                    type="button"
                    className="ml-2 bg-red-500 text-white px-4 py-2 rounded-lg"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}