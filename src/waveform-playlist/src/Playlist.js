import _defaults from 'lodash.defaultsdeep';

import h from 'virtual-dom/h';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';
import InlineWorker from 'inline-worker';

import { pixelsToSeconds } from './utils/conversions';
import { resampleAudioBuffer } from './utils/audioData';
import LoaderFactory from './track/loader/LoaderFactory';
import ScrollHook from './render/ScrollHook';
import TimeScale from './TimeScale';
import Track from './Track';
import Playout from './Playout';
import AnnotationList from './annotation/AnnotationList';
import { secondsToSamples } from './utils/conversions';

import RecorderWorkerFunction from './utils/recorderWorker';
import ExportWavWorkerFunction from './utils/exportWavWorker';

export default class {
  constructor() {
    this.tracks = [];
    this.soloedTracks = [];
    this.mutedTracks = [];
    this.collapsedTracks = [];
    this.playoutPromises = [];

    this.cursor = 0;
    this.playbackSeconds = 0;
    this.duration = 0;
    this.scrollLeft = 0;
    this.scrollTimer = undefined;
    this.showTimescale = false;
    // whether a user is scrolling the waveform
    this.isScrolling = false;

    this.fadeType = 'logarithmic';
    this.masterGain = 1;
    this.annotations = [];
    this.durationFormat = 'hh:mm:ss.uuu';
    this.isAutomaticScroll = false;
    this.resetDrawTimer = undefined;
    this.copy = {}; // start, end, track
  }

  // TODO extract into a plugin
  initExporter() {
    this.exportWorker = new InlineWorker(ExportWavWorkerFunction);
  }

  // TODO extract into a plugin
  initRecorder(stream) {
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.onstart = () => {
      const track = new Track();
      track.setName('Recording');
      track.setEnabledStates();
      track.setEventEmitter(this.ee);

      this.recordingTrack = track;
      this.tracks.push(track);

      this.chunks = [];
      this.working = false;
    };

    this.mediaRecorder.ondataavailable = (e) => {
      this.chunks.push(e.data);

      // throttle peaks calculation
      if (!this.working) {
        const recording = new Blob(this.chunks, {
          type: 'audio/ogg; codecs=opus',
        });
        const loader = LoaderFactory.createLoader(recording, this.ac);
        loader
          .load()
          .then((audioBuffer) => {
            // ask web worker for peaks.
            this.recorderWorker.postMessage({
              samples: audioBuffer.getChannelData(0),
              samplesPerPixel: this.samplesPerPixel,
            });
            this.recordingTrack.setCues(0, audioBuffer.duration);
            this.recordingTrack.setBuffer(audioBuffer);
            this.recordingTrack.setPlayout(
              new Playout(this.ac, audioBuffer, this.masterGainNode),
            );
            this.adjustDuration();
          })
          .catch(() => {
            this.working = false;
          });
        this.working = true;
      }
    };

    this.mediaRecorder.onstop = () => {
      this.chunks = [];
      this.working = false;
    };

    this.recorderWorker = new InlineWorker(RecorderWorkerFunction);
    // use a worker for calculating recording peaks.
    this.recorderWorker.onmessage = (e) => {
      this.recordingTrack.setPeaks(e.data);
      this.working = false;
      this.drawRequest();
    };
  }

  setShowTimeScale(show) {
    this.showTimescale = show;
  }

  setMono(mono) {
    this.mono = mono;
  }

  setExclSolo(exclSolo) {
    this.exclSolo = exclSolo;
  }

  setSeekStyle(style) {
    this.seekStyle = style;
  }

  getSeekStyle() {
    return this.seekStyle;
  }

  setSampleRate(sampleRate) {
    this.sampleRate = sampleRate;
  }

  setSamplesPerPixel(samplesPerPixel) {
    this.samplesPerPixel = samplesPerPixel;
  }

  setAudioContext(ac) {
    this.ac = ac;
    this.masterGainNode = ac.createGain();
  }

  getAudioContext() {
    return this.ac;
  }

  setControlOptions(controlOptions) {
    this.controls = controlOptions;
  }

  setWaveHeight(height) {
    this.waveHeight = height;
  }

  setCollapsedWaveHeight(height) {
    this.collapsedWaveHeight = height;
  }

  setColors(colors) {
    this.colors = colors;
  }

  setBarWidth(width) {
    this.barWidth = width;
  }

  setBarGap(width) {
    this.barGap = width;
  }

  setAnnotations(config) {
    const controlWidth = this.controls.show ? this.controls.width : 0;
    this.annotationList = new AnnotationList(
      this,
      config.annotations,
      config.controls,
      config.editable,
      config.linkEndpoints,
      config.isContinuousPlay,
      controlWidth,
    );
  }

  setEffects(effectsGraph) {
    this.effectsGraph = effectsGraph;
  }

  setEventEmitter(ee) {
    this.ee = ee;
  }

  getEventEmitter() {
    return this.ee;
  }

