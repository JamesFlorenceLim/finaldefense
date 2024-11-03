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

        const initialSelectedVanDriverOperator = vanDriverOperatorsData.reduce((acc: { [key: string]: boolean }, vdo: VanDriverOperator) => {
          acc[vdo.id] = false;
          return acc;
        }, {});
        setSelectedVanDriverOperator(initialSelectedVanDriverOperator);

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
    setErrorMessage(null);
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
    
    <div className="flex justify-center items-center ">
      
      <div className="">
      <div className="p-4 sm:p-6 lg:p-8 " style={{marginLeft:'-6rem',marginTop:'-2rem'}}>
          <h2 className="text-2xl font-normal text-gray-600 ">Schedule Overview</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage and review all created schedules or add new ones to the system</p> 
        </div>

        <div className="flex justify-end mt-[-6rem] mr-[-18rem]">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 mr-2"
            onClick={() => setShowCreateModal(true)}
          >
            Create Schedule
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
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
  <div className="flex justify-between items-center mb-10 mt-[4rem]">
    {/* <h2 className="text-2xl font-bold">Scheduled Times</h2> */}
    <p className="text-lg font-semibold text-center ml-[30rem]">
      <span className="text-3xl font-bold text-gray-800">
        {new Date(terminal1Assignments[0]?.date || terminal2Assignments[0]?.date).toLocaleDateString('en-US', {
          weekday: 'long',
        })}
      </span>
      <br />
      <span className="text-gray-500">
        {new Date(terminal1Assignments[0]?.date || terminal2Assignments[0]?.date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </span>
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="col-span-1 md:col-span-1">
      <h3 className="text-2xl font-bold text-gray-800 mb-10 ml-12 mt-[-2rem]">Gensan Terminal</h3>
      {terminal1Assignments.map((schedule) => (
        <div key={schedule.id} className="flex items-start mb-4">
          <div className="pr-4 border-r-2 h-32 border-blue-500">
            <p className='text-gray-500'>08:00 AM - 5:00 PM</p>
          </div>
          <div className="pl-4 rounded-lg flex-1">
            <p><strong>Assignments:</strong></p>
            {renderAssignments((schedule.assignments ?? []).filter(assignment => assignment.terminal === 'terminal1'))}
          </div>
        </div>
      ))}
    </div>

    <div className="col-span-1 md:col-span-1 right-44 absolute ">
      <h3 className="text-2xl font-bold text-gray-800 mb-10 ml-12 mt-[-2rem]" >Palimbang Terminal</h3>
      {terminal2Assignments.map((schedule) => (
        <div key={schedule.id} className="flex items-start mb-4">
          <div className="pr-4 border-r-2 h-32 border-green-500">
            <p className='text-gray-500'>08:00 AM - 5:00 PM</p>
          </div>
          <div className="pl-4 rounded-lg flex-1">
            <p><strong>Assignments:</strong></p>
            {renderAssignments((schedule.assignments ?? []).filter(assignment => assignment.terminal === 'terminal2'))}
          </div>
        </div>
      ))}
    </div>
  </div>

</div>

        {showCreateModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full ml-32">
              <h2 className="text-3xl font-semibold mb-6 text-gray-800">Create Schedule</h2>
              <form onSubmit={handleCreateSubmit}>
              <div className="mb-6">
                <label htmlFor="date" className="block text-gray-700 font-medium mb-2">Date</label>
                <input type="date" id="date" name="date" className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue={getCurrentDate()} required />
              </div>
              <div className="mb-6">
                <label htmlFor="startTime" className="block text-gray-700 font-medium mb-2">Start Time</label>
                <input type="time" id="startTime" name="startTime" className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="08:00" required />
              </div>
              <div className="mb-6">
                <label htmlFor="endTime" className="block text-gray-700 font-medium mb-2">End Time</label>
                <input type="time" id="endTime" name="endTime" className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="17:00" required />
              </div>
              <div className="flex justify-end space-x-4">
                <button type="submit" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300">Create</button>
                <button
                type="button"
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition duration-300"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl max-h-[90vh] w-full overflow-y-auto ml-44">
          <h2 className="text-2xl font-bold mb-4">Assign Schedule</h2>
          <form onSubmit={handleAssignSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="w-full">
                <label htmlFor="schedule" className="block text-black font-bold mb-2">Schedule</label>
                <select
                  id="schedule"
                  value={selectedSchedule}
                  onChange={(e) => setSelectedSchedule(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {new Date(schedule.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full">
                <label htmlFor="terminal" className="block text-black font-bold mb-2">Terminal</label>
                <select
                  id="terminal"
                  value={selectedTerminal}
                  onChange={(e) => setSelectedTerminal(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="terminal1">Gensan Terminal</option>
                  <option value="terminal2">Palimbang Terminal</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-black font-bold mb-2">Select Vans</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vanDriverOperators.slice(0, 5).map((vdo) => (
                  <div key={vdo.id} className="w-full mb-4">
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
                        className="w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {vanDriverOperators.slice(5).map((vdo) => (
                  <div key={vdo.id} className="w-full mb-4">
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
                        className="w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300">Assign</button>
              <button
                type="button"
                className="ml-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300"
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