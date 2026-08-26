import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(setState);
    void NetInfo.fetch().then(setState);
    return unsubscribe;
  }, []);

  if (!state) {
    return { isOnline: true, isOffline: false, type: null, isInternetReachable: null };
  }

  return {
    isOnline: state.isConnected ?? false,
    isOffline: !(state.isConnected ?? false),
    type: state.type,
    isInternetReachable: state.isInternetReachable ?? null,
  };
}
