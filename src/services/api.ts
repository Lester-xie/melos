import { request } from 'umi';

function debounce(fn: any, timeout: number) {
  clearTimeout(fn.id);
  fn.id = setTimeout(fn, timeout);
}

/** login */
export async function Login(name: string) {
  return request<API.User>(`user/signin`, {
    method: 'POST',
    data: {
      name,
    },
  });
}

export async function fetchPresigned(ext: string) {
  return request(`asset/getPresigned`, {
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
  return request(`asset/create`, {
    method: 'POST',
    data: {
      token,
    },
  });
}

export async function fetchTagList() {
  return request(`label/search`, {
    method: 'POST',
    data: {
      conds: {},
    },
  });
}

function pushAction(type: string, data: any) {
  return request(`project/action/create`, {
    method: 'POST',
    data: {
      project: '627740011002cc1fda5f4045',
      event: 'action',
      extraBody: {
        token: window.localStorage.getItem('token'),
        type,
        data,
      },
    },
  });
}

export function debouncePushAction(type: string, data: any) {
  debounce(() => pushAction(type, data), 500);
}
