import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import { useTelemetry } from '../stores/useTelemetry';
import { getSessionId } from '../utils/session';
import { WS_URL } from '../utils/api';

export default function App({ Component, pageProps }: AppProps) {
 const { setTelemetry, setConnected } = useTelemetry();

 useEffect(() => {
 const sessionId = getSessionId();
 const ws = new WebSocket(`${WS_URL}/api/stream/${sessionId}`);
 
 ws.onopen = () => {
 setConnected(true);
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
 setConnected(false);
 };

 return () => {
 ws.close();
 };
 }, [setTelemetry, setConnected]);

 return <Component {...pageProps} />;
}

