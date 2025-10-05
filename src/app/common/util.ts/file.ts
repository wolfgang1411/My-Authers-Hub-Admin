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

async function getFileSizeFromS3Url(url: string): Promise<number | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch headers: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch (err) {
    console.error('Error getting file size:', err);
    return null;
  }
}

export { getFileToBase64, getFileSizeFromS3Url };
