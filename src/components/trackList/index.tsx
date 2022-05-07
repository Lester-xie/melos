import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import styles from './index.less';
import TrackItem from '@/components/trackItem';

type Tab = 'M' | 'S' | 'R' | 'W' | 'A' | '';

interface Props {
  onAddBtnClicked: () => void;
  onDeleteClicked: (index: number) => void;
  tracks: any[];
}

export default function TrackList(props: Props) {
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
            key={item.name}
            trackItem={item}
            item={{
              name: item.name,
              userName: 'John Doe',
              avatar: `https://joeschmoe.io/api/v1/${item.name}`,
              status: 'online',
            }}
            onDelete={() => props.onDeleteClicked(index)}
          />
        ))}
      </div>
    </div>
  );
}
