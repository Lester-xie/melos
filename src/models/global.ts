import { Effect, Reducer, Subscription } from 'umi';

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
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
  userIdMappingStreamId: {[key:string]:string};
}

export interface GlobalModelType {
  namespace: 'global';
  state: GlobalModelState;
  effects: {
    query: Effect;
  };
  reducers: {
    save: Reducer<GlobalModelState>;
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
    userIdMappingStreamId:{}
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
  },
  subscriptions: {
    setup({}) {},
  },
};

export default GlobalModel;
