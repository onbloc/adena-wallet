import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  formatUSD,
  formatUSDChange,
  getChangeTone,
  PortfolioValue,
} from '@common/utils/price-utils';
import { TokenChangeRate } from '@components/molecules';
import { MainTotalPriceSkeleton, MainTotalPriceWrapper } from './main-total-price.styles';

export interface MainTotalPriceProps {
  value: PortfolioValue;
  loading?: boolean;
}

/** Total USD value with the 24h delta beneath it. */
const MainTotalPrice: React.FC<MainTotalPriceProps> = ({ value, loading = false }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);

  const totalText = formatUSD(value.totalUSDValue);
  const tone = getChangeTone(value.changeRate);

  useLayoutEffect(() => {
    if (loading) return;
    if (!wrapperRef.current || !cloneRef.current) return;
    setCompact(cloneRef.current.scrollWidth > wrapperRef.current.clientWidth);
  }, [totalText, loading]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!wrapperRef.current || !cloneRef.current) return;
      setCompact(cloneRef.current.scrollWidth > wrapperRef.current.clientWidth);
    });
    observer.observe(wrapperRef.current);
    return (): void => observer.disconnect();
  }, []);

  return (
    <MainTotalPriceWrapper ref={wrapperRef} $compact={!loading && compact}>
      {loading ? (
        <MainTotalPriceSkeleton aria-label='Loading balance' />
      ) : (
        <>
          <span ref={cloneRef} className='measure-clone' aria-hidden>
            <span className='total-value'>{totalText}</span>
          </span>
          <span className='total-value'>{totalText}</span>
          <div className='change-wrapper'>
            <span className={`change-value ${tone}`}>{formatUSDChange(value.changeUSDValue)}</span>
            <TokenChangeRate rate={value.changeRate} variant='badge' />
          </div>
        </>
      )}
    </MainTotalPriceWrapper>
  );
};

export default MainTotalPrice;
