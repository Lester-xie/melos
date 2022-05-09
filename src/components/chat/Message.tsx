import styles from './index.less'
import {FC, useEffect, useRef, useState} from "react";
import {AudioOutlined} from '@ant-design/icons';
import {Button, Input} from "antd";

interface IMessage{
  records:Array<API.messageRecord>,
  send:(val:string)=>void
}
const Message:FC<IMessage> = (props) => {
  const {records,send} = props
  const [inputValue,setInputValue] = useState('')
  const msgRef = useRef<HTMLDivElement>(null)

  // 按下enter键
  const onPressEnter = (e:any)=>{
    const value = e.target.value;
    if(value){
      send(value)
      setInputValue('')
    }
  }

  useEffect(()=>{
    if(msgRef.current && records.length>0&&records[records.length-1].isSelf){
      msgRef.current.scrollTop =msgRef.current.scrollHeight
    }
  },[records])
  return <div className={styles.message}>
    <div className={styles.title}>Members</div>
    <div className={[styles.recordContainer,'customScroll'].join(' ')} ref={msgRef}>
      {
        records.map(r => {
          if (r.isSelf) {
            return <section className={styles.recordSection} key={r.id}>
              <div className={styles.content} style={{marginRight: '8px'}}>
                <div className={styles.text}>
                  {r.content}
                </div>
              </div>
              <div className={styles.icon} >
                <img
                  src={r.avatar}
                  alt='icon'/>
              </div>
            </section>
          } else {
            return <section className={styles.recordSection} key={r.id}>
              <div className={styles.icon}>
                <img
                  src={r.avatar}
                  alt='icon'/>
              </div>
              <div className={styles.content} style={{marginLeft: '8px'}}>
                <div className={styles.name}>{r.name}</div>
                <div className={styles.text}>
                  {r.content}
                </div>
              </div>
            </section>
          }
        })
      }
    </div>
    <div className={styles.input}>
      <Input.Group compact>
        <Input
          style={{ width: 'calc(100% - 32px)' }}
          placeholder='input text or voice'
          value={inputValue}
          onChange={(e)=>{setInputValue(e.target.value)}}
          onPressEnter={(e)=>onPressEnter(e)}
        />
         <Button icon={<AudioOutlined />} />
      </Input.Group>
    </div>
  </div>
}
export default Message
