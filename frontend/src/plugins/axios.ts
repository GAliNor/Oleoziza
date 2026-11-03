// imports
import axios from 'axios';

// variables
export const http = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const isHttpError = axios.isAxiosError;
