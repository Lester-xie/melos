import React, { useCallback } from 'react';
import styles from './index.less';
import TrackItem from '@/components/trackItem';
import { useDispatch, useSelector } from 'umi';
import { cloneDeep } from 'lodash';
import { debouncePushAction } from '@/services/api';

interface Props {
  onAddBtnClicked: () => void;
  onDeleteClicked: (index: number) => void;
  tracks: any[];
}

export default function TrackList(props: Props) {
  const currentTracks = useSelector((state: any) => state.global.currentTracks);
  const dispatch = useDispatch();

  const onShift = useCallback(
    (value: number, index: number) => {
      const tracks = cloneDeep(currentTracks);
      if (tracks.length > 0) {
        tracks[index].startTime = value;
        dispatch?.({
          type: 'global/update',
          payload: {
            currentTracks: [...tracks],
          },
        });
      }
    },
    [currentTracks],
  );

  const onMute = useCallback(
    (mute: boolean, index: number) => {
      const tracks = cloneDeep(currentTracks);
      if (tracks.length > 0) {
        tracks[index].mute = mute;
        dispatch?.({
          type: 'global/update',
          payload: {
            currentTracks: [...tracks],
          },
        });
      }
    },
    [currentTracks],
  );

  const onSolo = useCallback(
    (solo: boolean, index: number) => {
      const tracks = cloneDeep(currentTracks);
      if (tracks.length > 0) {
        tracks[index].solo = solo;
        dispatch?.({
          type: 'global/update',
          payload: {
            currentTracks: [...tracks],
          },
        });
      }
    },
    [currentTracks],
  );

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
            onShift={onShift}
            onMute={onMute}
            onSolo={onSolo}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
