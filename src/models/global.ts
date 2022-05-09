import { Effect, Reducer, Subscription } from 'umi';

export interface GlobalModelState {
  memberList: Array<API.User>;
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
