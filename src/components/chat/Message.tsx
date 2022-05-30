import styles from './index.less';
import { FC, useEffect, useRef, useState } from 'react';
import { Input } from 'antd';
import { useDispatch, useSelector } from 'umi';
import { generateId } from '@/components/chat/Custom';
import { sendMsg } from '@/services/api';
import { GlobalModelState } from '@/models/global';

const Message: FC = () => {
  const self = JSON.parse(localStorage.getItem('user') || '{}');
  const [inputValue, setInputValue] = useState('');
  const msgRef = useRef<HTMLDivElement>(null);
  const globalState: GlobalModelState = useSelector(
    (state: any) => state.global,
  );
  const { project, chatRecord } = globalState;
  const dispatch = useDispatch();

  // 按下enter键
  const onPressEnter = async (e: any) => {
    const value = e.target.value;

    if (value && value.trim()) {
      // 1.发送消息--->调用成功
      const id = generateId();
      await sendMsg(id, project.id, self.id, value, self.name);
      // 2.存储发送内容
      const item = {
        id,
        content: value,
        isSelf: true,
        userId: self.id,
        name: self.name,
      };
      dispatch({
        type: 'global/save',
        payload: {
          chatRecord: [...chatRecord, item],
        },
      });
      // 3.清空输入框的值
      setInputValue('');
    }
  };

  useEffect(() => {
    if (
      msgRef.current &&
      chatRecord.length > 0
      // && chatRecord[chatRecord.length - 1].isSelf
    ) {
      msgRef.current.scrollTop = msgRef.current.scrollHeight;
    }
  }, [chatRecord]);
  return (
    <div className={styles.message}>
      <div className={styles.title}>Members</div>
      <div
        className={[styles.recordContainer, 'customScroll'].join(' ')}
        ref={msgRef}
      >
        {chatRecord.map((r) => {
          if (r.isSelf) {
            return (
              <section className={styles.recordSection} key={r.id}>
                <div className={styles.content} style={{ marginRight: '8px' }}>
                  <div className={styles.text}>{r.content}</div>
                </div>
                <div className={styles.icon}>
                  <img
                    src={`https://joeschmoe.io/api/v1/${r.userId}`}
                    alt="icon"
                  />
                </div>
              </section>
            );
          } else {
            return (
              <section className={styles.recordSection} key={r.id}>
                <div className={styles.icon}>
                  <img
                    src={`https://joeschmoe.io/api/v1/${r.userId}`}
                    alt="icon"
                  />
                </div>
                <div className={styles.content} style={{ marginLeft: '8px' }}>
                  <div className={styles.name}>{r.name}</div>
                  <div className={styles.text}>{r.content}</div>
                </div>
              </section>
            );
          }
        })}
      </div>
      <div className={styles.input}>
        <Input.Group compact>
          <Input
            // style={{ width: 'calc(100% - 32px)' }}
            style={{ width: '100%' }}
            placeholder="input text or voice"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            onPressEnter={(e) => onPressEnter(e)}
          />
        </Input.Group>
      </div>
    </div>
  );
};
export default Message;
