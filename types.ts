export interface FileItem {
  id: string;
  name: string;
  url: string;
  type: string;
  expires: number;
}

export interface UploadResponse {
  status: string;
  data: {
    url: string;
  };
}
