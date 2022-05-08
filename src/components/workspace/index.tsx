import React, { useCallback, useState, useRef, useEffect } from 'react';
import EventEmitter from 'events';
//@ts-ignore
import WaveformPlaylist from '../../waveform-playlist/src/app.js';
import * as Tone from 'tone';
import { saveAs } from 'file-saver';
import { message } from 'antd';
import { cloneDeep } from 'lodash';
import styles from './index.less';

interface Props {
  token: string | null;
}

import {
  DownloadOutlined,
  SwapOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import Resource from '@/components/resource';
import TrackList from '@/components/trackList';
import { io } from 'socket.io-client';
import { debouncePushAction } from '@/services/api';

type State = 'cursor' | 'select';

export default function Workspace({ token }: Props) {
  const [ee] = useState(new EventEmitter());
  const [toneCtx, setToneCtx] = useState<any>(null);
  const setUpChain = useRef();

  const [showResource, setShowResource] = useState(false);
  const [trackList, setTrackList] = useState<any[]>([]);
  const [state, setState] = useState<State>('cursor');
  const [playContext, setPlayContext] = useState<any>(null);
  const [isNoneState, setIsNoneState] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  const onFileSelect = (file: any, type: 'cloud' | 'local') => {
    setIsNoneState(false);
    playContext.load([file]).then(() => {
      setTrackList([...playContext.tracks]);
    });
    if (type === 'local') {
      setShowResource(false);
    }
    debouncePushAction('addTrack', file);
  };

  useEffect(() => {
    setSocket(io(`https://www.metaapp.fun?token=${token}`));
  }, [token]);

  useEffect(() => {
    if (socket && playContext) {
      socket.removeAllListeners('action');
      socket.on('action', (arg: any) => {
        const { type, token: actionToken, data } = arg.extraBody;
        if (actionToken !== token) {
          switch (type) {
            case 'addTrack': {
              playContext.load([data]).then(() => {
                setTrackList([...playContext.tracks]);
              });
              break;
            }
            case 'changeVolume': {
              ee.emit('volumechange', data.value, trackList[data.index]);
              const newTrackList = cloneDeep(trackList);
              newTrackList[data.index].gain = data.value / 100;
              setTrackList([...newTrackList]);
              break;
            }
            case 'changeStereopan': {
              ee.emit('stereopan', data.value, trackList[data.index]);
              const newTrackList = cloneDeep(trackList);
              newTrackList[data.index].stereoPan = data.value / 100;
              setTrackList([...newTrackList]);
              break;
            }
          }
          message.success('Sync succeeded');
        }
      });
    }
  }, [socket, playContext, trackList]);

  useEffect(() => {
    setToneCtx(Tone.getContext());
  }, []);

  const container = useCallback(
    (node) => {
      if (node !== null && toneCtx !== null) {
        const playlist = WaveformPlaylist(
          {
            ac: toneCtx.rawContext,
            waveHeight: 158,
            container: node,
            timescale: true,
            state: 'select',
            colors: {
              waveOutlineColor: '#2f2f2f',
            },
            controls: {
              show: false,
            },
          },
          ee,
        );

        ee.on('audiorenderingstarting', function (offlineCtx, a) {
          // Set Tone offline to render effects properly.
          const offlineContext = new Tone.OfflineContext(offlineCtx);
          Tone.setContext(offlineContext);
          setUpChain.current = a;
        });

        ee.on('audiorenderingfinished', function (type, data) {
          //restore original ctx for further use.
          Tone.setContext(toneCtx);
          if (type === 'wav') {
            saveAs(data, 'test.wav');
          }
        });

        ee.on('audiosourcesloaded', function () {
          setPlayContext(null);
        });

        ee.on('audiosourcesrendered', function () {
          setPlayContext(playlist);
        });

        ee.on('select', function (start, end, track) {
          // console.log(start, end, track);
        });

        playlist.load(trackList).then(() => {
          setPlayContext(playlist);
        });

        //initialize the WAV exporter.
        playlist.initExporter();
      }
    },
    [ee, toneCtx],
  );

  const onPlayBtnClicked = () => {
    ee.emit('play');
  };

  const onPauseBtnClicked = () => {
    ee.emit('pause');
  };

  const onStopBtnClicked = () => {
    ee.emit('stop');
  };

  const onCursorBtnClicked = () => {
    setState('cursor');
    ee.emit('statechange', 'select');
  };

  const onSwapBtnClicked = () => {
    setState('select');
    ee.emit('statechange', 'shift');
  };

  const onTrimBtnClicked = () => {
    ee.emit('trim');
  };

  const onDownloadBtnClicked = () => {
    if (playContext && playContext.tracks.length > 0) {
      ee.emit('startaudiorendering', 'wav');
    }
  };

  const onAddBtnClicked = () => {
    setShowResource(true);
  };

  const onDeleteClicked = (index: number) => {
    ee.emit('removeTrack', playContext.tracks[index]);
    setTrackList([...playContext.tracks]);
    setIsNoneState(playContext.tracks.length === 0);
  };

  const onCopyBtnClicked = () => {
    console.log('copy...');
    ee.emit('copy');
  };

  const onPasteBtnClicked = () => {
    console.log('paste...');
    ee.emit('paste');
  };

  return (
    <div className={styles.container}>
      <div>
        <Resource
          show={showResource}
          onClose={() => setShowResource(false)}
          onSelect={onFileSelect}
        />
        <TrackList
          tracks={trackList}
          onAddBtnClicked={onAddBtnClicked}
          onDeleteClicked={onDeleteClicked}
        />
      </div>
      <div className={styles.trackContainer}>
        <div className={styles.operation}>
          <div className={styles.trackTransport}>
            <button onClick={onStopBtnClicked} className={styles.stopBtn} />
            <button onClick={onPlayBtnClicked} className={styles.playBtn} />
            <button onClick={onPauseBtnClicked} className={styles.pauseBtn} />
          </div>
          <div className={styles.trackTransport}>
            <button
              onClick={onCursorBtnClicked}
              className={state === 'cursor' ? styles.activeState : ''}
            >
              <img
                src={require('@/assets/workshop/cursor.png')}
                alt="cursor"
                className={styles.cursorIcon}
              />
            </button>
            <button
              onClick={onSwapBtnClicked}
              className={state === 'select' ? styles.activeState : ''}
            >
              <SwapOutlined />
            </button>
            <button className={styles.copyBtn} onClick={onCopyBtnClicked} />
            <button className={styles.pasteBtn} onClick={onPasteBtnClicked} />
            <button className={styles.cutBtn} onClick={onTrimBtnClicked} />
            <button>
              <UndoOutlined />
            </button>
            <button onClick={onDownloadBtnClicked}>
              <DownloadOutlined />
            </button>
          </div>
        </div>
        <div className={styles.trackWrap}>
          {!isNoneState && <div ref={container} className={styles.trackList} />}
        </div>
      </div>
    </div>
  );
}
