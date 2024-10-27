import axios from 'axios';

const sendSMS = async (phoneNumber: string, message: string) => {
  try {
    const response = await axios.post('/api/sendSMS', {
      phoneNumber,
      message
    });

    return response.data;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

export default sendSMS;