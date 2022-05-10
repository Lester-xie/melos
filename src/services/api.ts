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

export async function createAsset(
  token: string,
  projectId: string,
  name: string,
) {
  return request(`asset/create`, {
    method: 'POST',
    data: {
      token,
      project: projectId,
      name,
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

function pushAction(projectId: string, type: string, data: any) {
  return request(`project/action/create`, {
    method: 'POST',
    data: {
      project: projectId,
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

// 创建项目
export async function createProject(name: string) {
  return request(`project/create`, {
    method: 'POST',
    data: {
      name,
    },
  });
}

// 获取我参与或者我创建的项目
export async function getProjects(mode: 'owner' | 'member') {
  return request(`project/search`, {
    method: 'POST',
    data: {
      conds: {
        mode,
      },
      page: 1,
      limit: 100,
    },
  });
}

// 修改项目名称
export async function updateProjectNameAPI(_id: string, name: string) {
  return request(`project/update`, {
    method: 'POST',
    data: {
      _id,
      name,
    },
  });
}

// 删除项目
export async function delProject(_id: string) {
  return request(`project/remove`, {
    method: 'POST',
    data: {
      _id,
    },
  });
}

// 刪除項目成員
export async function delProjectMemberAPI(memberId: string, id: string) {
  return request(`project/member/remove`, {
    method: 'POST',
    data: {
      memberId,
      _id: id,
    },
  });
}

// 获取项目已上传资源
export async function fetchUploadList(projectId: string) {
  return request(`asset/search`, {
    method: 'POST',
    data: {
      conds: {
        project: projectId,
      },
    },
  });
}
