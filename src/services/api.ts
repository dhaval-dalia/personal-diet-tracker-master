// src/services/api.ts
// This file provides a centralized service for making general API calls
// to your backend or external services, distinct from n8n-specific webhooks.
// It can be extended to handle various HTTP methods and authentication.

/**
 * Generic function for making GET requests.
 * @param url - The URL to fetch data from.
 * @param token - Optional authentication token (e.g., JWT).
 * @returns A promise that resolves with the JSON response data.
 * @throws An error if the network request fails or the response is not OK.
 */
export const get = async <T>(url: string, token?: string): Promise<T> => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
  
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorBody.message || `HTTP error! Status: ${response.status}`);
      }
  
      return response.json();
    } catch (error: any) {
      console.error(`Error fetching from ${url}:`, error);
      throw error;
    }
  };
  
  /**
   * Generic function for making POST requests.
   * @param url - The URL to send data to.
   * @param data - The data payload to send (will be JSON.stringified).
   * @param token - Optional authentication token.
   * @returns A promise that resolves with the JSON response data.
   * @throws An error if the network request fails or the response is not OK.
   */
  export const post = async <T>(url: string, data: any, token?: string): Promise<T> => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
  
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorBody.message || `HTTP error! Status: ${response.status}`);
      }
  
      return response.json();
    } catch (error: any) {
      console.error(`Error posting to ${url}:`, error);
      throw error;
    }
  };
  
  /**
   * Generic function for making PUT requests.
   * @param url - The URL to send data to.
   * @param data - The data payload to send (will be JSON.stringified).
   * @param token - Optional authentication token.
   * @returns A promise that resolves with the JSON response data.
   * @throws An error if the network request fails or the response is not OK.
   */
  export const put = async <T>(url: string, data: any, token?: string): Promise<T> => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
  
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorBody.message || `HTTP error! Status: ${response.status}`);
      }
  
      return response.json();
    } catch (error: any) {
      console.error(`Error putting to ${url}:`, error);
      throw error;
    }
  };
  
  /**
   * Generic function for making DELETE requests.
   * @param url - The URL to delete from.
   * @param token - Optional authentication token.
   * @returns A promise that resolves when the delete operation is successful.
   * @throws An error if the network request fails or the response is not OK.
   */
  export const del = async (url: string, token?: string): Promise<void> => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
  
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorBody.message || `HTTP error! Status: ${response.status}`);
      }
    } catch (error: any) {
      console.error(`Error deleting from ${url}:`, error);
      throw error;
    }
  };
  