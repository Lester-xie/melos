import styles from './index.less';
import Chat from '@/components/chat'

export default function IndexPage() {
  return (
    <div className={styles.container}>
      <header>
        <ul className={styles.menu}>
          <li>My Band</li>
          <li>Band's Music</li>
          <li>New</li>
        </ul>
        <ul className={styles.operation}>
          <li><img src={require('@/assets/workshop/pointer.png')} alt=""/></li>
          <li><img src={require('@/assets/workshop/cut.png')} alt=""/></li>
          <li><img src={require('@/assets/workshop/paste.png')} alt=""/></li>
          <li><img src={require('@/assets/workshop/pull.png')} alt=""/></li>
        </ul>
        <div className={styles.mintWrap}>
          <button className={styles.mint}>Mint NFT</button>
        </div>
      </header>
      <div className={styles.projectName}>Project Name</div>
      <main>
        <Chat />
      </main>
    </div>
  );
}
