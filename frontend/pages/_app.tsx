import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import { useTelemetry } from '../stores/useTelemetry';

export default function App({ Component, pageProps }: AppProps) {
 const { setTelemetry, setConnected } = useTelemetry();

 useEffect(() => {
 const ws = new WebSocket('ws://localhost:8000/api/stream');
 
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

