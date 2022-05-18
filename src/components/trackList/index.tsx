import React from 'react';
import styles from './index.less';
import TrackItem from '@/components/trackItem';

interface Props {
  onAddBtnClicked: () => void;
  onDeleteClicked: (index: number) => void;
  tracks: any[];
}

export default function TrackList(props: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.trackList}>
        {props?.tracks?.map((item, index) => (
          <TrackItem
            key={item.name + index}
            trackItem={item}
            item={{
              name: item.name,
              userName: 'John Doe',
              avatar: `https://joeschmoe.io/api/v1/${item.name}`,
              status: 'online',
            }}
            onDelete={() => props.onDeleteClicked(index)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
