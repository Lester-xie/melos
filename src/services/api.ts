import { request } from 'umi';

/** login */
export async function Login(name: string) {
  return request<API.User>(`api/user/signin`, {
    method: 'POST',
    data: {
      name,
    },
  });
}

export async function fetchPresigned(ext: string) {
  return request(`api/asset/getPresigned`, {
    method: 'POST',
    data: {
      ext,
    },
  });
}

export async function uploadAudio(uploadLink: string, data: any) {
  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'audio/mpeg');

  const requestOptions = {
    method: 'PUT',
    headers: myHeaders,
    body: data,
    redirect: 'follow',
  };
  // @ts-ignore
  return fetch(uploadLink, requestOptions);
}

export async function createAsset(token: string) {
  return request(`api/asset/create`, {
    method: 'POST',
    data: {
      token,
    },
  });
}

export async function fetchTagList() {
  return request(`api/label/search`, {
    method: 'POST',
    data: {
      conds: {},
    },
  });
}
