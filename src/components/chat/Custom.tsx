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
  updateMemberRole
} from '@/services/api';
const { TabPane } = Tabs;

const generateId = () => {
  return new Date().getTime() + parseInt((Math.random() * 10000).toString());
};
const CustomTab = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [active, setActive] = useState('meeting');
  const [records, setRecords] = useState<API.messageRecord[]>([]);

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

  const toggleMute = (bol: boolean,userId:string='') => {
    let id = userId
    if(!userId){
      id =  user.id
    }
    const map =  globalState.userIdMappingStreamId
    const streamId = map[id]
    if(!streamId){return}
    if (bol) {
      RTCRef.current.streamEvents[streamId].stream.mute('audio');
    } else {
      RTCRef.current.streamEvents[streamId].stream.unmute('audio');
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
  const delMember = (id: string,userId:string) => {
    delProjectMemberAPI(id)
      .then((res) => {
        // 删除项目成员成功
        //  1.更新memberList 列表
        if(res.code===0){
          getMemberList(globalState.project.id).then(c=>{
            if(c.code ===0){
              dispatch({
                type: 'global/save',
                payload: {
                  memberList: c.data.result,
                },
              });
            }
          })
        }

        // 2.把他T出会议室，如果他在线的话
        const map = globalState.userIdMappingStreamId
        // 找出对应的stream Id
        const streamId =  map[userId]
        if(!streamId){return}
        // RTCRef.current.removeStream(streamId);
        RTCRef.current.deletePeer(userId);

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
    RTCRef.current.userid = user.id
    RTCRef.current.iceServers = [{
      'urls': 'stun:8.218.125.220:3478',
    }];
    RTCRef.current.iceServers.push({
      urls: 'turn:8.218.125.220:3478',
      credential: 'anxing123',
      username: 'anxing'
    })
    RTCRef.current.onopen = function () {
      // RTCRef.current.send('hello every one')
      console.log(11111, 'room open...');
      // RTCRef.current.streamEvents[streamId].stream.mute('audio');
    };
    RTCRef.current.onmute = muteOrUnMuteCallback;
    RTCRef.current.onunmute = muteOrUnMuteCallback;
    RTCRef.current.onPeerStateChanged  = (state:any)=>{
      console.log(111111111111111111,state)
      if (state.iceConnectionState.search(/closed|failed|disconnected/gi) !== -1) {
         // @ts-ignore
        message.error('You had been ticked from the project').then()
        window.location.reload()
      }
    };
    RTCRef.current.onmessage = callback;
    RTCRef.current.onstream = function (event: any) {
      const { type,extra, stream } = event;

      console.log(222,stream)
      // if(type==='local'){
      //   console.log(121212)
      //   RTCRef.current.streamEvents[stream.streamId].stream.mute('audio');
      // }

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

      // 生成userid 和 streamId的map关系
       let map = globalState.userIdMappingStreamId
       map[userId] =stream.streamid
      dispatch({
        type: 'global/save',
        payload: {
          onlineMemberIds: onlineMembers,
          userIdMappingStreamId: map,
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

  const onRoleChange = (mId:string,e:string)=>{
    updateMemberRole(mId,e).then(res=>{
      if(res.code ===0){
        message.success('Update role success').then()
        getMemberList(globalState.project.id).then(c=>{
          if(c.code ===0){
            dispatch({
              type: 'global/save',
              payload: {
                memberList: c.data.result,
              },
            });
          }
        })
      }
    })
  }

  useEffect(()=>{
    if(globalState.project.id){
      goCreateOrJoinRoom()
    }
  },[globalState.project])
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
          onRoleChange={onRoleChange}
        />
      </TabPane>
      <TabPane tab="discuss" key="discuss">
        {globalState.roomId && <Message records={records} send={sendMsg} />}
      </TabPane>
    </Tabs>
  );
};

export default CustomTab;
