import React, { useEffect } from 'react';
import styles from './index.less';
import TrackItem from '@/components/trackItem';
import { useSelector } from 'umi';

interface Props {
  onDeleteClicked: (index: number) => void;
  onRevokeClicked: (index: number, callback: any) => void;
  tracks: any[];
}

export default function TrackList(props: Props) {
  const currentTracks = useSelector((state: any) => state.global.currentTracks);

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
              avatar: `https://joeschmoe.io/api/v1/${currentTracks[index]?.userId}`,
              status: 'online',
            }}
            onDelete={() => props.onDeleteClicked(index)}
            onRevoke={(callback) => props.onRevokeClicked(index, callback)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
