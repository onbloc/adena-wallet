import { CommonState } from '@states/index';
import { useLocation } from 'react-router-dom';
import { useRecoilState } from 'recoil';

export type UstHistoryDataReturn<T> = {
  getHistoryData: () => T | undefined;
  setHistoryData: (value: T | undefined) => void;
  clearHistoryData: (pathname: string) => void;
};

const useHistoryData = <T>(): UstHistoryDataReturn<T> => {
  const location = useLocation();
  const [historyState, setHistoryState] = useRecoilState(CommonState.historyState);

  function getLocationPath(): string {
    return location.pathname;
  }

  function getHistoryData(): T | undefined {
    const data = historyState[getLocationPath()];
    if (data) {
      return data as T;
    }
  }

  function setHistoryDataByPathname(pathname: string, value: T | undefined): void {
    const stateDatas = {
      ...historyState,
      [pathname]: value,
    };
    setHistoryState(stateDatas);
  }

  function setHistoryData(value: T | undefined): void {
    setHistoryDataByPathname(getLocationPath(), value);
  }

  function clearHistoryData(pathname: string): void {
    setHistoryDataByPathname(pathname, undefined);
  }

  return { getHistoryData, setHistoryData, clearHistoryData };
};

export default useHistoryData;
