const getFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string); // reader.result is Base64 string
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(file); // converts file to Base64
  });
};

export { getFileToBase64 };
