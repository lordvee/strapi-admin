import React from 'react';
import { Text } from '@punch-in/buffet-modern-core';
import { useIntl } from 'react-intl';
import Wrapper from './Wrapper';

const Option = () => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper left right size="xs">
      <Text color="mediumBlue" lineHeight="23px">
        {formatMessage({ id: 'app.components.UpgradePlanModal.text-ce' })}
      </Text>
    </Wrapper>
  );
};

export default Option;
