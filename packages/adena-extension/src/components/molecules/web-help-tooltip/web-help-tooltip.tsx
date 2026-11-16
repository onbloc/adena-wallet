import { WebButton, WebImg, WebText } from '@components/atoms';
import React, { PropsWithChildren } from 'react';
import {
  WebHelpTooltipBoxArrowWrapper,
  WebHelpTooltipBoxWrapper,
  WebHelpTooltipEvaluation,
  WebHelpTooltipWrapper,
} from './web-help-tooltip.styles';
import IconBoxArrow from '@assets/web/box-arrow.svg';
import IconSecurityRate from '@assets/web/security-rate.svg';
import IconConvenienceRate from '@assets/web/convenience-rate.svg';
import _ from 'lodash';

export interface WebHelpTooltipProps {
  securityRate: number;
  convenienceRate: number;
  position: 'top' | 'bottom';
  confirm: () => void;
}

const WebHelpTooltip: React.FC<PropsWithChildren<WebHelpTooltipProps>> = ({
  securityRate,
  convenienceRate,
  confirm,
  position,
  children,
}) => {
  return (
    <WebHelpTooltipWrapper>
      {position === 'bottom' && (
        <WebHelpTooltipBoxArrowWrapper>
          <WebImg src={IconBoxArrow} width={23} height={12} />
        </WebHelpTooltipBoxArrowWrapper>
      )}

      <WebHelpTooltipBoxWrapper>
        <div className='content-wrapper'>{children}</div>
        <div className='evaluation-wrapper'>
          <WebHelpTooltipEvaluation>
            <WebText type='body5' color='#8D9199'>
              Security
            </WebText>
            <div className='value'>
              {_.map(new Array(securityRate)).map((_, index) => (
                <div key={index} className='icon-wrapper'>
                  <WebImg src={IconSecurityRate} />
                </div>
              ))}
            </div>
          </WebHelpTooltipEvaluation>

          <WebHelpTooltipEvaluation>
            <WebText type='body5' color='#8D9199'>
              Convenience
            </WebText>
            <div className='value'>
              {_.map(new Array(convenienceRate)).map((_, index) => (
                <div key={index} className='icon-wrapper'>
                  <WebImg src={IconConvenienceRate} />
                </div>
              ))}
            </div>
          </WebHelpTooltipEvaluation>
        </div>
        <WebButton figure='primary' size='full' text='I got it' onClick={confirm} />
      </WebHelpTooltipBoxWrapper>

      {position === 'top' && (
        <WebHelpTooltipBoxArrowWrapper className='reverse'>
          <WebImg src={IconBoxArrow} width={23} height={12} />
        </WebHelpTooltipBoxArrowWrapper>
      )}
    </WebHelpTooltipWrapper>
  );
};

export default WebHelpTooltip;
