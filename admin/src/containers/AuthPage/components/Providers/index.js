import React, { useReducer, useEffect } from 'react';
import { Button, Flex, Padded, Separator } from '@buffetjs/core';
import { LoadingIndicator } from '@buffetjs/styles';
import { Redirect, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { BaselineAlignment, request } from 'strapi-helper-plugin';

import Box from '../Box';
import Logo from '../Logo';
import Section from '../Section';
import ProviderButton from '../../../../components/ProviderButton';

const ProviderWrapper = styled.div`
  padding: 5px 4px;
`;

// Inline useAuthProviders hook to avoid import issues
const useAuthProviders = () => {
  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'GET_DATA':
        return { ...state, isLoading: true };
      case 'GET_DATA_SUCCEEDED':
        return { ...state, data: action.data, isLoading: false };
      case 'GET_DATA_ERROR':
        return { ...state, isLoading: false };
      default:
        return state;
    }
  }, { data: [], isLoading: true });

  useEffect(() => {
    const fetchAuthProviders = async () => {
      try {
        const data = await request('/admin/providers', { method: 'GET' });
        dispatch({ type: 'GET_DATA_SUCCEEDED', data });
      } catch (err) {
        console.error(err);
        dispatch({ type: 'GET_DATA_ERROR' });
        strapi.notification.toggle({
          type: 'warning',
          message: { id: 'notification.error' },
          centered: true,
        });
      }
    };
    fetchAuthProviders();
  }, []);

  return state;
};

const Providers = () => {
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const { isLoading, data: providers } = useAuthProviders();

  const handleClick = () => {
    push('/auth/login');
  };

  if (!isLoading && providers.length === 0) {
    return <Redirect to="/auth/login" />;
  }

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground textAlign="center">
        <BaselineAlignment top size="25px">
          <Box withoutError>
            {isLoading ? (
              <LoadingIndicator />
            ) : (
              <Flex flexWrap="wrap">
                {providers.map(provider => (
                  <ProviderWrapper key={provider.uid}>
                    <ProviderButton provider={provider} />
                  </ProviderWrapper>
                ))}
              </Flex>
            )}
            <Padded top bottom size="smd">
              <BaselineAlignment top size="3px" />
              <Separator
                label={formatMessage({
                  id: 'or',
                  defaultMessage: 'OR',
                })}
              />
              <BaselineAlignment top size="7px" />
            </Padded>
            <Button style={{ width: '100%' }} onClick={handleClick} type="submit" color="secondary">
              {formatMessage({
                id: 'Auth.form.button.login.strapi',
                defaultMessage: 'LOG IN VIA STRAPI',
              })}
            </Button>
          </Box>
        </BaselineAlignment>
      </Section>
    </>
  );
};

export default Providers;
