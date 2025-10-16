const getItem = (key: string) => {
  if (typeof window !== 'undefined') {
    const data = window.localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        return data;
      }
    }
    return null;
  }
  return null;
};

const setItem = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    return window.localStorage.setItem(
      key,
      typeof value !== 'string' ? JSON.stringify(value) : value
    );
  }
  return null;
};

const removeItem = (key: string) => {
  if (typeof window !== 'undefined') {
    return window.localStorage.removeItem(key);
  }
  return null;
};

export default { getItem, setItem, removeItem };
