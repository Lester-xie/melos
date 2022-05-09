import { request } from 'umi';
import { debounce } from 'lodash';

// function debounce(fn: any, timeout: number) {
//   clearTimeout(fn.id);
//   fn.id = setTimeout(fn, timeout);
// }

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

export async function getMemberList(projectId: string) {
  return request(`project/member/search`, {
    method: 'POST',
    data: {
      conds: { project: projectId },
      page: 1,
      limit: 50,
    },
  });
}

// 获取全局用户列表
export async function getUserList(keyword: string) {
  return request(`user/search`, {
    method: 'POST',
    data: {
      keyword,
    },
  });
}

function pushAction(type: string, data: any) {
  return request(`project/action/create`, {
    method: 'POST',
    data: {
      project: '62787b49a94c9a84356d293c',
      event: 'action',
      extraBody: {
        token: window.localStorage.getItem('token'),
        type,
        data,
      },
    },
  });
}

export const debouncePushAction = debounce(pushAction, 500);

// 邀请用户加入
export async function inviteProjectUser(userId: string, projectId: string) {
  return request(`project/member/invite`, {
    method: 'POST',
    data: {
      user: userId,
      project: projectId,
    },
  });
}
