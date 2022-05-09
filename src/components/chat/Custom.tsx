import {message, Tabs} from "antd";
import styles from "@/components/chat/index.less";
import Message from "@/components/chat/Message";
import Meeting from "@/components/chat/Meeting";
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {useDispatch, useSelector} from "umi";
import {socketPrefix} from "@/config";
import {inviteProjectUser} from "@/services/api";
const { TabPane } = Tabs;

const generateId = () => {
  return new Date().getTime() + parseInt((Math.random() * 10000).toString());
};
const CustomTab =()=>{
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [active, setActive] = useState('discuss');
  const [records, setRecords] = useState<API.messageRecord[]>([]);
  const [localStreamId,setLocalStreamId] = useState('')

  // @ts-ignore
  const memberList: Array<API.MemberType> = useSelector((state) => state.global.memberList);
  const dispatch  = useDispatch()
  const RTCRef = useRef<any>();

  const memberRef =  useRef<Array<API.MemberType>>([])

  const callback = useCallback((event: any) => {
    // 通过ref动态引用获取到paused的当前状态
    const user = memberRef.current?.find(m=> m.user._id === event.extra.userId);
    if (!user) return;
    setRecords((records) => {
      return [
        ...records,
        {
          id: generateId(),
          content: event.data,
          isSelf: false,
          avatar: user.user.avatar.url,
          name: user.user.name,
        },
      ];
    });
  }, [memberRef]);

  const muteOrUnMuteCallback = useCallback((event: any) => {
    const {extra,isAudioMuted} = event
    const userId = extra.userId
    const newMembers = [...memberRef.current]
    for(let m  of newMembers){
      if(m.user._id === userId){
        m.isMute = isAudioMuted
      }
    }
    dispatch({
      type: 'global/save',
      payload: {
        memberList: newMembers,
      },
    })
  }, [memberRef]);

  useEffect(()=>{
    memberRef.current = memberList
  },[memberList])
  useLayoutEffect(() => {
    RTCRef.current = new RTCMultiConnection() as any;
    RTCRef.current.socketURL = socketPrefix;

    RTCRef.current.session = {
      data: true,
      audio: true,
      video: false
    };
    RTCRef.current.mediaConstraints = {
      audio: true,
      video: false
    };
    RTCRef.current.extra = {
      userId: user.id,
    };
    RTCRef.current.onopen = function () {
      // RTCRef.current.send('hello every one')
    };
    RTCRef.current.onmute = muteOrUnMuteCallback
    RTCRef.current.onunmute = muteOrUnMuteCallback
    RTCRef.current.onmessage = callback
    RTCRef.current.onstream = function (event: any) {
      const {type,extra,stream} = event
      if(type==='remote'){
        const userId = extra.userId
        const members = [...memberList];
        for (let m of members){
          if(m.user._id===userId){
            m.isMute = !stream.isAudio
            m.isInMeeting = !stream.isAudio
          }
        }
        dispatch({
          type: 'global/save',
          payload: {
            memberList: members,
          },
        })
      } else if(type==='local'){
        setLocalStreamId(stream.streamid)
      }
    };
    RTCRef.current.openOrJoin('ttxxxiidd-12');
  }, []);

  const toggleMute = (bol:boolean)=>{
    if(bol){
      RTCRef.current.streamEvents[localStreamId].stream.mute('audio');
    }else{
      RTCRef.current.streamEvents[localStreamId].stream.unmute('audio');
    }
  }

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
  const inviteUser = async (userId:string)=>{
    const res =  await inviteProjectUser(userId,'62772302849c463fe6acda53')
    if(res.code===0){
      message.success('invited success')
    }
  }
  return  <Tabs
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
    <TabPane tab="discuss" key="discuss">
      {memberList.length > 0 && (
        <Message records={records} send={sendMsg} />
      )}
      {/*<Message />*/}
    </TabPane>
    <TabPane tab="meeting" key="meeting">
      {memberList.length > 0 && <Meeting memberList={memberList} inviteUser={inviteUser} toggleMute={toggleMute}/>}
    </TabPane>
  </Tabs>
}

export default CustomTab;
