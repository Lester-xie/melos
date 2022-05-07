import styles from './index.less'
import {Input,Button} from "antd";
import {PlusOutlined} from "@ant-design/icons";
import {useState} from "react";
import callVoice from '../../assets/chat/call_voice.png'
import call_invite from '../../assets/chat/call_invite.png'
import mute from '../../assets/chat/mute.png'
import unmute from '../../assets/chat/unmute.png'
import tick from '../../assets/chat/tick.png'
interface IMember{
  id:string,
  name?:string,
  isMute?:boolean,
  isInMeeting?:boolean,
  instruments?:string,
  role?:string,
  icon?:string
}
const Meeting = ()=>{
  const [members,setMembers] = useState<IMember[]>([
    {id:'t1',isInMeeting:true,},
    {id:'t6',isInMeeting:true,},
    {id:'t2',isInMeeting:true,isMute:true},
    {id:'t5',isInMeeting:true,isMute:true},
    {id:'t3',isInMeeting:false},
    {id:'t4',isInMeeting:false},
  ])
  return <div className={styles.meeting}>
    <div className={styles.self}>
      <div className={styles.left}>
        <img src={'https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fup.enterdesk.com%2Fedpic%2F76%2Fe4%2F5b%2F76e45bdb73abcf3f6a7d875d3f63a93b.jpeg&refer=http%3A%2F%2Fup.enterdesk.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1654240134&t=4ec75dfd485484a6d9b4b06d77ee0a1f'} alt='icon'/>
      </div>
      <div className={styles.right}>
        <div className={styles.name}>audio's name</div>
        <div className={styles.tag}>
          <span>Drummer</span>
          <span className={styles.role}>creator</span>
        </div>
      </div>
    </div>
    <div className={styles.add}>
      <div className={styles.input}>
        <Input placeholder='Search'/>
      </div>
      <div className={styles.inputBtn}>
        <Button icon={<PlusOutlined />} type={"primary"} style={{borderRadius:'8px'}}/>
      </div>
    </div>
    <div className={[styles.members,'customScroll'].join(' ')}>
      {
        members.map(m=>{
          return <section key={m.id}>
            <div className={styles.top}>
              <div className={styles.left}>
                <img src={'https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fup.enterdesk.com%2Fedpic%2F76%2Fe4%2F5b%2F76e45bdb73abcf3f6a7d875d3f63a93b.jpeg&refer=http%3A%2F%2Fup.enterdesk.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1654240134&t=4ec75dfd485484a6d9b4b06d77ee0a1f'} alt='icon'/>
              </div>
              <div className={styles.right}>
                <div className={styles.name}>audio's name</div>
                <div className={styles.tag}>
                  <span>Drummer</span>
                  <span className={styles.role}>creator</span>
                </div>
              </div>
            </div>
            <div className={styles.MBottom}>
              <div className={styles.status}>
                {
                  m.isInMeeting
                    ? <img src={callVoice} alt='callVoice'/>
                    :<img src={call_invite} alt='callInvite'/>
                }
                {
                  m.isInMeeting && m.isMute
                   && <img src={mute} alt='callVoice'/>
                }
                {
                  m.isInMeeting && !m.isMute
                  && <img src={unmute} alt='callVoice'/>
                }
              </div>
              <div className={styles.del}>
                {
                  m.isInMeeting && <img src={tick} alt='tick'/>
                }
              </div>
            </div>
          </section>
        })
      }
    </div>
    <div className={styles.meetingInfo}>
      <Button type={"primary"} style={{width:'100%'}}>Leave</Button>
      <h5>Record 00:24:43</h5>
    </div>
  </div>
}

export default Meeting;
