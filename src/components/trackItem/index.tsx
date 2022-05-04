import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Slider } from 'antd';
import {
  CloseOutlined,
  PlusOutlined,
  CaretRightFilled,
} from '@ant-design/icons';
import classNames from 'classnames';
import styles from './index.less';
import { ReactComponent as IconPlay } from '@/assets/icons/icon_play.svg';

interface Props {
  trackItem: any;
  item: {
    name: string;
    userName: string;
    avatar: string;
    status: string;
  };
}

export default function TrackItem({ trackItem, item }: Props) {
  const [muted, setMuted] = useState<boolean>(false);
  const [solo, setSolo] = useState<boolean>(false);

  const onMute = useCallback(() => {
    trackItem.ee.emit('mute', trackItem);
    setMuted(!muted);
  }, [trackItem, muted]);

  const onSoloToggle = useCallback(() => {
    trackItem.ee.emit('solo', trackItem);
    setSolo(!solo);
  }, [trackItem, solo]);

  const onVolumeChange = useCallback(
    (value: number) => {
      trackItem.ee.emit('volumechange', value, trackItem);
    },
    [trackItem],
  );

  const onPlay = useCallback(() => {
    trackItem.ee.emit('play');
  }, [trackItem]);

  return (
    <div className={styles.container}>
      <div className={styles.blockUpper}>
        <div className={styles.avatarWrapper}>
          <img
            className={styles.avatar}
            alt={item?.userName}
            src={item?.avatar}
          />
          <div className={classNames(styles.indicator, item?.status)} />
        </div>
        <div className={styles.nameWrapper}>
          <span className={styles.name}>{item?.name}</span>
          <div className={styles.buttonWrapper}>
            <button
              type="button"
              className={muted ? styles.active : ''}
              onClick={onMute}
            >
              M
            </button>
            <button
              type="button"
              className={solo ? styles.active : ''}
              onClick={onSoloToggle}
            >
              S
            </button>
            <button type="button" disabled>
              R
            </button>
            <button type="button" onClick={onPlay}>
              <IconPlay className={styles.playIcon} />
            </button>
            <button type="button" disabled>
              <div className={styles.circleIcon} />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.blockLower}>
        <button type="button" className={styles.active}>
          C
        </button>
        <button type="button" disabled>
          M
        </button>
        <button type="button" disabled>
          S
        </button>
        <Slider
          className={styles.slider}
          defaultValue={trackItem?.gain * 100 || 100}
          min={0}
          max={100}
          onChange={onVolumeChange}
          handleStyle={{
            width: '7px',
            height: '13px',
            background: '#3183FF',
            boxShadow: '0px 2px 4px 1px rgba(185, 106, 37, 0.4)',
            border: 'none',
          }}
          trackStyle={{
            height: '5px',
            borderRadius: '26px',
            backgroundColor: '#3183FF',
          }}
          marks={{
            '0': {
              label: <div className={styles.label}>0</div>,
              style: {
                // transform: 'none',
              },
            },
            '100': {
              label: <div className={styles.label}>100</div>,
              style: {
                transform: 'translateX(-80%)',
              },
            },
          }}
        />
      </div>
    </div>
  );
}
