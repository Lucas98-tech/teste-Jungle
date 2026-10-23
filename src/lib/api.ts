import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
export const api = axios.create({ baseURL: "/api", timeout: 5000 });
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (count, error) =>
        count < 1 &&
        (!axios.isAxiosError(error) ||
          !error.response ||
          error.response.status >= 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
export const message = (error: unknown) =>
  axios.isAxiosError(error)
    ? error.response?.data?.message || "Falha de conexão. Tente novamente."
    : error instanceof Error
      ? error.message
      : "Não foi possível concluir.";
export async function get<T>(path: string, signal?: AbortSignal) {
  return (await api.get<T>(path, { signal })).data;
}
