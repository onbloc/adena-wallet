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
  /**
   * A balance feeding this total could not be refreshed. The figure would be
   * derived from retained amounts, so it is withheld rather than presented as
   * a current value.
   */
  unavailable?: boolean;
  loading?: boolean;
}

/** Total USD value with the 24h delta beneath it. */
const MainTotalPrice: React.FC<MainTotalPriceProps> = ({
  value,
  unavailable = false,
  loading = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);

  const totalText = unavailable ? '-' : formatUSD(value.totalUSDValue);
  // Omitted when no quoted token reports a 24h change, rather than shown as a
  // flat "$0.00 / 0.00%" — and omitted when the total itself is withheld,
  // since a delta on a figure that is not shown says nothing.
  const changeRate = value.changeRate;
  const changeUSDValue = value.changeUSDValue;
  const hasChange = !unavailable && changeRate !== null && changeUSDValue !== null;

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
          {hasChange && (
            <div className='change-wrapper'>
              <span className={`change-value ${getChangeTone(changeRate)}`}>
                {formatUSDChange(changeUSDValue)}
              </span>
              <TokenChangeRate rate={changeRate} variant='badge' />
            </div>
          )}
        </>
      )}
    </MainTotalPriceWrapper>
  );
};

export default MainTotalPrice;
