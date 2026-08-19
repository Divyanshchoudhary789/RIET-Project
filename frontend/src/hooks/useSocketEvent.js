import { useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';

/**
 * useSocketEvent — subscribes to a socket event and calls `handler` when it fires.
 *
 * Handles the race condition where the socket may not yet be connected when
 * the component mounts: we retry registration on an interval until the socket
 * is available, then stop.
 *
 * @param {string}   event    - Socket event name, e.g. 'dashboard:refresh'
 * @param {Function} handler  - Callback invoked with the event payload
 * @param {Array}    [deps]   - Extra dependencies that should re-register the handler
 */
const useSocketEvent = (event, handler, deps = []) => {
  // Keep a stable ref to the latest handler so we don't need to re-register
  // the listener every render — only when deps change.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    let socket = getSocket();
    let intervalId = null;

    const stableHandler = (...args) => handlerRef.current(...args);

    const register = () => {
      socket = getSocket();
      if (!socket) return; // not yet connected — retry via interval

      socket.on(event, stableHandler);

      // Clear the polling interval once we successfully registered
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Try immediately, then poll every 500 ms until socket is ready
    register();
    if (!getSocket()) {
      intervalId = setInterval(register, 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      const s = getSocket();
      if (s) s.off(event, stableHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
};

export default useSocketEvent;
