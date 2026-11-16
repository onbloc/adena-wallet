import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TokenBalance } from '@components/molecules';
import {
  MainTokenBalanceSkeleton,
  MainTokenBalanceWrapper,
} from './main-token-balance.styles';

export interface MainTokenBalanceProps {
  amount: {
    value: string;
    denom: string;
  };
  loading?: boolean;
}

const MainTokenBalance: React.FC<MainTokenBalanceProps> = ({ amount, loading = false }) => {
  const { value, denom } = amount;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    if (loading) return;
    if (!wrapperRef.current || !cloneRef.current) return;
    const needed = cloneRef.current.scrollWidth;
    const available = wrapperRef.current.clientWidth;
    setCompact(needed > available);
  }, [value, denom, loading]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!wrapperRef.current || !cloneRef.current) return;
      const needed = cloneRef.current.scrollWidth;
      const available = wrapperRef.current.clientWidth;
      setCompact(needed > available);
    });
    observer.observe(wrapperRef.current);
    return (): void => observer.disconnect();
  }, []);

  return (
    <MainTokenBalanceWrapper ref={wrapperRef} $compact={!loading && compact}>
      {loading ? (
        <MainTokenBalanceSkeleton aria-label='Loading balance' />
      ) : (
        <>
          <div ref={cloneRef} className='measure-clone' aria-hidden>
            <TokenBalance
              value={value}
              denom={denom}
              orientation='HORIZONTAL'
              fontColor='white'
              fontStyleKey='header2'
              minimumFontSize='24px'
              lineHeight='39px'
            />
          </div>
          <TokenBalance
            value={value}
            denom={denom}
            orientation='HORIZONTAL'
            fontColor='white'
            fontStyleKey='header2'
            minimumFontSize='24px'
            lineHeight='39px'
          />
        </>
      )}
    </MainTokenBalanceWrapper>
  );
};

export default MainTokenBalance;
