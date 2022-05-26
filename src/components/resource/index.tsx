import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import Collapse from '../collapse';
import Tag from '../tag';
import styles from './index.less';
import {
  createAsset,
  fetchAssetByTag,
  fetchPresigned,
  fetchTagList,
  fetchUploadList,
  uploadAudio,
} from '@/services/api';
import { cloneDeep } from 'lodash';
import { Spin } from 'antd';
import { useSelector } from 'umi';
import { UserInfo } from '@/models/global';

type Tab = 'cloud' | 'local';

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (file: any) => void;
}

function formatTime(time: string) {
  const date = new Date(time);
  return `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(
    date.getDate(),
  )} ${date.getHours()}:${addZero(date.getMinutes())}`;
}

function addZero(number: number) {
  if (number < 10) {
    return `0${number}`;
  }
  return number;
}

export default function Resource(props: Props) {
  const [tab, setTab] = useState<Tab>('local');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tagList1, setTagList1] = useState<any[]>([]);
  const [searchResultList, setSearchResultList] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [assetData, setAssetData] = useState<any>({});
  const [activeTags, setActiveTags] = useState<any[]>([]);

  // @ts-ignore
  const userInfo: UserInfo = useSelector((state) => state.global.userInfo);

  useEffect(() => {
    if (userInfo && tab === 'local') {
      fetchUploadList(userInfo.id).then((res) => {
        if (res.code === 0) {
          setHistoryList(res.data.result);
        }
      });
    }
  }, [tab, userInfo]);

  useEffect(() => {
    fetchTagList().then((result) => {
      if (result.code === 0) {
        const data = result.data.result;
        const filterData = data.filter(
          (item: any) => item?.parent === undefined,
        );
        const addActiveData = filterData.map((item: any) => {
          item.children = item.children.map((i: any) => {
            i.active = false;
            return i;
          });
          return item;
        });
        setTagList1(addActiveData);
      }
    });
  }, []);

  useEffect(() => {
    let resultList: any[] = [];
    activeTags.forEach((item: string) => {
      resultList = resultList.concat(assetData[item]);
    });
    setSearchResultList(resultList);
  }, [activeTags]);

  const onCloseBtnClicked = useCallback(() => {
    props.onClose();
  }, [props.onClose]);

  if (!props.show) {
    return null;
  }

  const onTagClicked = async (index: number, i: number) => {
    const list = cloneDeep(tagList1);
    const tags = cloneDeep(activeTags);
    list[index].children[i].active = !list[index].children[i].active;
    setTagList1([...list]);
    const tagId = list[index].children[i]._id;
    if (list[index].children[i].active) {
      tags.push(tagId);
      const res: any = await fetchAssetByTag(tagId);
      if (res.code === 0) {
        assetData[tagId] = res.data.result;
      }
      setActiveTags([...tags]);
    } else {
      const findIndex = tags.findIndex((item: string) => item === tagId);
      tags.splice(findIndex, 1);
      setActiveTags([...tags]);
    }
  };

  const onItemClicked = (item: any) => {
    props.onSelect({
      src: item.url,
      name: item.name,
      assetId: item._id,
    });
  };

  const onHistoryItemClicked = (item: any) => {
    props.onSelect({
      src: item.url,
      name: item.name || 'test.mp3',
      assetId: item._id,
    });
  };

  const renderCloud = () => {
    return (
      <div className={styles.cloudWrap}>
        {/*<div className={styles.searchWrap}>*/}
        {/*  <input type="text" placeholder="Search" />*/}
        {/*  <img src={require('@/assets/workshop/search.png')} alt="search" />*/}
        {/*</div>*/}
        {tagList1.map((item: any, index: number) => (
          <Collapse label={item.name} collapse={index === 0} key={item._id}>
            <div>
              {item.children.map((tag: any, i: number) => (
                <Tag
                  text={tag.name}
                  active={tag.active}
                  onClick={() => onTagClicked(index, i)}
                  key={tag._id}
                />
              ))}
            </div>
          </Collapse>
        ))}
        <div className={styles.resultWrap}>
          <div className={styles.title}>Result</div>
          <ul className={styles.resultList}>
            {searchResultList.map((item: any) => (
              <li key={item.name} onClick={() => onItemClicked(item)}>
                <div>{item.name}</div>
                <div>{item.time}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const onUploadBtnClicked = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: any) => {
    setLoading(true);
    const file = e.target.files[0];
    const fileName = file.name;
    const fileNameSplitByDot = fileName.split('.');
    const fileSuffix = fileNameSplitByDot[fileNameSplitByDot.length - 1];
    const preSignData = await fetchPresigned(fileSuffix);
    const uploadLink = preSignData.data.link;
    const token = preSignData.data.token;
    const formdata = new FormData();
    formdata.append('', file, token);
    await uploadAudio(uploadLink, formdata);
    const res = await createAsset(token, userInfo.id, fileName);
    if (res.code === 0) {
      const data = res.data.result;
      props.onSelect({
        src: data.url,
        name: fileName,
        assetId: data._id,
      });
    }
    setLoading(false);
    fetchUploadList(userInfo.id).then((res) => {
      if (res.code === 0) {
        setHistoryList(res.data.result);
      }
    });
  };

  const renderLocal = () => {
    return (
      <div>
        <div className={styles.uploadWrap} onClick={onUploadBtnClicked}>
          {loading ? (
            <Spin size="large" />
          ) : (
            <>
              <div>
                <PlusOutlined />
              </div>
            </>
          )}
          Local File
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className={styles.uploadBtn}
          onChange={onFileChange}
          accept=".mp3,.wav"
        />
        <div className={styles.historyWrap}>
          <div className={styles.historyTitle}>History Upload</div>
          <ul>
            {historyList.map((item: any) => (
              <div
                className={styles.historyItem}
                onClick={() => onHistoryItemClicked(item)}
                key={item.url}
              >
                <div>{item.name || 'test.mp3'}</div>
                <div>{formatTime(item.updatedAt)}</div>
              </div>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => setTab('cloud')}
          className={tab === 'cloud' ? styles.active : ''}
        >
          Loop Cloud
        </button>
        <button
          onClick={() => setTab('local')}
          className={tab === 'local' ? styles.active : ''}
        >
          My Loop
        </button>
        <button onClick={onCloseBtnClicked} className={styles.onCloseBtn}>
          <CloseOutlined />
        </button>
      </div>
      <div>{tab === 'local' ? renderLocal() : renderCloud()}</div>
    </div>
  );
}
