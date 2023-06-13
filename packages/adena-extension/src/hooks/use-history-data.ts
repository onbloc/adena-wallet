import { CommonState } from '@states/index';
import { useLocation } from 'react-router-dom';
import { useRecoilState } from 'recoil';

const useHistoryData = <T>() => {
  const location = useLocation();
  const [historyState, setHistoryState] = useRecoilState(CommonState.historyState);

  function getLocationPath() {
    return location.pathname;
  }

  function getHistoryData() {
    const data = historyState[getLocationPath()];
    if (data) {
      return data as T;
    }
  }

  function setHistoryDataByPathname(pathname: string, value: T | undefined) {
    const stateDatas = {
      ...historyState,
      [pathname]: value,
    };
    setHistoryState(stateDatas);
  }

  function setHistoryData(value: T | undefined) {
    setHistoryDataByPathname(getLocationPath(), value);
  }

  function clearHistoryData(pathname: string) {
    setHistoryDataByPathname(pathname, undefined);
  }

  return { getHistoryData, setHistoryData, clearHistoryData };
};

export default useHistoryData;
