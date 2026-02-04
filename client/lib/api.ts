import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:4000/api',
});

// Auth Interceptor
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error logging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[API Error]', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export const login = async (data: any) => (await api.post('/auth/login', data)).data;
export const register = async (data: any) => (await api.post('/auth/register', data)).data;
export const requestOtp = async (data: any) => (await api.post('/auth/request-otp', data)).data;
export const verifyOtp = async (data: any) => (await api.post('/auth/verify-otp', data)).data;

export const getEvents = async () => (await api.get('/events')).data;
export const getEvent = async (id: string) => (await api.get(`/events/${id}`)).data;
export const createEvent = async (data: any) => (await api.post('/events', data)).data;
export const addParticipant = async (eventId: string, data: any) => (await api.post(`/events/${eventId}/participants`, data)).data;
export const fundPool = async (eventId: string, data: any) => (await api.post(`/events/${eventId}/fund`, data)).data;
export const createPayment = async (data: any) => (await api.post('/payments/create', data)).data;
export const confirmPayment = async (data: any) => (await api.post('/payments/confirm', data)).data;
export const addExpense = async (eventId: string, data: any) => (await api.post(`/events/${eventId}/expenses`, data)).data;
export const getSettlement = async (eventId: string) => (await api.get(`/events/${eventId}/settle`)).data;
export const executeRefunds = async (eventId: string) => (await api.post(`/events/${eventId}/settle/refund`)).data;

export default api;
