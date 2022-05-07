import styles from './index.less'
import {useEffect, useRef, useState} from "react";
import {AudioOutlined} from '@ant-design/icons';
import {Button, Input} from "antd";

interface record {
  content?: string,
  isSelf?: boolean,
  id:string|number
}

const Message = () => {
  const RTCRef =  useRef<any>()
  useEffect(()=>{
    RTCRef.current = new RTCMultiConnection() as any;
    // RTCRef.current.socketURL = 'https://muazkhan.com:9001/';
    RTCRef.current.socketURL = 'http://8.218.125.220:9001/';

    RTCRef.current.session = {
      data: true
    };
    RTCRef.current.extra  = {
      fullName: 'test',
    };
    RTCRef.current.onopen = function() {
    };
    RTCRef.current.onmessage = function(event:any) {
      console.log(event)
      setRecords((records)=>{
        return [...records,{id:generateId(),content:event.data,isSelf:false}]
      })
    };
    RTCRef.current.openOrJoin('ttxxxiidd-12');
  },[])
  const [records, setRecords] = useState<record[]>([])
  const [inputValue,setInputValue] = useState('')
  const msgRef = useRef<HTMLDivElement>(null)
  // generate id
  const generateId = ()=>{
    return new Date().getTime()+ parseInt((Math.random()*10000).toString())
  }
  // 按下enter键
  const onPressEnter = (e:any)=>{
    const value = e.target.value;
    if(value){
      setRecords((records)=>{
        return [...records,{id:generateId(),content:value,isSelf:true}]
      })
      RTCRef.current.send(value);
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
                  src={'https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fup.enterdesk.com%2Fedpic_source%2F30%2F90%2F40%2F309040a0602c672cebc6ab3a1bbbc8cd.jpg&refer=http%3A%2F%2Fup.enterdesk.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1654096865&t=7ceb88d80bf8b91c4f15b7d9ac60cbce'}
                  alt='icon'/>
              </div>
            </section>
          } else {
            return <section className={styles.recordSection} key={r.id}>
              <div className={styles.icon}>
                <img
                  src={'https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fup.enterdesk.com%2Fedpic_source%2F30%2F90%2F40%2F309040a0602c672cebc6ab3a1bbbc8cd.jpg&refer=http%3A%2F%2Fup.enterdesk.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1654096865&t=7ceb88d80bf8b91c4f15b7d9ac60cbce'}
                  alt='icon'/>
              </div>
              <div className={styles.content} style={{marginLeft: '8px'}}>
                <div className={styles.name}>David</div>
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
