import styles from './index.less';
import Chat from '@/components/chat';
import Workspace from '@/components/workspace';

export default function IndexPage() {
  return (
    <div className={styles.container}>
      <header>
        <ul className={styles.menu}>
          <li>My Band</li>
          <li>Band's Music</li>
          <li>New</li>
        </ul>
        <div className={styles.mintWrap}>
          <button className={styles.mint}>Mint NFT</button>
        </div>
      </header>
      <div className={styles.projectName}>Project Name</div>
      <main>
        <Chat />
        <Workspace />
      </main>
    </div>
  );
}
