import React, { useReducer, useEffect } from 'react';
import { Checkbox, Button, Flex, Padded, Separator } from '@buffetjs/core';
import { LoadingIndicator } from '@buffetjs/styles';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { BaselineAlignment, request } from 'strapi-helper-plugin';

import FullWidthButton from '../../../../components/FullWidthButton';
import AuthLink from '../AuthLink';
import Box from '../Box';
import Input from '../Input';
import Logo from '../Logo';
import Section from '../Section';
import ProviderButton from '../../../../components/ProviderButton';

// Provider fetching hook
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

const Login = ({ children, formErrors, modifiedData, onChange, onSubmit, requestError }) => {
  const { formatMessage } = useIntl();
  const { isLoading, data: providers } = useAuthProviders();

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground>
        <BaselineAlignment top size="25px">
          <Box errorMessage={get(requestError, 'errorMessage', null)}>
            {/* Regular Login Form */}
            <form onSubmit={onSubmit}>
              <Input
                autoFocus
                error={formErrors.email}
                label="Auth.form.email.label"
                name="email"
                onChange={onChange}
                placeholder="Auth.form.email.placeholder"
                type="email"
                validations={{ required: true }}
                value={modifiedData.email}
              />
              <Input
                error={formErrors.password}
                label="Auth.form.password.label"
                name="password"
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={modifiedData.password}
              />
              <Checkbox
                type="checkbox"
                message={formatMessage({ id: 'Auth.form.rememberMe.label' })}
                name="rememberMe"
                onChange={onChange}
                value={modifiedData.rememberMe}
              />
              <BaselineAlignment top size="27px">
                <FullWidthButton type="submit" color="primary" textTransform="uppercase">
                  {formatMessage({ id: 'Auth.form.button.login' })}
                </FullWidthButton>
              </BaselineAlignment>
            </form>
            {children}
          </Box>
          {/* SSO Providers Section */}
          {!isLoading && providers.length > 0 && (
            <>
              <Separator />
              <Padded top bottom size="smd">
                <BaselineAlignment top size="3px" />
              </Padded>
              <div style={{ 
                background: '#d2e9fe', 
                padding: '1.4rem', 
                boxShadow: 'rgb(221, 221, 221) 12px 12px 9px 0px' }}>
                <Flex flexWrap="wrap" justifyContent="center" alignItems="center">
                  <div>{formatMessage({ id: 'Auth.components.sso.info' })}: </div>
                  {providers.map(provider => (
                    <div key={provider.uid} style={{ padding: '5px 4px' }}>
                      <ProviderButton provider={provider} />
                    </div>
                  ))}
                </Flex>
              </div>
            </>
          )}
        </BaselineAlignment>
      </Section>
      <AuthLink label="Auth.link.forgot-password" to="/auth/forgot-password" />
    </>
  );
};

Login.defaultProps = {
  children: null,
  onSubmit: e => e.preventDefault(),
  requestError: null,
};

Login.propTypes = {
  children: PropTypes.node,
  formErrors: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  requestError: PropTypes.object,
};

export default Login;
