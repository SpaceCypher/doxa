import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useRef } from 'react';
import { useTelemetry } from '../stores/useTelemetry';
import { getSessionId } from '../utils/session';
import { WS_URL } from '../utils/api';

export default function App({ Component, pageProps }: AppProps) {
  const { setTelemetry, setConnected } = useTelemetry();
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      const sessionId = getSessionId();
      ws = new WebSocket(`${WS_URL}/api/stream/${sessionId}`);
      
      ws.onopen = () => {
        if (!isMounted) return;
        setConnected(true);
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setTelemetry(payload);
        } catch (err) {
          console.error("Failed to parse telemetry", err);
        }
      };
      
      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        // Automatically try to reconnect after 2 seconds if severed
        if (!reconnectTimeout.current) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectTimeout.current = null;
            connect();
          }, 2000);
        }
      };

      ws.onerror = () => {
        if (ws) ws.close(); // Force close to trigger onclose and reconnect
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws) ws.close();
    };
  }, [setTelemetry, setConnected]);

  return <Component {...pageProps} />;
}

