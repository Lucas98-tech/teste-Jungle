import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { get, api, queryClient } from "./api";
import type { User, MarketEvent } from "./contracts";
const Context = createContext<{
  user: User | null | undefined;
  loading: boolean;
}>({ user: undefined, loading: true });
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: ({ signal }) => get<User | null>("/session", signal),
    retry: false,
    refetchInterval: 30_000,
  });
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (r) => r,
      (error) => {
        if (
          error.response?.status === 401 &&
          !error.config.url?.startsWith("/session")
        ) {
          queryClient.removeQueries({
            predicate: (q) => q.queryKey[0] !== "session",
          });
          queryClient.setQueryData(["session"], null);
        }
        return Promise.reject(error);
      },
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);
  useEffect(() => {
    const socket = io("wss://jungle.mock", {
      transports: ["websocket"],
      reconnection: true,
    });
    const versions = new Map<string, number>();
    const reconcile = () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== "session",
      });
    const onEvent = (event: MarketEvent) => {
      if (event.userId && event.userId !== session.data?.id) return;
      const key = `${event.userId || "public"}:${event.resourceId}`;
      if ((versions.get(key) || 0) >= event.version) return;
      versions.set(key, event.version);
      void reconcile();
      window.dispatchEvent(
        new CustomEvent("market-notice", {
          detail: event.userId
            ? "Status do pedido atualizado."
            : "Preço ou disponibilidade atualizados. Revise sua cotação.",
        }),
      );
    };
    socket.on("connect", reconcile);
    socket.on("nft.updated", onEvent);
    socket.on("order.updated", onEvent);
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [session.data?.id]);
  return (
    <Context.Provider
      value={{ user: session.data, loading: session.isPending }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
