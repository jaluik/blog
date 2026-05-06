import React from 'react'
import Layout from '@theme/Layout'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import styles from './styles.module.css'

function Home() {
  const context = useDocusaurusContext()
  const { siteConfig } = context
  return (
    <Layout
      title={`${siteConfig.title}`}
      description='jaluik的个人博客，包含前端、后端、运维相关的内容。'>
      <main className={styles.wrap}>
        <div className={styles.main}>
          <div className={styles.pannel}>
            <a
              className={styles.btn}
              href='https://x.com/jaluik_'
              target='_blank'
              rel='noreferrer'
              aria-label='在 X 上关注 Jaluik'>
              I AM JALUIK
            </a>
            <h2 className={styles.content}>think more</h2>
            <h2 className={styles.content}>do better</h2>
          </div>
          <img src='img/zoro.png' className={styles.bg} />
        </div>
      </main>
    </Layout>
  )
}

export default Home
