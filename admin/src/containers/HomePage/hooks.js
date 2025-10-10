import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const useFetch = () => {
  const isMounted = useRef(true);
  const [state, setState] = useState({
    error: false,
    isLoading: true,
    posts: [{ link: '1' }, { link: '2' }],
  });

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    setState({ isLoading: false, error: true, posts: [] });
    return () => {
      isMounted.current = false;
      source.cancel('abort');
    };
  }, []);

  return state;
};

export default useFetch;
