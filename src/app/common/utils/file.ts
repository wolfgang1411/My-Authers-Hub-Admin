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

const downloadFile = (file: Blob, name: string) => {
  const blobUrl = URL.createObjectURL(file);
  fetch(blobUrl)
    .then((resp) => resp.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    })
    .catch((error) => {
      throw error;
    });
};

async function urlToFile(url: string, filename: string) {
  const response = await fetch(url); // fetch file binary
  const blob = await response.blob(); // convert response to Blob
  const type = blob.type || 'application/octet-stream';

  // If filename not given, try to extract from URL
  if (!filename) {
    const parts = url.split('/');
    filename = decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  }

  // Convert blob to File
  const file = new File([blob], filename, { type });
  return file;
}

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

function selectFile(accept = '*/*', multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.appendChild(input);

    let cleanup = () => {
      input.remove();
      window.removeEventListener('focus', onWindowFocus);
    };

    // When the dialog closes (cancel or select)
    const onWindowFocus = () => {
      // Give browser a tick to fire change event if file was selected
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          resolve(null);
          cleanup();
        }
      }, 300);
    };

    input.addEventListener('change', () => {
      const files = input.files;
      resolve(multiple ? Array.from(files || []) : (files || [])[0]);
      cleanup();
    });

    window.addEventListener('focus', onWindowFocus, { once: true });

    // Trigger the file picker
    input.click();
  });
}

export {
  getFileToBase64,
  getFileSizeFromS3Url,
  selectFile,
  urlToFile,
  downloadFile,
};
