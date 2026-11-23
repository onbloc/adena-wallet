import React, { ReactElement } from 'react';

import { Text } from '../../atoms';

export const SectionLabel = ({ label }: { label: string }): ReactElement => (
  <Text variant='meta' color='secondary' accessibilityRole='header'>{label}</Text>
);
