import down from '@assets/arrowL-down.svg'
import left from '@assets/arrowL-left.svg'
import right from '@assets/arrowL-right.svg'
import up from '@assets/arrowL-up.svg'
import styled from 'styled-components'

const ButtonSet = styled.button`
  width: 24px;
  height: 24px;
  background-repeat: no-repeat;
  background-position: center center;
`

export const LeftArrowBtn = styled(ButtonSet)`
  background-image: url(${left});
`

export const RightArrowBtn = styled(ButtonSet)`
  background-image: url(${right});
`

export const UpArrowBtn = styled(ButtonSet)`
  background-image: url(${up});
`

export const DownArrowBtn = styled(ButtonSet)`
  background-image: url(${down});
`
