import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';

// Import auth service for token management
import { authService } from './authService';

// Helper to get auth headers with valid token
const getAuthHeaders = async () => {
  const token = await authService.getValidToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Generic response type to match Supabase structure
interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
  count?: number;
}

// Query builder to mimic Supabase's query interface
class QueryBuilder<T> {
  private endpoint: string;
  private selectFields: string = '*';
  private filters: string[] = [];
  private orderBy: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  select(fields: string = '*'): QueryBuilder<T> {
    this.selectFields = fields;
    return this;
  }

  eq(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}=${encodeURIComponent(value)}`);
    return this;
  }

  neq(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}[neq]=${encodeURIComponent(value)}`);
    return this;
  }

  gt(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}[gt]=${encodeURIComponent(value)}`);
    return this;
  }

  gte(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}[gte]=${encodeURIComponent(value)}`);
    return this;
  }

  lt(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}[lt]=${encodeURIComponent(value)}`);
    return this;
  }

  lte(column: string, value: any): QueryBuilder<T> {
    this.filters.push(`${column}[lte]=${encodeURIComponent(value)}`);
    return this;
  }

  like(column: string, value: string): QueryBuilder<T> {
    this.filters.push(`${column}[like]=${encodeURIComponent(value)}`);
    return this;
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    this.filters.push(`${column}[in]=${values.map(v => encodeURIComponent(v)).join(',')}`);
    return this;
  }

  is(column: string, value: any): QueryBuilder<T> {
    if (value === null) {
      this.filters.push(`${column}[null]=true`);
    } else {
      this.filters.push(`${column}=${encodeURIComponent(value)}`);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.orderBy.push(`${column}:${direction}`);
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.limitValue = count;
    return this;
  }

  range(from: number, to: number): QueryBuilder<T> {
    this.offsetValue = from;
    this.limitValue = to - from + 1;
    return this;
  }

  // Execute the query
  async execute(): Promise<DatabaseResponse<T[]>> {
    try {
      const params = new URLSearchParams();

      if (this.selectFields !== '*') {
        params.append('select', this.selectFields);
      }

      this.filters.forEach(filter => {
        const [key, value] = filter.split('=');
        params.append(key, value);
      });

      if (this.orderBy.length > 0) {
        params.append('order', this.orderBy.join(','));
      }

      if (this.limitValue) {
        params.append('limit', this.limitValue.toString());
      }

      if (this.offsetValue) {
        params.append('offset', this.offsetValue.toString());
      }

      const url = `${API_BASE_URL}${this.endpoint}?${params.toString()}`;
      const headers = await getAuthHeaders();
      const response = await axios.get(url, { headers });

      if (response.data.success) {
        return {
          data: response.data.data || response.data.items || [],
          error: null,
          count: response.data.total || response.data.count
        };
      } else {
        return {
          data: null,
          error: new Error(response.data.message || 'Query failed')
        };
      }
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.response?.data?.message || error.message || 'Query failed')
      };
    }
  }

  // Execute and return single record
  async single(): Promise<DatabaseResponse<T>> {
    try {
      const result = await this.limit(1).execute();
      if (result.error) {
        return {
          data: null,
          error: result.error
        };
      }

      const data = result.data && result.data.length > 0 ? result.data[0] : null;
      return {
        data,
        error: data ? null : new Error('No data found')
      };
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.message || 'Query failed')
      };
    }
  }

  // Execute and return single record or null (no error if not found)
  async maybeSingle(): Promise<DatabaseResponse<T>> {
    try {
      const result = await this.limit(1).execute();
      if (result.error) {
        return {
          data: null,
          error: result.error
        };
      }

      const data = result.data && result.data.length > 0 ? result.data[0] : null;
      return {
        data,
        error: null
      };
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.message || 'Query failed')
      };
    }
  }
}

// Table operations class to mimic Supabase table interface
class TableOperations<T> {
  private endpoint: string;

  constructor(tableName: string) {
    // Map table names to API endpoints
    const tableEndpointMap: { [key: string]: string } = {
      'users': '/users',
      'organizations': '/organizations',
      'attendance_logs': '/attendance',
      'tasks': '/tasks',
      'projects': '/projects',
      'messages': '/messages',
      'notifications': '/notifications',
      'complaints': '/complaints',
      'daily_logs': '/daily-logs',
      'leaves': '/leaves',
      'holidays': '/holidays',
      'absentees': '/absentees',
      'breaks': '/attendance/breaks',
      'software_complaints': '/complaints',
      'complaint_comments': '/complaints/comments'
    };

    this.endpoint = tableEndpointMap[tableName] || `/${tableName}`;
  }

  // SELECT operations
  select(fields?: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.endpoint).select(fields);
  }

  // INSERT operations
  async insert(data: Partial<T> | Partial<T>[]): Promise<DatabaseResponse<T | T[]>> {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}${this.endpoint}`, data, { headers });

      if (response.data.success) {
        return {
          data: response.data.data || response.data.item || response.data.organization || response.data.user || response.data,
          error: null
        };
      } else {
        return {
          data: null,
          error: new Error(response.data.message || 'Insert failed')
        };
      }
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.response?.data?.message || error.message || 'Insert failed')
      };
    }
  }

  // UPDATE operations
  async update(data: Partial<T>): Promise<DatabaseResponse<T[]>> {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.put(`${API_BASE_URL}${this.endpoint}`, data, { headers });

      if (response.data.success) {
        return {
          data: response.data.data || response.data.items || [],
          error: null
        };
      } else {
        return {
          data: null,
          error: new Error(response.data.message || 'Update failed')
        };
      }
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.response?.data?.message || error.message || 'Update failed')
      };
    }
  }

  // DELETE operations
  async delete(): Promise<DatabaseResponse<T[]>> {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.delete(`${API_BASE_URL}${this.endpoint}`, { headers });

      if (response.data.success) {
        return {
          data: response.data.data || response.data.items || [],
          error: null
        };
      } else {
        return {
          data: null,
          error: new Error(response.data.message || 'Delete failed')
        };
      }
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.response?.data?.message || error.message || 'Delete failed')
      };
    }
  }

  // UPSERT operations
  async upsert(data: Partial<T> | Partial<T>[]): Promise<DatabaseResponse<T | T[]>> {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.patch(`${API_BASE_URL}${this.endpoint}`, data, { headers });

      if (response.data.success) {
        return {
          data: response.data.data || response.data.item || response.data,
          error: null
        };
      } else {
        return {
          data: null,
          error: new Error(response.data.message || 'Upsert failed')
        };
      }
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.response?.data?.message || error.message || 'Upsert failed')
      };
    }
  }
}

// Main database service class to replace Supabase client
class DatabaseService {
  // Method to get table operations (replaces supabase.from())
  from<T = any>(tableName: string): TableOperations<T> {
    return new TableOperations<T>(tableName);
  }

  // RPC calls for stored procedures
  async rpc<T = any>(functionName: string, params?: any): Promise<DatabaseResponse<T>> {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/rpc/${functionName}`, params, { headers });

      if (response.data.success) {
        return {
          data: response.data.data || response.data.result,
          error: null
        };
      } else {
        return {
          data: null,
          error: new Error(response.data.message || 'RPC call failed')
        };
      }
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.response?.data?.message || error.message || 'RPC call failed')
      };
    }
  }
}

// Create and export the database service instance
export const databaseService = new DatabaseService();

// Export types for use in components
export type { DatabaseResponse, QueryBuilder, TableOperations };