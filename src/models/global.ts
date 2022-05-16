import { Effect, Reducer, Subscription } from 'umi';
import { updateProject } from '@/services/api';

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
}

export interface TrackInfo {
  src: string;
  name: string;
  mute: boolean;
  solo: boolean;
  gain: number;
  stereoPan: number;
  copy: Array<any>;
  cut: Array<any>;
  startTime: number;
}

export interface GlobalModelState {
  memberList: Array<API.MemberType>;
  project: {
    name: string;
    id: string;
  };
  roomId: string;
  muteMembersIds: Array<string>;
  onlineMemberIds: Array<string>;
  userInfo: UserInfo | null;
  userRoleInCurrentProject: string;
  socketConnectSuccess: true | false;
  socketOnlineUserIds: Array<string>;
  userIdMappingStreamId: { [key: string]: string };
  currentTracks: Array<TrackInfo>;
}

export interface GlobalModelType {
  namespace: 'global';
  state: GlobalModelState;
  effects: {
    query: Effect;
  };
  reducers: {
    save: Reducer<GlobalModelState>;
    update: Reducer<GlobalModelState>;
  };
  subscriptions: { setup: Subscription };
}

const GlobalModel: GlobalModelType = {
  namespace: 'global',

  state: {
    memberList: [],
    project: {
      name: '',
      id: '',
    },
    roomId: '',
    muteMembersIds: [],
    onlineMemberIds: [],
    userInfo: null,
    userRoleInCurrentProject: '',
    socketConnectSuccess: false,
    socketOnlineUserIds: [],
    userIdMappingStreamId: {},
    currentTracks: [],
  },

  effects: {
    *query({ payload }, { call, put }) {},
  },
  reducers: {
    save(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
    update(state, action) {
      const data = {
        ...state,
        ...action.payload,
      };
      updateProject(data.project.id, data.project.name, data.currentTracks);
      return {
        ...state,
        ...action.payload,
      };
    },
  },
  subscriptions: {
    setup({}) {},
  },
};

export default GlobalModel;
