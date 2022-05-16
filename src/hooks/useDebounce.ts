import { useEffect, useState } from 'react';

export default function useDebounce(value: unknown, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  // 当 value 发生变化时，延时设置 state
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
