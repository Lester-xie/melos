import React, { useCallback, useEffect, useState } from 'react';
import { Slider } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import styles from './index.less';
import { ReactComponent as IconPlay } from '@/assets/icons/icon_play.svg';
import { Popconfirm } from 'antd';
import { debouncePushAction } from '@/services/api';
import { useSelector, useDispatch } from 'umi';
import useDebounce from '@/hooks/useDebounce';

interface Props {
  trackItem: any;
  item: {
    name: string;
    userName: string;
    avatar: string;
    status: string;
  };
  onDelete: () => void;
  index: number;
}

type ShiftType = 'auto' | 'manual';

export default function TrackItem({ trackItem, item, onDelete, index }: Props) {
  const [muted, setMuted] = useState<boolean>(false);
  const [solo, setSolo] = useState<boolean>(false);
  const [gain, setGain] = useState<number>(100);
  const [stereopan, setStereopan] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [shiftType, setShiftType] = useState<ShiftType>('auto');

  const debouncedStartTime = useDebounce(startTime, 500) as number;
  const debouncedShiftType = useDebounce(shiftType, 500) as ShiftType;

  const currentProject: { name: string; id: string } = useSelector(
    (state: any) => state.global.project,
  );

  const dispatch = useDispatch();

  useEffect(() => {
    if (debouncedStartTime !== null) {
      if (debouncedShiftType === 'manual') {
        dispatch({
          type: 'global/updateRow',
          attr: 'startTime',
          index,
          startTime: debouncedStartTime,
        });
        debouncePushAction(currentProject.id, 'changeShift', {
          value: debouncedStartTime,
          index,
        });
      }
    }
  }, [debouncedStartTime, debouncedShiftType]);

  // 初始化 mute && solo 的状态
  useEffect(() => {
    trackItem.ee.emit(
      'isInMutedTrack',
      trackItem,
      (isInMutedTrack: boolean) => {
        setMuted(isInMutedTrack);
      },
    );
    trackItem.ee.emit(
      'isInSoloedTrack',
      trackItem,
      (isInSoloedTrack: boolean) => {
        setSolo(isInSoloedTrack);
      },
    );

    trackItem.ee.on('solochanged', () => {
      trackItem.ee.emit(
        'isInSoloedTrack',
        trackItem,
        (isInSoloedTrack: boolean) => {
          setSolo(isInSoloedTrack);
        },
      );
    });

    const handleShift = (deltaTime: any, track: any, type: ShiftType) => {
      if (track._id === trackItem._id) {
        setShiftType(type);
        setStartTime(trackItem.getStartTime());
      }
    };

    trackItem.ee.on('shift', handleShift);

    const handleCutFinishd = (start: number, end: number, track: any) => {
      if (track._id === trackItem._id) {
        dispatch({ type: 'global/updateRow', attr: 'cut', index, start, end });
        debouncePushAction(currentProject.id, 'changeCut', {
          index,
          start,
          end,
        });
      }
    };

    trackItem.ee.on('cutfinishd', handleCutFinishd);

    const handlePasteFinished = (
      start: number,
      end: number,
      position: number,
      track: any,
      targetTrackIndex: number,
    ) => {
      if (track._id === trackItem._id) {
        dispatch({
          type: 'global/updateRow',
          attr: 'copy',
          index,
          start,
          end,
          position,
          targetTrackIndex,
        });
        debouncePushAction(currentProject.id, 'changeCopy', {
          index,
          start,
          end,
          position,
          targetTrackIndex,
        });
      }
    };

    trackItem.ee.on('pastefinished', handlePasteFinished);
  }, [trackItem]);

  const onMuteToggle = useCallback(() => {
    trackItem.ee.emit('mute', trackItem, (isInMutedTrack: boolean) => {
      setMuted(isInMutedTrack);
      dispatch({
        type: 'global/updateRow',
        attr: 'mute',
        index,
        mute: isInMutedTrack,
      });
      debouncePushAction(currentProject.id, 'changeMute', { index });
    });
  }, [trackItem, muted]);

  const onSoloToggle = useCallback(() => {
    trackItem.ee.emit('solo', trackItem, (isInSoloedTrack: boolean) => {
      setSolo(isInSoloedTrack);
      dispatch({
        type: 'global/updateRow',
        attr: 'solo',
        index,
        solo: isInSoloedTrack,
      });
      debouncePushAction(currentProject.id, 'changeSolo', { index });
    });
  }, [trackItem, solo]);

  useEffect(() => {
    setGain(trackItem?.gain * 100);
  }, [trackItem?.gain]);

  useEffect(() => {
    setStereopan(trackItem?.stereoPan * 100);
  }, [trackItem?.stereoPan]);

  const onVolumeChange = useCallback(
    (value: number) => {
      setGain(value);
      trackItem.ee.emit('volumechange', value, trackItem);
      dispatch({
        type: 'global/updateRow',
        attr: 'gain',
        index,
        gain: value / 100,
      });
      debouncePushAction(currentProject.id, 'changeVolume', { value, index });
    },
    [trackItem],
  );

  const onStereoChange = useCallback(
    (value: number) => {
      setStereopan(value);
      trackItem.ee.emit('stereopan', value / 100, trackItem);
      dispatch({
        type: 'global/updateRow',
        attr: 'stereoPan',
        index,
        stereoPan: value / 100,
      });
      debouncePushAction(currentProject.id, 'changeStereopan', {
        value,
        index,
      });
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
              onClick={onMuteToggle}
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
        <Popconfirm
          placement="topLeft"
          title="Confirm Delete？"
          onConfirm={onDelete}
          okText="Yes"
          cancelText="No"
        >
          <DeleteOutlined className={styles.delete} />
        </Popconfirm>
      </div>
      <div className={styles.blockLower}>
        <img
          src={require('@/assets/workshop/voice.png')}
          alt="voice"
          className={styles.voiceIcon}
        />
        <Slider
          className={styles.slider}
          value={gain}
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
      <div className={styles.blockLower}>
        <span className={styles.StereoText}>Stereo</span>
        <Slider
          className={styles.slider}
          value={stereopan}
          min={-100}
          max={100}
          onChange={onStereoChange}
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
            backgroundColor: 'transparent',
          }}
          marks={{
            '-100': {
              label: <div className={styles.label}>L</div>,
              style: {
                // transform: 'none',
              },
            },
            '100': {
              label: <div className={styles.label}>R</div>,
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
