import { getAuthToken } from '@/lib/indexedDb';

interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, any>;
}

export interface ErrorExtensions {
  classification: String
  errorType: String
}


export interface GraphQLError {
  extensions?: ErrorExtensions;
  message: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

const GRAPHQL_ENDPOINT = process.env.NODE_ENV === 'production'
  ? 'https://api.protocolo.evilsoft.net/graphql'
  : 'http://localhost:8080/graphql';

export async function graphqlFetch<T = any>({
  query,
  variables,
}: GraphQLRequestOptions): Promise<GraphQLResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const token = await getAuthToken();
    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {
    // If IndexedDB is unavailable, continue without auth header
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  return response.json();
}
