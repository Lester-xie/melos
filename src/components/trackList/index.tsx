import React, { useCallback, useState, useEffect, useRef } from 'react';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.less';
import TrackItem from '@/components/trackItem';
import classNames from 'classnames';

type Tab = 'M' | 'S' | 'R' | 'W' | 'A' | '';

interface Props {
  onAddBtnClicked: () => void;
  tracks: any[];
}

export default function Resource(props: Props) {
  const [tab, setTab] = useState<Tab>('');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => setTab('M')}
          className={tab === 'M' ? styles.active : ''}
        >
          M
        </button>
        <button
          onClick={() => setTab('S')}
          className={tab === 'S' ? styles.active : ''}
        >
          S
        </button>
        <button
          onClick={() => setTab('R')}
          className={tab === 'R' ? styles.active : ''}
        >
          R
        </button>
        <button
          onClick={() => setTab('W')}
          className={tab === 'W' ? styles.active : ''}
        >
          W
        </button>
        <button
          onClick={() => setTab('A')}
          className={tab === 'A' ? styles.active : ''}
        >
          A
        </button>
        <button className={styles.btnAdd} onClick={props?.onAddBtnClicked}>
          <PlusOutlined />
        </button>
      </div>
      <div className={styles.trackList}>
        {props?.tracks?.map((item, index) => (
          <TrackItem
            trackItem={item}
            item={{
              name: item.name,
              userName: 'John Doe',
              avatar: 'https://i.pravatar.cc/50',
              status: 'online',
            }}
          />
        ))}
        {/* <TrackItem item={{
          name: 'audio\'s name',
          userName: 'John Doe',
          avatar: 'https://i.pravatar.cc/50',
          status: 'online'
        }}/>
        <TrackItem item={{
          name: 'audio\'s name',
          userName: 'John Doe',
          avatar: 'https://i.pravatar.cc/100',
          status: 'idle'
        }}/> */}
      </div>
    </div>
  );
}
