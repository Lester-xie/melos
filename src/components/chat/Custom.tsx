import { message, Tabs } from 'antd';
import styles from '@/components/chat/index.less';
import Message from '@/components/chat/Message';
import Meeting from '@/components/chat/Meeting';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector, GlobalModelState } from 'umi';
import { socketPrefix } from '@/config';
import {
  delProjectMemberAPI,
  getMemberList,
  inviteProjectUser,
} from '@/services/api';
const { TabPane } = Tabs;

const generateId = () => {
  return new Date().getTime() + parseInt((Math.random() * 10000).toString());
};
const CustomTab = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [active, setActive] = useState('meeting');
  const [records, setRecords] = useState<API.messageRecord[]>([]);
  const [localStreamId, setLocalStreamId] = useState('');

  const globalState: GlobalModelState = useSelector(
    (state: any) => state.global,
  );
  const dispatch = useDispatch();
  const RTCRef = useRef<any>();

  const memberRef = useRef<Array<API.MemberType>>([]);

  const callback = useCallback(
    (event: any) => {
      // 通过ref动态引用获取到paused的当前状态
      const user = memberRef.current?.find(
        (m) => m.user._id === event.extra.userId,
      );
      if (!user) return;
      setRecords((records) => {
        return [
          ...records,
          {
            id: generateId(),
            content: event.data,
            isSelf: false,
            avatar: user.user?.avatar?.url,
            name: user.user.name,
          },
        ];
      });
    },
    [memberRef],
  );

  useEffect(() => {
    memberRef.current = globalState.memberList;
  }, [globalState.memberList]);

  const muteOrUnMuteCallback = useCallback(
    (event: any) => {
      console.log(event, 'mute or unmute');
      const { extra, isAudioMuted } = event;
      const userId = extra.userId;
      const muteIds = [...globalState.muteMembersIds];
      let ids: Array<string> = [];
      if (isAudioMuted) {
        const muteSet = new Set(muteIds);
        muteSet.add(userId);
        ids = Array.from(muteSet);
      } else {
        ids = muteIds.filter((m) => m !== userId);
      }

      dispatch({
        type: 'global/save',
        payload: {
          muteMembersIds: ids,
        },
      });
    },
    [memberRef],
  );

  const toggleMute = (bol: boolean) => {
    if (bol) {
      RTCRef.current.streamEvents[localStreamId].stream.mute('audio');
    } else {
      RTCRef.current.streamEvents[localStreamId].stream.unmute('audio');
    }
  };

  const sendMsg = (val: string) => {
    setRecords((records) => {
      return [
        ...records,
        { id: generateId(), content: val, isSelf: true, avatar: user.avatar },
      ];
    });
    RTCRef.current.send(val);
  };

  // inviteMember
  const inviteUser = async (userId: string) => {
    const res = await inviteProjectUser(userId, globalState.project.id);
    if (res.code === 0) {
      message.success('invited success');
      getMemberList(globalState.project.id).then((res) => {
        dispatch({
          type: 'global/save',
          payload: {
            memberList: res.data.result,
          },
        });
      });
    }
  };

  // 刪除用戶
  const delMember = (id: string) => {
    delProjectMemberAPI(id, globalState.project.id)
      .then((res) => {
        console.log(res);
      })
      .catch((e) => {
        console.log(e);
      });
  };
  // 拉起房间
  const goCreateOrJoinRoom = () => {
    if (globalState.roomId) {
      message.warning('room had been created').then();
      return;
    }
    const roomId = `${globalState.project.id}-audio-room`;
    RTCRef.current = new RTCMultiConnection() as any;
    RTCRef.current.socketURL = socketPrefix;
    RTCRef.current.session = {
      data: true,
      audio: true,
      video: false,
    };
    RTCRef.current.mediaConstraints = {
      audio: true,
      video: false,
    };
    RTCRef.current.extra = {
      userId: user.id,
    };
    RTCRef.current.onopen = function () {
      // RTCRef.current.send('hello every one')
      console.log(11111, 'room open...');
    };
    RTCRef.current.onmute = muteOrUnMuteCallback;
    RTCRef.current.onunmute = muteOrUnMuteCallback;
    RTCRef.current.onmessage = callback;
    RTCRef.current.onstream = function (event: any) {
      const { type, extra, stream } = event;
      if (type === 'local') {
        setLocalStreamId(stream.streamid);
      }
      const userId = extra.userId;
      const { isAudio } = stream;
      if (!isAudio) {
        //mute add
        let muteSet = new Set(globalState.muteMembersIds);
        muteSet.add(userId);
        const arr = Array.from(muteSet);
        dispatch({
          type: 'global/save',
          payload: {
            muteMembersIds: arr,
          },
        });
      }
      let onlineMemberIdsSet = new Set(globalState.onlineMemberIds);
      onlineMemberIdsSet.add(userId);
      const onlineMembers = Array.from(onlineMemberIdsSet);
      dispatch({
        type: 'global/save',
        payload: {
          onlineMemberIds: onlineMembers,
        },
      });
    };

    RTCRef.current.openOrJoin(roomId);
    message.success('Join Room success').then();
    dispatch({
      type: 'global/save',
      payload: {
        roomId,
        onlineMemberIds: [user.id],
      },
    });
  };
  return (
    <Tabs
      activeKey={active}
      renderTabBar={(props) => {
        const { panes } = props;
        return (
          <div className={styles.tab}>
            {panes &&
              (panes as any).map((tab: any) => {
                return (
                  <div className={styles.tab} key={tab.key}>
                    <div
                      key={tab.key}
                      className={
                        active === tab.key
                          ? [styles.item, styles.active].join(' ')
                          : styles.item
                      }
                      onClick={() => setActive(tab.key)}
                    >
                      <img
                        src={
                          active === tab.key
                            ? require(`../../assets/chat/${tab.key}_active.png`)
                            : require(`../../assets/chat/${tab.key}.png`)
                        }
                        alt="icon"
                      />
                      {tab.key}
                    </div>
                  </div>
                );
              })}
          </div>
        );
      }}
    >
      <TabPane tab="meeting" key="meeting">
        <Meeting
          inviteUser={inviteUser}
          toggleMute={toggleMute}
          delMember={delMember}
          goCreateOrJoinRoom={goCreateOrJoinRoom}
        />
      </TabPane>
      <TabPane tab="discuss" key="discuss">
        {globalState.roomId && <Message records={records} send={sendMsg} />}
      </TabPane>
    </Tabs>
  );
};

export default CustomTab;
