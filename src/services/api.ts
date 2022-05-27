import { request } from 'umi';
import { debounce } from 'lodash';
import { TrackInfo } from '@/models/global';

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

export async function createAsset(token: string, userId: string, name: string) {
  return request(`asset/create`, {
    method: 'POST',
    data: {
      token,
      user: userId,
      name,
    },
  });
}

const USERID = '62902140e0346b371d1a6416';

export async function fetchTagList() {
  return request(`label/search`, {
    method: 'POST',
    data: {
      conds: {},
      page: 1,
      limit: 100,
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

// 修改项目
export async function updateProject(
  _id: string,
  name: string,
  tracks: Array<TrackInfo> | null = null,
) {
  const payload: any = {
    _id,
    name,
  };
  if (tracks) {
    payload.tracks = tracks;
  }
  return request(`project/update`, {
    method: 'POST',
    data: payload,
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
export async function delProjectMemberAPI(memberId: string) {
  return request(`project/member/remove`, {
    method: 'POST',
    data: {
      memberId,
    },
  });
}

// 获取项目已上传资源
export async function fetchUploadList(userId: string) {
  return request(`asset/search`, {
    method: 'POST',
    data: {
      conds: {
        user: userId,
      },
    },
  });
}

// 获取项目已上传资源
export async function fetchAssetByTag(tagId: string) {
  return request(`asset/search`, {
    method: 'POST',
    data: {
      conds: {
        label: tagId,
      },
      limit: 100,
    },
  });
}

// 获取项目已上传资源
export async function updateMemberRole(memberId: string, role: string) {
  return request(`project/member/update`, {
    method: 'POST',
    data: {
      memberId: memberId,
      role,
    },
  });
}

// 通知别人我已经上线socket
export async function noticeOnline(useId: string) {
  return request('project/action/create', {
    method: 'POST',
    data: {
      event: 'online',
      extraBody: {
        userId: useId,
      },
    },
  });
}

// 通知别人我下线socket
export async function noticeOffline(useId: string) {
  return request('project/action/create', {
    method: 'POST',
    data: {
      event: 'offline',
      extraBody: {
        userId: useId,
      },
    },
  });
}

export async function noticeRTCStatusChange(
  userId: string,
  projectId: string,
  isConnected: boolean,
) {
  return request('project/action/create', {
    method: 'POST',
    data: {
      event: 'rtcStatusChange',
      extraBody: {
        userId,
        projectId,
        isConnected,
      },
    },
  });
}

// 通知成员发生了变化
export async function noticeMemberChanged(projectId: string) {
  return request('project/action/create', {
    method: 'POST',
    data: {
      event: 'memberChanged',
      extraBody: {
        projectId,
      },
    },
  });
}

// 邀请用户加入房间
export async function inviteUserJoinRoom(
  userId: string,
  projectId: string,
  projectName: string,
) {
  return request('project/action/create', {
    method: 'POST',
    data: {
      event: 'inviteMemberJoinRoom',
      extraBody: {
        projectId,
        userId,
        projectName,
      },
    },
  });
}

// 获取所有在线用户
export async function getAllOnlineUser() {
  return request('project/action/create', {
    method: 'POST',
    data: {
      event: 'inviteMemberJoinRoom',
    },
  });
}

// 发送消息
export async function sendMsg(
  id: string | number,
  projectId: string,
  userId: string,
  content: string,
  name: string,
) {
  return request('project/action/create', {
    method: 'POST',
    data: {
      event: 'sendMessage',
      extraBody: {
        projectId,
        userId,
        content,
        name,
        id,
      },
    },
  });
}
