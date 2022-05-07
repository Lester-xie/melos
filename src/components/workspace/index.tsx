import React, { useCallback, useState, useRef, useEffect } from 'react';
import EventEmitter from 'events';
//@ts-ignore
import WaveformPlaylist from '../../waveform-playlist/src/app.js';
import * as Tone from 'tone';
import { saveAs } from 'file-saver';
import styles from './index.less';

import {
  DownloadOutlined,
  SwapOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import Resource from '@/components/resource';
import TrackList from '@/components/trackList';
import { io } from 'socket.io-client';

type State = 'cursor' | 'select';

const useSocket = () => {
  useEffect(() => {
    const token = window.localStorage.getItem('token');
    const socket = io(`ws://8.218.125.220?token=${token}`);
    socket.on('connect', () => {
      console.log(socket.id);
    });
  }, []);
};

export default function Workspace() {
  const [ee] = useState(new EventEmitter());
  const [toneCtx, setToneCtx] = useState<any>(null);
  const setUpChain = useRef();

  const [showResource, setShowResource] = useState(false);
  const [trackList, setTrackList] = useState<any[]>([]);
  const [state, setState] = useState<State>('cursor');
  const [playContext, setPlayContext] = useState<any>(null);

  // useSocket();

  useEffect(() => {
    setToneCtx(Tone.getContext());
    // window.localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MjczOTRlNjA3YWQ5OTNmYzgwYjI4MjMiLCJuYW1lIjoiTGVzdGVyIiwiZXhwIjoxNjU0NDExMTQyLCJpYXQiOjE2NTE4MTkxNDJ9.mjOj2nvIPPLoCd8fna5KaHJ85KnGFjA-PH9z_B4RnrM')
  }, []);

  const container = useCallback(
    (node) => {
      if (node !== null && toneCtx !== null) {
        const playlist = WaveformPlaylist(
          {
            ac: toneCtx.rawContext,
            waveHeight: 116,
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
  };

  const onFileSelect = (file: any, type: 'cloud' | 'local') => {
    playContext.load([file]).then(() => {
      setTrackList([...playContext.tracks]);
    });
    if (type === 'local') {
      setShowResource(false);
    }
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
          <div ref={container} className={styles.trackList} />
        </div>
      </div>
    </div>
  );
}