  setUpEventEmitter() {
    const ee = this.ee;

    ee.on('automaticscroll', (val) => {
      this.isAutomaticScroll = val;
    });

    ee.on('durationformat', (format) => {
      this.durationFormat = format;
      this.drawRequest();
    });

    ee.on('select', (start, end, track) => {
      if (this.isPlaying()) {
        this.lastSeeked = start;
        this.pausedAt = undefined;
        this.restartPlayFrom(start);
      } else {
        // reset if it was paused.
        this.seek(start, end, track);
        this.ee.emit('timeupdate', start);
        this.drawRequest();
      }
    });

    ee.on('startaudiorendering', (type) => {
      this.startOfflineRender(type);
    });

    ee.on('statechange', (state) => {
      this.setState(state);
      this.drawRequest();
    });

    ee.on('shift', (deltaTime, track) => {
      track.setStartTime(track.getStartTime() + deltaTime);
      this.adjustDuration();
      this.drawRequest();
    });

    ee.on('record', () => {
      this.record();
    });

    ee.on('play', (start, end) => {
      this.play(start, end);
    });

    ee.on('pause', () => {
      this.pause();
    });

    ee.on('stop', () => {
      this.stop();
    });

    ee.on('rewind', () => {
      this.rewind();
    });

    ee.on('fastforward', () => {
      this.fastForward();
    });

    ee.on('clear', () => {
      this.clear().then(() => {
        this.drawRequest();
      });
    });

    ee.on('solo', (track, callback) => {
      this.soloTrack(track);
      this.adjustTrackPlayout();
      this.drawRequest();
      callback &&
        callback(!!this.soloedTracks.find((item) => item._id === track._id));
      this.ee.emit('solochanged', this.tracks);
    });

    ee.on('isInSoloedTrack', (track, callback) => {
      callback(!!this.soloedTracks.find((item) => item._id === track._id));
    });

    ee.on('mute', (track, callback) => {
      this.muteTrack(track);
      this.adjustTrackPlayout();
      this.drawRequest();
      callback &&
        callback(!!this.mutedTracks.find((item) => item._id === track._id));
    });

    ee.on('isInMutedTrack', (track, callback) => {
      callback(!!this.mutedTracks.find((item) => item._id === track._id));
    });

    ee.on('removeTrack', (track) => {
      this.removeTrack(track);
      this.adjustTrackPlayout();
      this.drawRequest();
    });

    ee.on('changeTrackView', (track, opts) => {
      this.collapseTrack(track, opts);
      this.drawRequest();
    });

    ee.on('volumechange', (volume, track) => {
      track.setGainLevel(volume / 100);
      this.drawRequest();
    });

    ee.on('mastervolumechange', (volume) => {
      this.masterGain = volume / 100;
      this.tracks.forEach((track) => {
        track.setMasterGainLevel(this.masterGain);
      });
    });

    ee.on('fadein', (duration, track) => {
      track.setFadeIn(duration, this.fadeType);
      this.drawRequest();
    });

    ee.on('fadeout', (duration, track) => {
      track.setFadeOut(duration, this.fadeType);
      this.drawRequest();
    });

    ee.on('stereopan', (panvalue, track) => {
      track.setStereoPanValue(panvalue);
      this.drawRequest();
    });

    ee.on('fadetype', (type) => {
      this.fadeType = type;
    });

    ee.on('newtrack', (file) => {
      this.load([file]);
    });

    ee.on('trim', () => {
      const activeTrack = this.getActiveTrack();
      if (!activeTrack) {
        return;
      }
      const { start, end } = this.getTimeSelection();
      const sampleRate = activeTrack.buffer.sampleRate;
      const startIdx = secondsToSamples(start, sampleRate);
      const endIdx = secondsToSamples(end, sampleRate);

      const activeAudioBuffer = activeTrack.buffer;

      const len = activeAudioBuffer.length;
      const numberOfChannels = activeAudioBuffer.numberOfChannels;
      const newBuffer = this.ac.createBuffer(
        numberOfChannels,
        len - (endIdx - startIdx),
        sampleRate,
      );

      for (var channel = 0; channel < numberOfChannels; channel++) {
        var oldBuffering = activeAudioBuffer.getChannelData(channel);
        var newBuufering = newBuffer.getChannelData(channel);

        // 填充 选择区域前面的数据
        let newBufferIdx = 0;
        for (var i = 0; i < startIdx; i++) {
          newBuufering[newBufferIdx] = oldBuffering[i];
          newBufferIdx++;
        }

        // 填充 选择区域后面的数据
        for (var i = endIdx; i < len; i++) {
          newBuufering[newBufferIdx] = oldBuffering[i];
          newBufferIdx++;
        }
      }
      this.selection;

      activeTrack.setBuffer(newBuffer);
      activeTrack.setCues(0, newBuffer.duration); //必不可少，否则频谱图不会变
      activeTrack.calculatePeaks(this.samplesPerPixel, sampleRate);
      // webaudio specific playout for now.
      const playout = new Playout(this.ac, newBuffer, this.masterGainNode);
      activeTrack.setPlayout(playout);

      this.setTimeSelection(0, 0);
      this.adjustDuration();
      this.drawRequest();
      this.draw(this.render());

      this.ee.emit('cutfinishd', start, end, activeTrack);

      // track.trim(timeSelection.start, timeSelection.end);
      // track.calculatePeaks(this.samplesPerPixel, this.sampleRate);

      // this.setTimeSelection(0, 0);
      // this.drawRequest();
    });

    ee.on('cut', (start, end, index) => {
      const activeTrack = this.tracks[index];
      if (!activeTrack) {
        return;
      }

      const sampleRate = activeTrack.buffer.sampleRate;
      const startIdx = secondsToSamples(start, sampleRate);
      const endIdx = secondsToSamples(end, sampleRate);

      const activeAudioBuffer = activeTrack.buffer;

      const len = activeAudioBuffer.length;
      const numberOfChannels = activeAudioBuffer.numberOfChannels;
      const newBuffer = this.ac.createBuffer(
        numberOfChannels,
        len - (endIdx - startIdx),
        sampleRate,
      );

      for (var channel = 0; channel < numberOfChannels; channel++) {
        var oldBuffering = activeAudioBuffer.getChannelData(channel);
        var newBuufering = newBuffer.getChannelData(channel);

        // 填充 选择区域前面的数据
        let newBufferIdx = 0;
        for (var i = 0; i < startIdx; i++) {
          newBuufering[newBufferIdx] = oldBuffering[i];
          newBufferIdx++;
        }

        // 填充 选择区域后面的数据
        for (var i = endIdx; i < len; i++) {
          newBuufering[newBufferIdx] = oldBuffering[i];
          newBufferIdx++;
        }
      }
      this.selection;

      activeTrack.setBuffer(newBuffer);
      activeTrack.setCues(0, newBuffer.duration); //必不可少，否则频谱图不会变
      activeTrack.calculatePeaks(this.samplesPerPixel, sampleRate);
      // webaudio specific playout for now.
      const playout = new Playout(this.ac, newBuffer, this.masterGainNode);
      activeTrack.setPlayout(playout);

      this.setTimeSelection(0, 0);
      this.adjustDuration();
      this.drawRequest();
      this.draw(this.render());
    });

    ee.on('copy', () => {
      const track = this.getActiveTrack();
      if (!track) {
        return;
      }
      const timeSelection = this.getTimeSelection();
      console.log(`复制的区域: ${timeSelection.start} -  ${timeSelection.end}`);

      this.copy = {
        start: timeSelection.start - track.startTime,
        end: timeSelection.end - track.startTime,
        track,
      };
    });

    ee.on('paste', () => {
      const activeTrack = this.getActiveTrack();
      if (!activeTrack) {
        return;
      }
      console.log('当前的track', activeTrack);

      // 复制的信息
      if (!this.copy || !this.copy.start) {
        alert('your should copy first');
        return;
      }

      const { start, end, track: copyedTrack } = this.copy;
      const sampleRate = activeTrack.buffer.sampleRate; // TODO 不同音频复制，可能需要转换采样率
      const startIdx = secondsToSamples(start, sampleRate);
      const endIdx = secondsToSamples(end, sampleRate);
      const appendLen = endIdx - startIdx;

      const timeSelection = this.timeSelection;
      console.log('timeSelection: ', timeSelection);
      if (timeSelection.start != timeSelection.end) {
        console.warn('请选择一个复制的位置，黄线指示的位置');
        return;
      }

      console.log('将被复制到（秒）: ', timeSelection.start);

      const { startTime, endTime } = activeTrack;
      // 创建一个新的 audio buffer
      const activeAudioBuffer = activeTrack.buffer;
      const copyedAudioBuffer = copyedTrack.buffer;

      const len = activeAudioBuffer.length;
      const numberOfChannels = activeAudioBuffer.numberOfChannels;
      let newBuffer = null;

      if (
        timeSelection.start < activeTrack.endTime &&
        timeSelection.start > activeTrack.startTime
      ) {
        const pasteAt = secondsToSamples(
          timeSelection.start - activeTrack.startTime,
          sampleRate,
        );
        // 复制在中间
        newBuffer = this.ac.createBuffer(
          numberOfChannels,
          len + appendLen,
          sampleRate,
        );

        for (var channel = 0; channel < numberOfChannels; channel++) {
          var oldBuffering = activeAudioBuffer.getChannelData(channel);
          var newBuufering = newBuffer.getChannelData(channel);
          var copyedBuffering = copyedAudioBuffer.getChannelData(channel);

          // 填充 pasteAt 之前的数据
          for (var i = 0; i < pasteAt; i++) {
            newBuufering[i] = oldBuffering[i];
          }

          // 填充 pasteAt 后的数据
          for (var i = pasteAt; i < len; i++) {
            newBuufering[i + appendLen] = oldBuffering[i];
          }

          // 填充复制的数据
          for (var i = pasteAt; i < pasteAt + appendLen; i++) {
            newBuufering[i] = copyedBuffering[startIdx + i - pasteAt];
          }
        }

        console.log('new buffer:', newBuffer);
      } else if (timeSelection.start < activeTrack.startTime) {
        // 插入到左侧
        const newDuration = activeTrack.endTime - timeSelection.start;
        const whiteDuration =
          activeTrack.startTime - timeSelection.start - (end - start);
        if (whiteDuration >= 0) {
          newBuffer = this.ac.createBuffer(
            numberOfChannels,
            secondsToSamples(newDuration, sampleRate),
            sampleRate,
          );

          for (var channel = 0; channel < numberOfChannels; channel++) {
            var oldBuffering = activeAudioBuffer.getChannelData(channel);
            var newBuufering = newBuffer.getChannelData(channel);
            var copyedBuffering = copyedAudioBuffer.getChannelData(channel);

            // 填充复制的数据
            for (var i = 0; i < appendLen; i++) {
              newBuufering[i] = copyedBuffering[startIdx + i];
            }

            // 填充空白数据
            const whiteLen = secondsToSamples(whiteDuration, sampleRate);
            for (var i = appendLen; i < appendLen + whiteLen; i++) {
              newBuufering[i] = 0;
            }

            // 填充原始数据
            for (var i = 0; i < len; i++) {
              newBuufering[i + appendLen + whiteLen] = oldBuffering[i];
            }
          }

          activeTrack.startTime = timeSelection.start;
        } else {
          alert('the select area is too short');
        }
      } else if (timeSelection.start >= activeTrack.endTime) {
        // 插入到左侧
        const newDuration = timeSelection.start + (end - start);
        const whiteDuration = timeSelection.start - activeTrack.endTime;
        if (whiteDuration >= 0) {
          newBuffer = this.ac.createBuffer(
            numberOfChannels,
            secondsToSamples(newDuration, sampleRate),
            sampleRate,
          );

          for (var channel = 0; channel < numberOfChannels; channel++) {
            var oldBuffering = activeAudioBuffer.getChannelData(channel);
            var newBuufering = newBuffer.getChannelData(channel);
            var copyedBuffering = copyedAudioBuffer.getChannelData(channel);

            // 填充原始数据
            for (var i = 0; i < len; i++) {
              newBuufering[i] = oldBuffering[i];
            }

            // 填充空白数据
            const whiteLen = secondsToSamples(whiteDuration, sampleRate);
            for (var i = len; i < len + whiteLen; i++) {
              newBuufering[i] = 0;
            }

            // 填充复制的数据
            for (var i = 0; i < appendLen; i++) {
              newBuufering[i + len + whiteLen] = copyedBuffering[startIdx + i];
            }
          }

          activeTrack.endTime = timeSelection.end + (end - start);
        } else {
          alert('the select area is too short');
        }
      }

      this.copy = null;

      let targetTrackIndex = null;

      this.tracks.forEach((item, index) => {
        if (item._id === activeTrack._id) {
          targetTrackIndex = index;
        }
      });

      this.ee.emit(
        'pastefinished',
        start,
        end,
        timeSelection.start,
        copyedTrack,
        targetTrackIndex,
      );

      activeTrack.setBuffer(newBuffer);
      activeTrack.setCues(0, newBuffer.duration); //必不可少，否则频谱图不会变
      activeTrack.calculatePeaks(this.samplesPerPixel, sampleRate);
      // webaudio specific playout for now.
      const playout = new Playout(this.ac, newBuffer, this.masterGainNode);
      activeTrack.setPlayout(playout);

      this.adjustDuration();
      this.drawRequest();
      this.draw(this.render());
    });

    ee.on('autoPaste', (s, e, position, copiedIndex, targetTrackIndex) => {
      const activeTrack = this.tracks[targetTrackIndex];
      if (!activeTrack) {
        return;
      }
      const start = s;
      const end = e;
      const copyedTrack = this.tracks[copiedIndex];
      const sampleRate = activeTrack.buffer.sampleRate; // TODO 不同音频复制，可能需要转换采样率
      const startIdx = secondsToSamples(start, sampleRate);
      const endIdx = secondsToSamples(end, sampleRate);
      const appendLen = endIdx - startIdx;

      const timeSelection = { start: position, end: position };
      if (timeSelection.start != timeSelection.end) {
        console.warn('请选择一个复制的位置，黄线指示的位置');
        return;
      }

      console.log('将被复制到（秒）: ', timeSelection.start);

      const { startTime, endTime } = activeTrack;
      // 创建一个新的 audio buffer
      const activeAudioBuffer = activeTrack.buffer;
      const copyedAudioBuffer = copyedTrack.buffer;

      const len = activeAudioBuffer.length;
      const numberOfChannels = activeAudioBuffer.numberOfChannels;
      let newBuffer = null;

      if (
        timeSelection.start < activeTrack.endTime &&
        timeSelection.start > activeTrack.startTime
      ) {
        const pasteAt = secondsToSamples(
          timeSelection.start - activeTrack.startTime,
          sampleRate,
        );
        // 复制在中间
        newBuffer = this.ac.createBuffer(
          numberOfChannels,
          len + appendLen,
          sampleRate,
        );

        for (var channel = 0; channel < numberOfChannels; channel++) {
          var oldBuffering = activeAudioBuffer.getChannelData(channel);
          var newBuufering = newBuffer.getChannelData(channel);
          var copyedBuffering = copyedAudioBuffer.getChannelData(channel);

          // 填充 pasteAt 之前的数据
          for (var i = 0; i < pasteAt; i++) {
            newBuufering[i] = oldBuffering[i];
          }

          // 填充 pasteAt 后的数据
          for (var i = pasteAt; i < len; i++) {
            newBuufering[i + appendLen] = oldBuffering[i];
          }

          // 填充复制的数据
          for (var i = pasteAt; i < pasteAt + appendLen; i++) {
            newBuufering[i] = copyedBuffering[startIdx + i - pasteAt];
          }
        }

        console.log('new buffer:', newBuffer);
      } else if (timeSelection.start < activeTrack.startTime) {
        // 插入到左侧
        const newDuration = activeTrack.endTime - timeSelection.start;
        const whiteDuration =
          activeTrack.startTime - timeSelection.start - (end - start);
        if (whiteDuration >= 0) {
          newBuffer = this.ac.createBuffer(
            numberOfChannels,
            secondsToSamples(newDuration, sampleRate),
            sampleRate,
          );

          for (var channel = 0; channel < numberOfChannels; channel++) {
            var oldBuffering = activeAudioBuffer.getChannelData(channel);
            var newBuufering = newBuffer.getChannelData(channel);
            var copyedBuffering = copyedAudioBuffer.getChannelData(channel);

            // 填充复制的数据
            for (var i = 0; i < appendLen; i++) {
              newBuufering[i] = copyedBuffering[startIdx + i];
            }

            // 填充空白数据
            const whiteLen = secondsToSamples(whiteDuration, sampleRate);
            for (var i = appendLen; i < appendLen + whiteLen; i++) {
              newBuufering[i] = 0;
            }

            // 填充原始数据
            for (var i = 0; i < len; i++) {
              newBuufering[i + appendLen + whiteLen] = oldBuffering[i];
            }
          }

          activeTrack.startTime = timeSelection.start;
        } else {
          alert('the select area is too short');
          return;
        }
      } else if (timeSelection.start >= activeTrack.endTime) {
        // 插入到左侧
        const newDuration = timeSelection.start + (end - start);
        const whiteDuration = timeSelection.start - activeTrack.endTime;
        if (whiteDuration >= 0) {
          newBuffer = this.ac.createBuffer(
            numberOfChannels,
            secondsToSamples(newDuration, sampleRate),
            sampleRate,
          );

          for (var channel = 0; channel < numberOfChannels; channel++) {
            var oldBuffering = activeAudioBuffer.getChannelData(channel);
            var newBuufering = newBuffer.getChannelData(channel);
            var copyedBuffering = copyedAudioBuffer.getChannelData(channel);

            // 填充原始数据
            for (var i = 0; i < len; i++) {
              newBuufering[i] = oldBuffering[i];
            }

            // 填充空白数据
            const whiteLen = secondsToSamples(whiteDuration, sampleRate);
            for (var i = len; i < len + whiteLen; i++) {
              newBuufering[i] = 0;
            }

            // 填充复制的数据
            for (var i = 0; i < appendLen; i++) {
              newBuufering[i + len + whiteLen] = copyedBuffering[startIdx + i];
            }
          }

          activeTrack.endTime = timeSelection.end + (end - start);
        } else {
          alert('the select area is too short');
          return;
        }
      }

      this.copy = null;

      activeTrack.setBuffer(newBuffer);
      activeTrack.setCues(0, newBuffer.duration); //必不可少，否则频谱图不会变
      activeTrack.calculatePeaks(this.samplesPerPixel, sampleRate);
      // webaudio specific playout for now.
      const playout = new Playout(this.ac, newBuffer, this.masterGainNode);
      activeTrack.setPlayout(playout);

      this.adjustDuration();
      this.drawRequest();
      this.draw(this.render());
    });

    ee.on('zoomin', () => {
      const zoomIndex = Math.max(0, this.zoomIndex - 1);
      const zoom = this.zoomLevels[zoomIndex];

      if (zoom !== this.samplesPerPixel) {
        this.setZoom(zoom);
        this.drawRequest();
      }
    });

    ee.on('zoomout', () => {
      const zoomIndex = Math.min(
        this.zoomLevels.length - 1,
        this.zoomIndex + 1,
      );
      const zoom = this.zoomLevels[zoomIndex];

      if (zoom !== this.samplesPerPixel) {
        this.setZoom(zoom);
        this.drawRequest();
      }
    });

    ee.on('scroll', () => {
      this.isScrolling = true;
      this.drawRequest();
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        this.isScrolling = false;
      }, 200);
    });
  }

  load(trackList) {
    this.ee.emit('audiosourcesstartload', trackList);
    const loadPromises = trackList.map((trackInfo) => {
      const loader = LoaderFactory.createLoader(
        trackInfo.src,
        this.ac,
        this.ee,
      );
      return loader.load().then((audioBuffer) => {
        if (audioBuffer.sampleRate === this.sampleRate) {
          return audioBuffer;
        } else {
          return resampleAudioBuffer(audioBuffer, this.sampleRate);
        }
      });
    });

    return Promise.all(loadPromises)
      .then((audioBuffers) => {
        this.ee.emit('audiosourcesloaded');

        const tracks = audioBuffers.map((audioBuffer, index) => {
          const info = trackList[index];
          const name = info.name || 'Untitled';
          const start = info.start || 0;
          const states = info.states || {};
          const fadeIn = info.fadeIn;
          const fadeOut = info.fadeOut;
          const cueIn = info.cuein || 0;
          const cueOut = info.cueout || audioBuffer.duration;
          const gain = info.gain || 1;
          const muted = info.muted || false;
          const soloed = info.soloed || false;
          const selection = info.selected;
          const peaks = info.peaks || { type: 'WebAudio', mono: this.mono };
          const customClass = info.customClass || undefined;
          const waveOutlineColor = info.waveOutlineColor || undefined;
          const stereoPan = info.stereoPan || 0;
          const effects = info.effects || null;

          // webaudio specific playout for now.
          const playout = new Playout(
            this.ac,
            audioBuffer,
            this.masterGainNode,
          );

          const track = new Track();
          track.src = info.src;
          track.setBuffer(audioBuffer);
          track.setId(new Date().getTime());
          track.setName(name);
          track.setEventEmitter(this.ee);
          track.setEnabledStates(states);
          track.setCues(cueIn, cueOut);
          track.setCustomClass(customClass);
          track.setWaveOutlineColor(waveOutlineColor);

          if (fadeIn !== undefined) {
            track.setFadeIn(fadeIn.duration, fadeIn.shape);
          }

          if (fadeOut !== undefined) {
            track.setFadeOut(fadeOut.duration, fadeOut.shape);
          }

          if (selection !== undefined) {
            this.setActiveTrack(track);
            this.setTimeSelection(selection.start, selection.end);
          }

          if (peaks !== undefined) {
            track.setPeakData(peaks);
          }

          track.setState(this.getState());
          track.setStartTime(start);
          track.setPlayout(playout);

          track.setGainLevel(gain);
          track.setStereoPanValue(stereoPan);
          if (effects) {
            track.setEffects(effects);
          }

          if (muted) {
            this.muteTrack(track);
          }

          if (soloed) {
            this.soloTrack(track);
          }

          // extract peaks with AudioContext for now.
          track.calculatePeaks(this.samplesPerPixel, this.sampleRate);

          return track;
        });

        this.tracks = this.tracks.concat(tracks);
        this.adjustDuration();
        this.draw(this.render());

        this.ee.emit('audiosourcesrendered');
      })
      .catch((e) => {
        this.ee.emit('audiosourceserror', e);
      });
  }

  /*
    track instance of Track.
  */
  setActiveTrack(track) {
    this.activeTrack = track;
  }

  getActiveTrack() {
    return this.activeTrack;
  }

  isSegmentSelection() {
    return this.timeSelection.start !== this.timeSelection.end;
  }

  /*
    start, end in seconds.
  */
  setTimeSelection(start = 0, end) {
    this.timeSelection = {
      start,
      end: end === undefined ? start : end,
    };

    this.cursor = start;
  }

  async startOfflineRender(type) {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.offlineAudioContext = new OfflineAudioContext(
      2,
      44100 * this.duration,
      44100,
    );

    const setUpChain = [];

    this.ee.emit(
      'audiorenderingstarting',
      this.offlineAudioContext,
      setUpChain,
    );

    const currentTime = this.offlineAudioContext.currentTime;
    const mg = this.offlineAudioContext.createGain();

    this.tracks.forEach((track) => {
      const playout = new Playout(this.offlineAudioContext, track.buffer, mg);
      playout.setEffects(track.effectsGraph);
      playout.setMasterEffects(this.effectsGraph);
      track.setOfflinePlayout(playout);

      track.schedulePlay(currentTime, 0, 0, {
        shouldPlay: this.shouldTrackPlay(track),
        masterGain: 1,
        isOffline: true,
      });
    });

    /*
      TODO cleanup of different audio playouts handling.
    */
    await Promise.all(setUpChain);
    const audioBuffer = await this.offlineAudioContext.startRendering();

    if (type === 'buffer') {
      this.ee.emit('audiorenderingfinished', type, audioBuffer);
      this.isRendering = false;
    } else if (type === 'wav') {
      this.exportWorker.postMessage({
        command: 'init',
        config: {
          sampleRate: 44100,
        },
      });

      // callback for `exportWAV`
      this.exportWorker.onmessage = (e) => {
        this.ee.emit('audiorenderingfinished', type, e.data);
        this.isRendering = false;

        // clear out the buffer for next renderings.
        this.exportWorker.postMessage({
          command: 'clear',
        });
      };

      // send the channel data from our buffer to the worker
      this.exportWorker.postMessage({
        command: 'record',
        buffer: [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)],
      });

      // ask the worker for a WAV
      this.exportWorker.postMessage({
        command: 'exportWAV',
        type: 'audio/wav',
      });
    }
  }

  getTimeSelection() {
    return this.timeSelection;
  }

  setState(state) {
    this.state = state;

    this.tracks.forEach((track) => {
      track.setState(state);
    });
  }

  getState() {
    return this.state;
  }

  setZoomIndex(index) {
    this.zoomIndex = index;
  }

  setZoomLevels(levels) {
    this.zoomLevels = levels;
  }

  setZoom(zoom) {
    this.samplesPerPixel = zoom;
    this.zoomIndex = this.zoomLevels.indexOf(zoom);
    this.tracks.forEach((track) => {
      track.calculatePeaks(zoom, this.sampleRate);
    });
  }

  muteTrack(track) {
    const index = this.mutedTracks.findIndex((item) => item._id === track._id);
    if (index > -1) {
      this.mutedTracks.splice(index, 1);
    } else {
      this.mutedTracks.push(track);
    }
  }

  soloTrack(track) {
    const index = this.soloedTracks.findIndex((item) => item._id === track._id);
    if (index > -1) {
      this.soloedTracks.splice(index, 1);
    } else if (this.exclSolo) {
      this.soloedTracks = [track];
    } else {
      this.soloedTracks.push(track);
    }
  }

  collapseTrack(track, opts) {
    if (opts.collapsed) {
      this.collapsedTracks.push(track);
    } else {
      const index = this.collapsedTracks.indexOf(track);

      if (index > -1) {
        this.collapsedTracks.splice(index, 1);
      }
    }
  }

  removeTrack(track) {
    if (track.isPlaying()) {
      track.scheduleStop();
    }

    const trackLists = [
      this.mutedTracks,
      this.soloedTracks,
      this.collapsedTracks,
      this.tracks,
    ];
    trackLists.forEach((list) => {
      const index = list.indexOf(track);
      if (index > -1) {
        list.splice(index, 1);
      }
    });
  }

  adjustTrackPlayout() {
    this.tracks.forEach((track) => {
      track.setShouldPlay(this.shouldTrackPlay(track));
    });
  }

  adjustDuration() {
    this.duration = this.tracks.reduce(
      (duration, track) => Math.max(duration, track.getEndTime()),
      0,
    );
  }

  shouldTrackPlay(track) {
    let shouldPlay;
    // if there are solo tracks, only they should play.
    if (this.soloedTracks.length > 0) {
      shouldPlay = false;
      if (this.soloedTracks.indexOf(track) > -1) {
        shouldPlay = true;
      }
    } else {
      // play all tracks except any muted tracks.
      shouldPlay = true;
      if (this.mutedTracks.indexOf(track) > -1) {
        shouldPlay = false;
      }
    }

    return shouldPlay;
  }

  isPlaying() {
    return this.tracks.reduce(
      (isPlaying, track) => isPlaying || track.isPlaying(),
      false,
    );
  }

  /*
   *   returns the current point of time in the playlist in seconds.
   */
  getCurrentTime() {
    const cursorPos = this.lastSeeked || this.pausedAt || this.cursor;

    return cursorPos + this.getElapsedTime();
  }

  getElapsedTime() {
    return this.ac.currentTime - this.lastPlay;
  }

  setMasterGain(gain) {
    this.ee.emit('mastervolumechange', gain);
  }

  restartPlayFrom(start, end) {
    this.stopAnimation();

    this.tracks.forEach((editor) => {
      editor.scheduleStop();
    });

    return Promise.all(this.playoutPromises).then(
      this.play.bind(this, start, end),
    );
  }

  play(startTime, endTime) {
    clearTimeout(this.resetDrawTimer);

    const currentTime = this.ac.currentTime;
    const selected = this.getTimeSelection();
    const playoutPromises = [];

    const start = startTime || this.pausedAt || this.cursor;
    let end = endTime;

    if (!end && selected.end !== selected.start && selected.end > start) {
      end = selected.end;
    }

    if (this.isPlaying()) {
      return this.restartPlayFrom(start, end);
    }

    // TODO refector this in upcoming modernisation.
    if (this.effectsGraph)
      this.tracks && this.tracks[0].playout.setMasterEffects(this.effectsGraph);

    this.tracks.forEach((track) => {
      track.setState('cursor');
      playoutPromises.push(
        track.schedulePlay(currentTime, start, end, {
          shouldPlay: this.shouldTrackPlay(track),
          masterGain: this.masterGain,
        }),
      );
    });

    this.lastPlay = currentTime;
    // use these to track when the playlist has fully stopped.
    this.playoutPromises = playoutPromises;
    this.startAnimation(start);

    return Promise.all(this.playoutPromises);
  }

  pause() {
    if (!this.isPlaying()) {
      return Promise.all(this.playoutPromises);
    }

    this.pausedAt = this.getCurrentTime();
    return this.playbackReset();
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.pausedAt = undefined;
    this.playbackSeconds = 0;
    return this.playbackReset();
  }

  playbackReset() {
    this.lastSeeked = undefined;
    this.stopAnimation();

    this.tracks.forEach((track) => {
      track.scheduleStop();
      track.setState(this.getState());
    });

    // TODO improve this.
    this.masterGainNode.disconnect();
    this.drawRequest();
    return Promise.all(this.playoutPromises);
  }

  rewind() {
    return this.stop().then(() => {
      this.scrollLeft = 0;
      this.ee.emit('select', 0, 0);
    });
  }

  fastForward() {
    return this.stop().then(() => {
      if (this.viewDuration < this.duration) {
        this.scrollLeft = this.duration - this.viewDuration;
      } else {
        this.scrollLeft = 0;
      }

      this.ee.emit('select', this.duration, this.duration);
    });
  }

  clear() {
    return this.stop().then(() => {
      this.tracks = [];
      this.soloedTracks = [];
      this.mutedTracks = [];
      this.playoutPromises = [];

      this.cursor = 0;
      this.playbackSeconds = 0;
      this.duration = 0;
      this.scrollLeft = 0;

      this.seek(0, 0, undefined);
    });
  }

  record() {
    const playoutPromises = [];
    this.mediaRecorder.start(300);

    this.tracks.forEach((track) => {
      track.setState('none');
      playoutPromises.push(
        track.schedulePlay(this.ac.currentTime, 0, undefined, {
          shouldPlay: this.shouldTrackPlay(track),
        }),
      );
    });

    this.playoutPromises = playoutPromises;
  }

  startAnimation(startTime) {
    this.lastDraw = this.ac.currentTime;
    this.animationRequest = window.requestAnimationFrame(() => {
      this.updateEditor(startTime);
    });
  }

  stopAnimation() {
    window.cancelAnimationFrame(this.animationRequest);
    this.lastDraw = undefined;
  }

  seek(start, end, track) {
    if (this.isPlaying()) {
      this.lastSeeked = start;
      this.pausedAt = undefined;
      this.restartPlayFrom(start);
    } else {
      // reset if it was paused.
      this.setActiveTrack(track || this.tracks[0]);
      this.pausedAt = start;
      this.setTimeSelection(start, end);
      if (this.getSeekStyle() === 'fill') {
        this.playbackSeconds = start;
      }
    }
  }

  /*
   * Animation function for the playlist.
   * Keep under 16.7 milliseconds based on a typical screen refresh rate of 60fps.
   */
  updateEditor(cursor) {
    const currentTime = this.ac.currentTime;
    const selection = this.getTimeSelection();
    const cursorPos = cursor || this.cursor;
    const elapsed = currentTime - this.lastDraw;

    if (this.isPlaying()) {
      const playbackSeconds = cursorPos + elapsed;
      this.ee.emit('timeupdate', playbackSeconds);
      this.animationRequest = window.requestAnimationFrame(() => {
        this.updateEditor(playbackSeconds);
      });

      this.playbackSeconds = playbackSeconds;
      this.draw(this.render());
      this.lastDraw = currentTime;
    } else {
      if (
        cursorPos + elapsed >=
        (this.isSegmentSelection() ? selection.end : this.duration)
      ) {
        this.ee.emit('finished');
      }

      this.stopAnimation();

      this.resetDrawTimer = setTimeout(() => {
        this.pausedAt = undefined;
        this.lastSeeked = undefined;
        this.setState(this.getState());

        this.playbackSeconds = 0;
        this.draw(this.render());
      }, 0);
    }
  }

  drawRequest() {
    window.requestAnimationFrame(() => {
      this.draw(this.render());
    });
  }

  draw(newTree) {
    const patches = diff(this.tree, newTree);
    this.rootNode = patch(this.rootNode, patches);
    this.tree = newTree;

    // use for fast forwarding.
    this.viewDuration = pixelsToSeconds(
      this.rootNode.clientWidth - this.controls.width,
      this.samplesPerPixel,
      this.sampleRate,
    );
  }

  getTrackRenderData(data = {}) {
    const defaults = {
      height: this.waveHeight,
      resolution: this.samplesPerPixel,
      sampleRate: this.sampleRate,
      controls: this.controls,
      isActive: false,
      timeSelection: this.getTimeSelection(),
      playlistLength: this.duration,
      playbackSeconds: this.playbackSeconds,
      colors: this.colors,
      barWidth: this.barWidth,
      barGap: this.barGap,
    };

    return _defaults({}, data, defaults);
  }

  isActiveTrack(track) {
    const activeTrack = this.getActiveTrack();

    if (this.isSegmentSelection()) {
      return activeTrack === track;
    }

    return true;
  }

  renderAnnotations() {
    return this.annotationList.render();
  }

  renderTimeScale() {
    const controlWidth = this.controls.show ? this.controls.width : 0;
    const timeScale = new TimeScale(
      this.duration,
      this.scrollLeft,
      this.samplesPerPixel,
      this.sampleRate,
      controlWidth,
      this.colors,
    );

    return timeScale.render();
  }

  renderTrackSection() {
    const trackElements = this.tracks.map((track) => {
      const collapsed = this.collapsedTracks.indexOf(track) > -1;
      return track.render(
        this.getTrackRenderData({
          isActive: this.isActiveTrack(track),
          shouldPlay: this.shouldTrackPlay(track),
          soloed: this.soloedTracks.indexOf(track) > -1,
          muted: this.mutedTracks.indexOf(track) > -1,
          collapsed,
          height: collapsed ? this.collapsedWaveHeight : this.waveHeight,
          barGap: this.barGap,
          barWidth: this.barWidth,
        }),
      );
    });

    return h(
      'div.playlist-tracks',
      {
        attributes: {
          style: 'overflow: auto;',
        },
        onscroll: (e) => {
          this.scrollLeft = pixelsToSeconds(
            e.target.scrollLeft,
            this.samplesPerPixel,
            this.sampleRate,
          );

          this.ee.emit('scroll');
        },
        hook: new ScrollHook(this),
      },
      trackElements,
    );
  }

  render() {
    const containerChildren = [];

    if (this.showTimescale) {
      containerChildren.push(this.renderTimeScale());
    }

    containerChildren.push(this.renderTrackSection());

    if (this.annotationList.length) {
      containerChildren.push(this.renderAnnotations());
    }

    return h(
      'div.playlist',
      {
        attributes: {
          style: 'overflow: hidden; position: relative;',
        },
      },
      containerChildren,
    );
  }

  getInfo() {
    const tracks = [];

    this.tracks.forEach((track) => {
      tracks.push(track.getTrackDetails());
    });

    return {
      tracks,
      effects: this.effectsGraph,
    };
  }
}
