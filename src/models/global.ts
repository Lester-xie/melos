import { Effect, Reducer, Subscription } from 'umi';

export interface GlobalModelState {
  memberList: Array<API.MemberType>,
  project:{
    name:string,
    id:string
  },
  roomId:string,
  muteMembersIds:Array<string>,
  onlineMemberIds:Array<string>,
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
    project:{
      name:'',
      id:''
    },
    roomId:'',
    muteMembersIds:[],
    onlineMemberIds:[]
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
